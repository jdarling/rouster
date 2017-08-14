'use strict';

const Docker = require('./docker').Docker;
const async = require('async');

const commandInfo = {
  'image': {
    args: ['imageName'],
    alts: ['i'],
    description: 'Docker image to run',
    default: 'node:latest'
  },
  'docker': {
    args: ['dockerExecutable'],
    alts: ['d'],
    description: 'Docker executable to use',
    default: 'docker'
  },
  'shell': {
    args: ['command'],
    alts: ['s'],
    description: 'Shell command to use',
    default: '/bin/bash'
  },
  'execute': {
    args: ['command'],
    alts: ['e'],
    description: 'Adds a command to be executed on the container once its running'
  },
  'workingdir': {
    args: ['directory'],
    alts: ['w'],
    description: 'Sets the working directory'
  },
  'volume': {
    args: ['directory'],
    alts: ['v'],
    description: 'Mount a directory as a volume to the container'
  },
  'no-rm': {
    alts: ['r'],
    description: 'Don\'t remove container image when complete, by default rouster removes the container when complete'
  },
  'no-kill': {
    alts: ['k'],
    description: 'Don\'t kill or remove container image when complete, by default rouster kills and removes the container when complete'
  },
  'container-id': {
    args: ['containerId'],
    alts: ['c'],
    description: 'Wrap currently running container'
  },
  'output-status': {
    alts: ['u'],
    description: 'After everything is complete output the container id and status'
  },
  'publish': {
    args: ['hostPort:containerPort'],
    alts: ['p'],
    description: 'Publish the private containerPort to the host system through hostPort'
  },
  'help': {
    alts: ['?', 'h'],
    description: 'Show the help screen'
  },
  'version': {
    description: 'Output the current version of Rouster'
  },
};

const argsShortList = Object.keys(commandInfo).reduce((existing, key)=>{
  const cmdSet = commandInfo[key];
  const shorts = (cmdSet.alts||[]).reduce((set, short)=>{
    return Object.assign({}, set, {[short]: key})
  }, {});
  return Object.assign({}, existing, shorts);
}, {});

const parseArgs = require('./cmdargs').parseArgs(argsShortList);

const reformCommand = (cmd)=>{
  var res = cmd.match(/"[^"]*"|'[^']*'|[^ \t]+/g);
  return res.map((cmdStr)=>{
    if(cmdStr[0]==='\'' && cmdStr[cmdStr.length-1]==='\''){
      return cmdStr.substr(1, cmdStr.length-2);
    }
    if(cmdStr[0]==='"' && cmdStr[cmdStr.length-1]==='"'){
      return cmdStr.substr(1, cmdStr.length-2);
    }
    return cmdStr;
  });
}

class Commands{
  constructor(opts){
    const options = parseArgs(opts||{});
    if(options.help){
      this.showHelp();
    }
    if(options.version){
      console.log(require('../package.json').version);
      process.exit(0);
    }
    this.args = {
      image: options.image||'node:latest',
      dockerCommand: options.docker||'docker',
      shell: options.shell||'/bin/bash',
      verbose: (!!options.verbose)||(!!options.loud),
      workingdir: options.workingdir,
      volume: options.volume,
      rm: !options['no-rm'],
      kill: !options['no-kill'],
      containerId: options['container-id'],
      outputStatus: options['output-status'],
      publish: options.publish,
      execute: options.execute
    };
    this.docker = new Docker(this.args);
  }

  showHelp(){
    const pjson = require('../package.json');
    const keys = Object.keys(commandInfo).sort();
    console.log(`Rouster - v${pjson.version}`);
    console.log('  rouster <options>');
    console.log('  options');
    keys.forEach((cmd)=>{
      const cmdInfo = commandInfo[cmd];
      /*
      args: ['dockerExecutable'],
      alts: ['d'],
      description: 'Docker executable to use',
      default: 'docker'
      */
      const {
        args = [],
        alts = [],
        description = 'Uhh, you forgot to document this!',
        default: defaultValue = false
      } = cmdInfo;
      const argsStr = args.length?` <${args.join('>, <')}>`:'';
      const cmdWOpts = alts.map(a=>`-${a}`).concat(`--${cmd}`).join(`${argsStr}, `)+argsStr;
      const defaultText = defaultValue?`, default "${defaultValue}"`:'';
      console.log(`    ${cmdWOpts} - ${description}${defaultText}.`);
    });
    return process.exit(0);
  }

  get dockerVersion(){
    return this.docker.dockerVersion;
  }

  get dockerBuild(){
    return this.docker.dockerBuild;
  }

  get containerId(){
    return this.docker.containerId;
  }

  startup(callback){
    let args = [this.args.shell];
    if(this.args.volume){
      const volumes = Array.isArray(this.args.volume)?this.args.volume:[this.args.volume];
      volumes.forEach((volume)=>{
        args.push('-v');
        args.push(volume.replace(/^\.\//, process.cwd()+'/'));
      });
    }
    if(this.args.publish){
      const ports = Array.isArray(this.args.publish)?this.args.publish:[this.args.publish];
      ports.forEach((portmap)=>{
        args.push('-p');
        args.push(portmap);
      });
    }
    if(this.args.workingdir){
      args.push('-w');
      args.push(this.args.workingdir);
    }
    if(callback){
      args.push(callback);
    }
    this.docker.run.apply(this.docker, args);
  }

  shutdown(callback){
    if(this.args.kill){
      console.log('Killing instance');
      return this.docker.kill((err, output)=>{
        if(err){
          console.error('Kill Error: ', err);
        }
        if(this.args.rm){
          console.log('Removing instance');
          return this.docker.rm(callback);
        }
        return callback(err, output);
      });
    }
    return callback(null);
  }

  execute(callback){
    const stderr = (err)=>console.error(err);
    const stdout = (str)=>console.log(str);
    if(this.args.verbose){
      this.docker.on('docker_info', (info)=>console.log('docker_info:', info));
      this.docker.on('error', (err)=>console.error('error:', err));
      this.docker.on('exec_done', (result)=>console.error('exec_done', result));
      this.docker.on('killed', (result)=>console.error('killed:', result));
      this.docker.on('running', (result)=>console.error('running:', result));
      this.docker.on('spawn', (result)=>console.error('spawn:', result));
    }
    this.startup((err, startup)=>{
      this.docker.on('stderr', stderr);
      this.docker.on('stdout', stdout);
      let results = [];
      const commands = ((cmd)=>{
        if(!cmd){
          return [];
        }
        //const reformCommand = (cmd)=>cmd.match(/"[^"]*"|'[^']*'|[^ \t]+/g);
        return (Array.isArray(cmd)?cmd:[cmd]).map(reformCommand);
      })(this.args.execute);
      async.eachSeries(commands, (command, next)=>{
        console.log('Exec: ', command);
        this.docker.exec(command, (err, output)=>{
          if(err){
            console.error(`Exec ERROR (${err.code}): `, command)
            results.push({command, error: err, code: err.code});
            return next();
          }
          console.log(`Exec SUCCESS (${output.code}): `, command)
          results.push({command, output, code: output.code});
          return next();
        });
      }, (err)=>{
        this.docker.off('stderr', stderr);
        this.docker.off('stdout', stdout);
        this.shutdown((err, results)=>{
          if(err){
            if(callback){
              return callback(err);
            }
            throw new Error(err);
          }
          if(this.args.outputStatus){
            this.docker.status((err, status)=>{
              console.log(`Status (${this.docker.lastContainerId}):`, status);
            });
          }
        });
      });
    });
  };
};

module.exports = {
  Commands,
};

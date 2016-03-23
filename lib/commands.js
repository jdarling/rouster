'use strict';

const Docker = require('./docker').Docker;
const async = require('async');

const parseArgs = require('./cmdargs').parseArgs({
  i: 'image',
  d: 'docker',
  s: 'shell',
  e: 'execute',
  w: 'workingdir',
  v: 'volume',
  l: 'loud',
  r: 'no-rm',
  k: 'no-kill',
  c: 'container-id',
  u: 'output-status',
  p: 'publish',
  '?': 'help',
  'h': 'help'
});

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
    console.log(`Rouster - v${pjson.version}`);
    console.log('  rouster <options>');
    console.log('  options');
    console.log('    -i <imageName>, --image <imageName> - Docker image to run, defaults to "node:latest"');
    console.log('    -d <dockerExecutable>, --docker <dockerExecutable> - Docker executable to use, defaults to "docker"');
    console.log('    -s, --shell - Shell command to use, defaults to "/bin/bash"');
    console.log('    -e <command>, --execute <command> - Adds a command to be executed on the container once its running');
    console.log('    -l, --loud, --verbose - Output everything');
    console.log('    -w, --working directory - Sets the working directory');
    console.log('    -v, --volume - Mount a volume to the container')
    console.log('    -r, --no-rm - Don\'t remove container image when complete, by default rouster removes the container when complete')
    console.log('    -r, --no-kill - Don\'t kill or remove container image when complete, by default rouster kills and removes the container when complete')
    console.log('    -c, --container-id - Wrap currently running container')
    console.log('    -u, --output-status - After everything is complete output the container id and status')
    console.log('    -p, --publish <hostPort:containerPort> - Publish the private containerPort to the host system through hostPort')
    console.log('    -?, -h, --help - Shows this screen');
    console.log('    --version - Output the current version');
    process.exit(0);
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

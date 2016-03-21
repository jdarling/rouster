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
  r: 'rm',
  '?': 'help',
  'h': 'help'
});

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
    console.log('    -r, --rm - Remove container image when complete')
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
    this.docker.kill((err, output)=>{
      if(err){
        return callback(err);
      }
      if(this.args.rm){
        return this.docker.rm(callback);
      }
      return callback(null, output);
    });
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
        const reformCommand = (cmd)=>cmd.match(/"[^"]+"|'[^']+'|[^ \t]+/g);
        return (Array.isArray(cmd)?cmd:[cmd]).map(reformCommand);
      })(this.args.execute);
      async.eachSeries(commands, (command, next)=>{
        console.log('Exec: ', command);
        this.docker.exec(command, (err, output)=>{
          if(err){
            results.push({command, error: err});
            return next();
          }
          results.push({command, output});
          return next();
        });
      }, (err)=>{
        this.docker.off('stderr', stderr);
        this.docker.off('stdout', stdout);
        this.shutdown(()=>{
          if(err){
            if(callback){
              return callback(err);
            }
            throw new Error(err);
          }
        });
      });
    });
  };
};

module.exports = {
  Commands,
};

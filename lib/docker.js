'use strict';

const spawn = require('child_process').spawn;

const staticSpawn=(command, args, callback)=>{
  let stdout = [];
  let stderr = [];
  let all = [];
  const process = spawn(command, Array.prototype.concat.apply([], args));

  process.stderr.on('data', (data)=>{
    const str = data.toString();
    all.push(str);
    stderr.push(str);
  });
  process.stdout.on('data', (data)=>{
    const str = data.toString();
    all.push(str);
    stdout.push(str);
  });
  process.on('error', (err)=>{
    all.push(err.toString());
    stderr.push(err);
  });

  process.on('close', (code)=>{
    if(code!==0){
      return callback({code, stdout, stderr, all});
    }
    return callback(null, {code, stdout, stderr, all});
  });

  return process;
};

class Docker{
  constructor(opts){
    const options = opts || {};
    this._eventHandlers = {};
    this.image = options.image || 'node:latest';
    this.dockerCommand = options.dockerCommand || 'docker';
    this._dockerVersion = 'unknown';
    this._dockerBuild = 'unknown';
    this._containerId = '';
    this.throwErrors = typeof(options.throwErrors)==='boolean'?options.throwErrors:true;
  }

  get dockerVersion(){
    return this._dockerVersion;
  }
  get dockerBuild(){
    return this._dockerBuild;
  }
  get containerId(){
    return this._containerId;
  }

  thowIfEnabled(err){
    if(this.throwErrors){
      throw err;
    }
  }

  spawn(command, args, callback){
    let stdout = [];
    let stderr = [];
    let all = [];
    const process = spawn(command, Array.prototype.concat.apply([], args));
    this.emit('spawn', {command, args})

    process.stderr.on('data', (data)=>{
      const str = data.toString();
      this.emit('stderr', str);
      all.push(str);
      stderr.push(str);
    });
    process.stdout.on('data', (data)=>{
      const str = data.toString();
      this.emit('stdout', str);
      all.push(str);
      stdout.push(str);
    });
    process.on('error', (err)=>{
      this.emit('error', err);
      all.push(err.toString());
      stderr.push(err);
    });

    process.on('close', (code)=>{
      if(code!==0){
        return callback({code, stdout, stderr, all});
      }
      return callback(null, {code, stdout, stderr, all});
    });

    return process;
  }

  static ps(...args){
    const callback = typeof(args[args.length?args.length-1:0])==='function'?args.pop():false;
    const options = (typeof(args[0])==='object')?args.shift():{dockerCommand: 'docker'};

    staticSpawn(options.dockerCommand, ['ps'].concat(args), (err, output)=>{
      if(err){
        this.emit('error', err);
        if(callback){
          return callback(err);
        }
        return this.thowIfEnabled(new Error(err.stderr.join('')));
      }
      return callback(null, output);
    });
  }

  static containers(callback){
    Docker.ps('-q', (err, response)=>{
      if(err){
        return callback(err);
      }
      const containers = response.stdout.join('').split('\n');
      return callback(null, containers);
    });
  }

  getDockerInfo(callback){
    const setDockerVersion = (output)=>{
      var match = /Docker version ([^ ]+), build (.+)/.exec(output);
      this._dockerVersion = match[1];
      this._dockerBuild = match[2];
    };
    this.spawn(this.dockerCommand, ['--version'], (err, output)=>{
      if(err){
        this.emit('error', err);
        if(callback){
          return callback(err);
        }
        return this.thowIfEnabled(new Error(err.stderr.join('')));
      }
      setDockerVersion(output.stdout[0]);
      this.emit('docker_info', {
        version: this._dockerVersion,
        build: this._dockerBuild
      })
      if(callback){
        return callback(null, output);
      }
    });
  }

  run(...runArgs){
    const callback = typeof(runArgs[runArgs.length?runArgs.length-1:0])==='function'?runArgs.pop():false;
    if(this.containerId){
      return callback(null, {containerId: this.containerId});
    }
    const setPid = (pid)=>{
      this._containerId = pid;
    };
    const {
      image,
    } = this;
    const command = runArgs.shift();
    const args = ['run', '-d'].concat(runArgs).concat('-it', image, command);
    this.spawn(this.dockerCommand, args, (err, output)=>{
      if(err){
        this.emit('error', err);
        if(callback){
          return callback(err);
        }
        return this.thowIfEnabled(new Error(err.stderr.join('')));
      }

      setPid(output.stdout.join('').trim().replace(/[^a-z0-9]/ig, ''));
      this.emit('running', output);
      if(callback){
        return callback(null, output);
      }
    });
  }

  kill(callback){
    if(!this.containerId){
      return callback(null);
    }
    const clearPid = (pid)=>{
      this._containerId = '';
    };
    this.spawn(this.dockerCommand, ['kill', this.containerId], (err, output)=>{
      if(err){
        this.emit('error', err);
        if(callback){
          return callback(err);
        }
        return this.thowIfEnabled(new Error(err.stderr.join('')));
      }
      clearPid();
      this.emit('killed', output);
      if(callback){
        return callback(null, output);
      }
    });
  }

  emit(eventName, ...args){
    const handlers = this._eventHandlers[eventName] || [];
    handlers.forEach((handler)=>handler.apply(this, args));
  }

  on(eventName, callback){
    if(!this._eventHandlers[eventName]){
      this._eventHandlers[eventName] = [];
    }
    this._eventHandlers[eventName].push(callback);
  }

  off(eventName, callback){
    if(!this._eventHandlers[eventName]){
      return;
    }
    this._eventHandlers[eventName] = this._eventHandlers[eventName].filter((cb)=>callback!==cb);
  }

  exec(...args){
    const callback = typeof(args[args.length?args.length-1:0])==='function'?args.pop():false;
    if(!this.containerId){
      const err = new Error('Not connected');
      this.emit('error', err);
      if(callback){
        return callback(err);
      }
      return this.thowIfEnabled(err);
    }
    const command = args.shift();

    this.spawn(this.dockerCommand, ['exec', this.containerId, command].concat(args), (err, output)=>{
      if(err){
        this.emit('error', err);
        if(callback){
          return callback(err);
        }
        return this.thowIfEnabled(new Error(err.stderr.join('')));
      }
      this.emit('exec_done', output);
      if(callback){
        return callback(null, output);
      }
    });
  }
};

module.exports = {
  Docker,
};

'use strict';

import Code from 'code';
const expect = Code.expect;

const Lab = require('lab');
const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const before = lab.before;
const after = lab.after;
const spawn = ((spawn)=>{
  return (command, args, callback)=>{
    let stdout = [];
    let stderr = [];
    const process = spawn(command, args);
    process.stderr.on('data', (data)=>{
      const str = data.toString();
      stderr.push(str)
    });
    process.stdout.on('data', (data)=>{
      const str = data.toString();
      stdout.push(str);
    });
    process.on('error', (err)=>{
      return callback(err);
    });

    process.on('close', (code)=>{
      if(code!==0){
        return callback({code, stdout, stderr});
      }
      return callback(null, {code, stdout, stderr});
    });

    return process;
  };
})(require('child_process').spawn);

const Docker = require('../lib/docker').Docker;

describe('Docker', ()=>{
  it('Should be able to detect docker version and build', (done)=>{
    const docker = new Docker();
    docker.getDockerInfo((err, output)=>{
      expect(err).to.be.null();
      expect(output).to.be.an.object();
      expect(docker.dockerVersion).to.be.a.string().and.to.match(/^\d+\.\d+\.\d+$/);
      expect(docker.dockerBuild).to.be.a.string().and.to.match(/^[a-z0-9]+$/i);
      done();
    });
  });

  it('Should be able to spin up a basic docker container', (done)=>{
    const docker = new Docker();
    expect(docker.containerId).to.be.a.string().and.to.equal('');
    docker.run('/bin/bash', (err, output)=>{
      expect(err).to.be.null();
      expect(output).to.be.an.object();
      expect(docker.containerId).to.be.a.string().and.to.match(/^[a-z0-9]+$/i);
      docker.kill(()=>{
        expect(docker.containerId).to.be.a.string().and.to.equal('');
        done();
      });
    });
  });

  it('Should be able mount a path and execute ls against it', (done)=>{
    const docker = new Docker();
    expect(docker.containerId).to.be.a.string().and.to.equal('');
    docker.run('/bin/bash', '-v', __dirname+':/app/test', '-w', '/app', (err, output)=>{
      expect(err).to.be.null();
      expect(output).to.be.an.object();
      expect(docker.containerId).to.be.a.string().and.to.match(/^[a-z0-9]+$/i);
      spawn('ls', [__dirname], (err, lsOutput)=>{
        expect(err).to.be.null();
        expect(lsOutput.stdout).to.be.an.array();
        docker.exec('ls', './test', (err, output)=>{
          expect(err).to.be.null();
          expect(output.stdout).to.be.an.array().and.to.have.a.length(lsOutput.stdout.length).and.to.only.contain(lsOutput.stdout);
          docker.kill(()=>{
            expect(docker.containerId).to.be.a.string().and.to.equal('');
            done();
          });
        });
      });
    });
  });

  it('Should return any error text from the container in err.stderr', (done)=>{
    const docker = new Docker();
    expect(docker.containerId).to.be.a.string().and.to.equal('');
    docker.run('/bin/bash', '-v', __dirname+':/app/test', '-w', '/app', (err, output)=>{
      expect(err).to.be.null();
      expect(output).to.be.an.object();
      expect(docker.containerId).to.be.a.string().and.to.match(/^[a-z0-9]+$/i);
      docker.exec('unknowncommand', (err)=>{
        expect(err.stderr).to.be.an.array();
        expect(err.stderr[0]).to.be.a.string();
        docker.kill(()=>{
          expect(docker.containerId).to.be.a.string().and.to.equal('');
          done();
        });
      });
    });
  });
});

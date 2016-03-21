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
        docker.rm(()=>{
          expect(docker.containerId).to.be.a.string().and.to.equal('');
          done();
        });
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
            docker.rm(()=>{
              expect(docker.containerId).to.be.a.string().and.to.equal('');
              done();
            });
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
          docker.rm(()=>{
            expect(docker.containerId).to.be.a.string().and.to.equal('');
            done();
          });
        });
      });
    });
  });

  it('Should be able to list running containers', (done)=>{
    const docker = new Docker();
    docker.run('/bin/bash', '-v', __dirname+':/app/test', '-w', '/app', (err, output)=>{
      Docker.containers((err, containers)=>{
        expect(err).to.be.null();
        expect(containers).to.be.an.array().and.to.contain(docker.containerId.substr(0, containers[0].length));
        docker.kill(()=>{
          docker.rm(()=>{
            expect(docker.containerId).to.be.a.string().and.to.equal('');
            done();
          });
        });
      });
    });
  });

  it('Should be able to kill and remove running containers', (done)=>{
    const docker = new Docker();
    docker.run('/bin/bash', '-v', __dirname+':/app/test', '-w', '/app', (err, output)=>{
      const containerId = docker.containerId;
      Docker.containers((err, containers)=>{
        expect(err).to.be.null();
        const containerIdLength = containers[0].length;
        expect(containers).to.be.an.array().and.to.contain(containerId.substr(0, containerIdLength));
        docker.kill((err)=>{
          expect(err).to.be.null();
          expect(docker.containerId).to.be.a.string().and.to.equal('');
          docker.rm((err)=>{
            expect(err).to.be.null();
            Docker.containers('-a', (err, containers)=>{
              expect(err).to.be.null();
              expect(containers).to.be.an.array().and.to.not.contain(containerId.substr(0, containerIdLength));
              done();
            });
          });
        });
      });
    });
  });

  it('Should be able to stop and remove running containers', (done)=>{
    const docker = new Docker();
    docker.run('/bin/bash', '-v', __dirname+':/app/test', '-w', '/app', (err, output)=>{
      const containerId = docker.containerId;
      Docker.containers((err, containers)=>{
        expect(err).to.be.null();
        const containerIdLength = containers[0].length;
        expect(containers).to.be.an.array().and.to.contain(containerId.substr(0, containerIdLength));
        docker.stop(()=>{
          expect(err).to.be.null();
          expect(docker.containerId).to.be.a.string().and.to.equal('');
          docker.rm((err)=>{
            expect(err).to.be.null();
            Docker.containers('-a', (err, containers)=>{
              expect(err).to.be.null();
              expect(containers).to.be.an.array().and.to.not.contain(containerId.substr(0, containerIdLength));
              done();
            });
          });
        });
      });
    });
  });

  it('Should be able to pull a docker image', (done)=>{
    const docker = new Docker();
    docker.execDockerCommand('rmi', 'node:latest', (err, output)=>{
      expect(err).to.be.null();
      docker.pull((err, output)=>{
        expect(err).to.be.null();
        expect(output.stdout).to.be.an.array();
        expect(output.stdout[output.stdout.length-1]).to.be.a.string().and.to.contain('Downloaded newer image for node:latest');
        expect();
        done();
      });
    });
  });

  it('Should be able to pull and test something that isn\'t node.js', {timeout: 300000}, (done)=>{
    const docker = new Docker({image: 'tlovett1/php-5.2-phpunit-3.5'});
    docker.exec('rmi', 'tlovett1/php-5.2-phpunit-3.5', ()=>{
      docker.pull((err)=>{
        docker.run('/bin/bash', (err)=>{
          expect(err).to.be.null();
          docker.kill((err)=>{
            expect(err).to.be.null();
            docker.rm((err)=>{
              expect(err).to.be.null();
              done();
            });
          });
        });
      });
    });
  });

  it('Should not fail when stop is called multiple times', (done)=>{
    const docker = new Docker();
    docker.run('/bin/bash', (err)=>{
      expect(err).to.be.null();
      docker.stop((err)=>{
        expect(err).to.be.null();
        docker.rm((err)=>{
          expect(err).to.be.null();
          docker.stop((err)=>{
            expect(err).to.be.null();
            done();
          });
        });
      });
    });
  });

  it('Should not fail when kill is called multiple times', (done)=>{
    const docker = new Docker();
    docker.run('/bin/bash', (err)=>{
      expect(err).to.be.null();
      docker.kill((err)=>{
        expect(err).to.be.null();
        docker.rm((err)=>{
          expect(err).to.be.null();
          docker.kill((err)=>{
            expect(err).to.be.null();
            done();
          });
        });
      });
    });
  });
});

Rouster
===

**noun**
  * (Australian & US) an unskilled labourer on an oil rig
  * A name for a Dock Worker, also known as a Docker
  * A basic wrapper around Docker for Node.js

Classes
===

Docker
---

The actual worker class for interfacing with Docker.

```
class Docker{
    constructor(options)
    containerId
    dockerBuild
    dockerVersion
    emit(eventName, ...args)
    exec(command, <...args>, <callback>)
    getDockerInfo(<callback>)
    kill(<callback>)
    on(eventName, callback)
    run(command, <...args>, <callback>)
    spawn(command, args, callback)
    throwIfEnabled(error)
}
```

### Events

* docker_info - Emitted when docker info is available
* error - Emitted when an error occurs
* exec_done - Emitted any time an exec command completes
* killed - Emitted when a container is killed
* running - Emitted when a container is running
* spawn - Emitted when a child process is spawned
* stderr - Emitted any time spawn gets a stderr message
* stdout - Emitted any time spawn gets a stdout message

### constructor(options)

Options when creating a new instance of the Docker Class.

#### options

* image - Docker image to use, defaults to 'node:latest'
* dockerCommand - Command used to execute docker, defaults to 'docker'
* throwErrors - Flag to throw errors and exceptions if no callback specified, defaults to true
  * If you are using events and no callbacks make sure to set this to false

### containerId

Once run has been called to setup the docker container, containerId is a read only property that contains the running containers docker container id.

### dockerBuild

Once docker has been found, contains the build number of the currently installed docker executable.

### dockerVersion

Once docker has been found, contains the build number of the currently installed docker executable.

### emit(eventName, ...args)

Used to emit event's **For internal use only!**

### exec(command, <...args>, <callback>)

Execute command on the running container.  If run hasn't been called will throw or return an erorr.

### getDockerInfo(<callback>)

Used to get the current docker executable information **For internal use only!**

### kill(<callback>)

Kills the running container.

### on(eventName, callback)

Used to setup an event handler.

### run(command, <...args>, <callback>)

Used to start a new container, if the container is already running just exits.

### spawn(command, args, callback)

Used to wrap calls to docker **For internal use only!**

throwIfEnabled(error)

Used to throw errors if throwEnabled is not false **For internal use only!**

Commands
---

Simple wrapper for executing multiple commands on a docker container and then performing a clean shutdown.

```
class Commands{
    constructor(options)
    containerId
    dockerBuild
    dockerVersion
    execute(callback)
    startup(callback)
    shutdown(callback)
}
```

### constructor(options)

### containerId

Once execute has been called to setup the docker container, containerId is a read only property that contains the running containers docker container id.  Once the container exits at the end of execute() and the container is cleaned up will be an empty string.

### dockerBuild

Once docker has been found, contains the build number of the currently installed docker executable.

### dockerVersion

Once docker has been found, contains the build number of the currently installed docker executable.

Testing
===

Make sure you have Docker installed.

```
npm install
npm test
```

Command Line Usage Examples
===

I'm not real sure why you would use rouster from the command line, other than
I use it to test the functionality of the UI for giggles.  Just in case though
here are some examples of how to use it.

**NOTE:** For this to work you had to have installed rouster gobally with npm install -g rouster

Using Alpine Linux with Node 4 execute projects tests

```
rouster -v ./:/app/test -w /app/src \
  -e "cp -R /app/test/. /app/src" \
  -e "rm -rf node_modules/" \
  -e "npm install" \
  -e "npm test" \
  -i mhart/alpine-node:4 -s /bin/ash
```

Using the official Node.js Docker Image execute project tests

```
rouster -v ./:/app/test -w /app/src \
  -e "cp -R /app/test/. /app/src" \
  -e "rm -rf node_modules/" \
  -e "npm install" \
  -e "npm test" \
```

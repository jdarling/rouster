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

```js
class Docker{
    constructor(options)
    containerId
    dockerBuild
    dockerVersion
    emit(eventName, ...args)
    exec(command, [...args], [callback])
    execDockerCommand(command, [...args], [callback])
    getDockerInfo([callback])
    kill([callback])
    on(eventName, callback)
    rm([...args], [callback])
    run(command, [...args], [callback])
    spawn(command, args, callback)
    status(callback)
    stop([...args], callback)
    throwIfEnabled(error)
    static ps(args)
    static containers()
}
```

### Events

* docker_info - Emitted when docker info is available
* error - Emitted when an error occurs
* exec_done - Emitted any time an exec command completes
* killed - Emitted when a container is killed
* pulled - Emitted when a Docker image is pulled
* removed - Emitted when a container image is removed
* running - Emitted when a container is running
* spawn - Emitted when a child process is spawned
* stderr - Emitted any time spawn gets a stderr message
* stdout - Emitted any time spawn gets a stdout message
* stopped - Emitted when a running container is stopped

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

### exec(command, [...args], [callback])

Execute command on the running container.  If run hasn't been called will throw or return an erorr.

### getDockerInfo([callback])

Used to get the current docker executable information **For internal use only!**

### kill([callback])

Kills the running container.

### on(eventName, callback)

Used to setup an event handler.

### rm([...args], [callback])

Used to remove the (stopped/killed) container.

### run(command, [...args], [callback])

Used to start a new container, if the container is already running just exits.

### spawn(command, args, callback)

Used to wrap calls to docker **For internal use only!**

### status(callback)

Get the current status of the wrapped container.

```js
docker.status((err, status)=]{
  if(err){
    return console.error(err.stderr.join(''));
  }
  console.log(`${docker.lastContainerId} - ${status}`)
});
```

### stop([...args], callback)

Used to stop the running container.

### throwIfEnabled(error)

Used to throw errors if throwEnabled is not false **For internal use only!**

### static ps([options], args, callback)

Static method on Docker class to return the running list of docker processes.
You can pass in an optional options argument with the dockerCommand if you are
not using the standard 'docker' command.

* options
  * dockerCommand - defaults to 'docker'
* args - Any arguments you want to call options.dockerCommand ps with
* callback(err, response) - Callback with either error or output

### static containers()

Returns a list of running containers

Commands
---

Simple wrapper for executing multiple commands on a docker container and then performing a clean shutdown.

```js
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

Both of these examples:

* start a docker container with the specified image
* mount the current working directory to /app/src
* set the container working directory to (a non-existent) /app/test
* copy the contents of /app/src to /app/test
* remove any existing node_modules/ folder
* perform a npm install
* perform a npm test
* shut down the container
* remove the container

The only real difference is the image they use (Alpine or Node.js official) and
the shell command used to access the running image (/bin/ash vs /bin/bash).

#### Using Alpine Linux with Node 4 execute projects tests

```sh
rouster -v ./:/app/src -w /app/test \
  -e "apk update" \
  -e "apk add alpine-sdk python" \
  -e "cp -R /app/src/. /app/test" \
  -e "rm -rf node_modules/" \
  -e "npm install" \
  -e "npm test" \
  -i mhart/alpine-node:4 -s /bin/ash
```

#### Using the official Node.js (latest) Docker Image execute project tests

```sh
rouster -v ./:/app/src -w /app/test \
  -e "cp -R /app/src/. /app/test" \
  -e "rm -rf node_modules/" \
  -e "npm install" \
  -e "npm test" \
```

#### CLI Options

```sh
rouster [options]
options
  -i [imageName], --image [imageName] - Docker image to run, defaults to "node:latest"
  -d [dockerExecutable], --docker [dockerExecutable] - Docker executable to use, defaults to "docker"
  -s, --shell - Shell command to use, defaults to "/bin/bash"
  -e [command], --execute [command] - Adds a command to be executed on the container once its running
  -l, --loud, --verbose - Output everything
  -w, --working directory - Sets the working directory
  -v, --volume - Mount a volume to the container
  -r, --no-rm - Don't remove container image when complete, by default rouster removes the container when complete
  -r, --no-kill - Don't kill or remove container image when complete, by default rouster kills and removes the container when complete
  -c, --container-id - Wrap currently running container
  -u, --output-status - After everything is complete output the container id and status
  -p, --publish [hostPort:containerPort] - Publish the private containerPort to the host system through hostPort
  -?, -h, --help - Shows this screen
  --version - Output the current version
```

# threads.js [![](https://travis-ci.org/gaia-components/threads.svg)](https://travis-ci.org/gaia-components/threads) [![](https://david-dm.org/gaia-components/threads/dev-status.svg)](https://david-dm.org/gaia-components/threads#info=devDependencies)

> Exposes a service between one browser JavaScript context to another.

```js
// my-worker.js
service('my-service')
  .method('greet', function(name) { return 'hello ' + name; })
  .listen();
```

```js
// app.js
var endpoint = new Worker('my-worker.js');
var myClient = client('my-service', endpoint);

client.method('greet', 'john').then(function(value) {
  console.log(value); //=> 'hello john'
});
```

## Installation

```bash
$ npm install gaia-components/threads
```
```bash
$ bower install gaia-components/threads
```

## Usage

Window: `<script src="threads-service.js">`<br/>
Worker: `importScripts('threads-service.js')`

```js
service('my-service')
  .method('ping', arg => 'pong');
```

Window: `<script src="threads-client.js">`<br/>
Worker: `importScripts('threads-client.js')`

```js
var myClient = client('my-client', new Worker('my-worker,js'))
var myClient.method('ping').then(result => ...)
```

Simple: `<script src="threads.js">`<br/>
CommonJS: `var threads = require('threads')`

```js
var myClient = threads.client('my-client', new Worker('my-worker,js'))
var myClient.method('ping').then(result => ...)

threads.service('my-service')
  .method('ping', arg => 'pong');
```

## How it works

Threads.js uses a variety of transport mechanisms to provide consistent, simple communication between almost any browser JavaScript context.

During the connection phase we pass messages between different endpoints using various `.postMessage()` APIs. Once a Clients connection request is recieved by a Service, a direct `MessageChannel` is opened, through which all subsequent messages are passed.

## Demos

- Methods
- Events
- Forwarding messages
- Custom Endpoints

## Plugins

To keep the core library as light as possible, threads.js uses a plugin approach to bolt on additional funcitonality.

- Streams
- Contracts

## <a class="jsdoc-hidden" href="https://gaia-components.github.io/threads/docs/out/index.html">View Documentation</a>



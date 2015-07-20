# threads.js [![](https://travis-ci.org/gaia-components/threads.svg)](https://travis-ci.org/gaia-components/threads) [![devDependency Status](https://david-dm.org/gaia-components/threads/dev-status.svg)](https://david-dm.org/gaia-components/threads#info=devDependencies)

Exposes services from one 'endpoint' to another.

An 'endpoint' could be an:

- `<iframe>`
- `Worker`
- `SharedWorker`
- `BroadCastChannel`

## How it works

Threads.js uses a variety of transport mechanisms to provide consistent, simple communication between almost any JavaScript context.

During the connection phase we pass messages between different endpoints using various `.postMessage()` APIs. Once a Clients connection request is recieved by a Service, a direct `MessageChannel` is opened, through which all subsequent messages are passed.

## Service

A `Service` is a collection of methods exposed to a `Client`. Methods can be sync or async (using `Promise`s).

```js
importScripts('threads-service.js');

service('my-service')
  .method('myMethod', function(param) {
    return 'hello: ' + param;
  })

  .method('myOtherMethod', function() {
    return new Promise(resolve => {
      setTimeout(() => resolve('result'), 1000);
    });
  })

  .listen();
```

## Client

`Service`s are digested by `Client`s.

```js
var threads = require('threads-client');
var endpoint = document.querySelector('iframe');
var client = client('my-service', endpoint);

client.method('myMethod', 'world').then(value => {
  console.log(value); //=> 'hello: world'
});
```

## Events

Events can be broadcast from a `Service`, these will trigger any subscribed callbacks on the client-side.

```js
var service = threads.service('my-service');
var count = 0;

setInterval(() => {
  service.broadcast('tick', ++count);
}, 1000);
```

```js
var client = threads.client('my-service');
client.on('tick', count => console.log('tick', count));
```

#### Client#on(name, callback)

Subscribe to a service broadcast. Callback will be passed `data` as the first argument.

#### Service#broadcast(name[, data, [clients]])

Broadcast's an event from a `Service` to connected `Client`s. The third argument can be used to target selected clients by their `client.id`.

## Endpoints

The `Service` you wish your `Client` to connect to lives in a particular JavaScript context or 'endpoint'. thread.js has support follw the following endpoints out of the box:

- `SharedWorker`
- `<iframe>`
- `Worker`
- `BroadCastChannel`

It's up to you to point your `Client` in the direction it's `Service` can be found. You can do this in two ways:

1. Pass an endpoint to a client when it's constructed

```js
var endpoint = document.querySelector('iframe');
client('my-service', endpoint);
```

2. Define an endpoint 'globally'

```js
client.prototype.endpoint = document.querySelector('iframe');

client('my-service-1');
client('my-service-2');
client('my-service-3');
```

### Custom endpoints

```js
var customEndpoint = {
  postMessage(data, transfer) { ... }
  addListener(callback) { ... }
  removeListener(callback) { ... }
}

client('my-service', customEndpoint);
```

```js
var customEndpoint = {
  postMessage(data, transfer) { ... }
  addListener(callback) { ... }
  removeListener(callback) { ... }
}

service('my-service')
  .method('myMethod', ...)
  .listen(customEndpoint);
```

## Forwarding messages

A `Client` may not always have a direct handle on the endpoint which its service lives in
. In this case you can `.forward()` messages from an accessbile endpoint until they reach their final destination.

```js
var worker = new Worker('real-service.js');

service('*')
  .on('message', message => {
    message.forward(worker);
  })
  .listen();
```

In most cases this hopping proceedure will only be required during the 'connect' phase. After which, all messages are sent directly via `MessageChannel`.

## Optional Plugins

To keep the core library as light as possible, threads.js uses a plugin approach to bolt on additional funcitonality.

### Contracts

Contracts can be used to enforce a strict, well-defined protocol between `Service` and `Client`. A `contract` object accepts two keys: `methods` and `events`. Each object defines an event/method name and the expected arguments.

```js
threads.service('my-service')
  .plugin(contractsPlugin(myContract))
  .method('myMethod', function(param) { return 'hello: ' + param; });
```

### Streams

Some services need to send data in *chunks* to the clients and also allow
a way of canceling the action before it is completed. For these cases register
the action as a `stream()`:

```js
threads.service('my-service')
  .plugin(streamsService)
  .stream('myStreamingMethod', function(stream, param) {
    if (param === 'foo') {
      stream.write('bar');
    }

    if (param === 'dolor') {
      // abort() is the way to signal to client that action failed
      stream.abort(new TypeError('invalid argument "dolor"'));
      return;
    }

    var timeout = setTimeout(function() {
      stream.write('baz');
      // close() signals that action finished with success
      stream.close();
    }, 10);

    // you should implement the `cancel` method on the `stream` if your service
    // supports cancellation
    stream.cancel = function(reason) {
      clearTimeout(timeout);
      // you can return a promise if cancel is async; or omit return if action
      // is synchronous or you don't want to notify the client about completion
    };
  });
```

```js
var client = threads.client('my-service')
  .plugin(streamsClient);

var stream = client.stream('myStreamingMethod', 'foo');

// called every time the service sends some data
stream.listen(function(data) {
  console.log('data:', data);
});

// "closed" is a Promise that will be fullfilled when stream is closed with
// success or rejected when the service "abort" the operation
stream.closed.then(onStreamClose, onStreamAbort);

// important to note that not all services are able to handle cancellation
// in those cases the promise will be rejected
stream.cancel('because I want').then(onCancelSuccess, onCancelError);
```

PS: The streaming implementation is very basic and doesn't handle
*backpressure*, buffering and piping; it is just a simple event bridge between
the `service` and the `client`. This was done on purpose to avoid complexity.
The methods `close()`, `abort()` and `write()` return Promises that can be used
to validate if action was executed (eg. `write` have no effect after `close` so
promise will be rejected).

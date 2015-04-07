## threads

Exposes services from one 'thread' to another.

A 'thread' could be an instance of:

- Window
- Worker
- SharedWorker

### Service

A `Service` is a collection of methods exposed to a `Client`. Methods can be sync or async (using `Promise`s).

```js
importScripts('threads.js');

threads.service('my-service', {
  myMethod: function(param) {
    return 'hello: ' + param;
  },

  myOtherMethod: function() {
    return new Promise(resolve => {
      setTimeout(() => resolve('result'), 1000);
    });
  }
});
```

### Client

`Service`s are digested by `Client`s.

```js
var threads = require('threads');
var client = threads.client('my-service');

client.call('myMethod', 'world').then(value => {
  console.log(value); //=> 'hello: world'
});
```

### Manager

The `Manager` acts as a middleman between the `Client` and the `Service`. It listens for newly created clients and will attempt to pair it to a known service. If the requested service isn't running it will spin one up.

```js
threads.manager({
  'my-service': {
    src: '/workers/my-service.js',
    type: 'worker'
  }
});
```

### Events

Events can be fired from a `Service`, these will trigger any subscribed callbacks on the client-side.

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

### Contracts

Contracts can be used to enforce a strict, well defined protocol between `Service` and `Client`. A `contract` object accepts two keys: `methods` and `events`. Each object defines an event/method name and the expected arguments.

```js
threads.manager({
  'my-service': {
    src: '/workers/my-service.js',
    type: 'worker',
    contract: {
      methods: {
        myMethod: ['string']
      },

      events: {
        tick: 'number'
      }
    }
  }
});
```

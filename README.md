## runtime-bridge ![](https://travis-ci.org/gaia-components/runtime-bridge.svg)

Implements a 'contracted' interface between two JS 'runtimes' based on a client/server paradigm. A 'runtime' could be an instance of:

- Window
- Worker
- SharedWorker
- ServiceWorker

### The contract

The contract defines the interface between the two runtimes.

```js

var contract = {
  name: 'foobar',

  methods: {
    getContact: {
      args: ['number'],
      returns: 'object'
    }
  },

  events: {
    contactchanged: 'object'
  }
};
```

## Defining sides

Each side must take the role of either 'client' or 'server'.

### Server

Implementing contracted methods:

```js
var server = new Server(contract, {
  getContact: getContact
});

function getContact(id) {
  return new Promise((resolve, reject) => {
    database.getContact(id).then(resolve, reject);
  });
}
```

Broadcasting events:

```js
server.broadcast('contactchanged', contact);
```

### Client

```js
var worker = new Worker('worker.js');
var client = new Client(contract, worker);
```

Calling methods:

```js
client.getContact(1).then(contact => {
  // ...
});
```

Listening to events:

```js
client.addEventListener('contactchanged', contact => {
  // ...
});
```

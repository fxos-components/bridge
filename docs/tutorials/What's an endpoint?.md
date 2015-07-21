The `Service` you wish your `Client` to connect to lives in a particular JavaScript context or 'endpoint'. thread.js has support follw the following endpoints out of the box:

- `Worker`
- `<iframe>`
- `MessagePort` (inc. `SharedWorker`, `MessageChannel`)
- `BroadcastChannel`
- `Window`

It's up to you to point your `Client` in the direction it's `Service` can be found. You can do this in two ways:

#### A. Endpoint per client

```js
var endpoint = document.querySelector('iframe');
client('my-service', endpoint);
```

#### B. Global default endpoint

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

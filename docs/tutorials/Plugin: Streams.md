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

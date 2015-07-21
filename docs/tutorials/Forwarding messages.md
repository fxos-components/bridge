A `Client` may not always have a direct handle on the endpoint which its service lives in
. In this case you can `.forward()` messages from an accessbile endpoint until they reach their final destination.

```js
var worker = new Worker('real-service.js');

service('*')
  .on('message', message => message.forward(worker))
  .listen();
```

In most cases this hopping proceedure will only be required during the 'connect' phase. After which, all messages are sent directly via `MessageChannel`.

### [View example ➔](../../examples/forwarding-messages/index.html)

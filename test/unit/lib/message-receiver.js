
var message = bridge._m;
var i = 0;

message.receiver('receiver-1')
  .on('who-are-you', message => {
    message.respond('receiver-1');
  })

  .on('test-message', message => {
    message.respond('roger');
  })

  .on('repeat', message => {
    message.respond(message.data);
  })

  .on('throw-error', message => {
    throw new Error('my-error');
  })

  .on('throw-dom-error', message => {
    throw new DOMError('my-error-name', 'my-error-message');
  })

  .on('throw-dom-exception', message => {
    var err = new DOMException('my-error-message');
    console.log('XXX', err);
    throw err;
  })

  .on('throw-non-error', message => {
    throw { normal: 'object' };
  })

  .on('does-not-respond', message => {})

  .on('test-one-way-messages', message => {
    parent.postMessage('got one way message', '*');
    message.respond('pong');
  })

  .on('ping', message => {
    message.respond('pong:receiver-1');
  })

  .on('forwarded-message', message => {
    var iframe = document.createElement('iframe');
    iframe.src = '/base/test/unit/lib/message-test-2.html';
    iframe.hidden = true;
    document.body.appendChild(iframe);
    message.forward(iframe);
  })

  .on('transfer-test-1', message => {
    message.respond(message.event.ports.length);
  })

  .on('transfer-test-2', message => {
    var mc = new MessageChannel();
    message.set('transfer', [mc.port2]);
    message.respond('have some port');
  })

  .listen();

message.receiver('receiver-2')
  .on('who-are-you', message => {
    message.respond('receiver-2');
  })

  .listen();

/**
 * BroadcastChannel
 */

message.receiver('bc-reciever')
  .listen(new BroadcastChannel('send-test'))
  .on('ping', message => {
    message.respond('pong');
  });

message('ping')
  .send(new BroadcastChannel('receive-test'));


bridge.service('service-1')
  .method('method-1', param => {
    return param;
  })

  .method('targetedBroadcast', function(type, data, clients) {
    this.broadcast(type, data, clients);
  })

  .listen();

var service2 = bridge.service('service-2')
  .method('event-test', param => {
    service2.broadcast('test-event', { some: 'data' });
  })

  .method('cloningError', function(id) {
    return self;
  })

  .method('rejectWithoutMessage', () => {
    return new Promise((resolve, reject) => {
      reject();
    });
  })

  .method('rejectWithMessage', () => {
    return new Promise((resolve, reject) => {
      reject('my error');
    });
  })

  .method('throwException', () => {
    throw new Error('my error');
  })

  .on('on', data => {
    service2.broadcast('client-listening', data);
  })

  .on('off', data => {
    service2.broadcast('client-stopped-listening', data);
  })

  .listen();

bridge.service('test-streams')
  .plugin(streamService)
  .stream('test-data', function(stream, type, data) {
    stream.write('1: ' + type + ' ' + data);
    setTimeout(function() {
      stream.write(' | 2: this should also work');
      stream.close({ success: true });
    }, 10);
  })
  .stream('test-abort', function(stream, someArg) {
    setTimeout(function() {
      if (someArg === 123) {
        stream.abort('someArg should not equal 123');
      } else {
        stream.close();
      }
    }, 10);
  })

  .stream('test-cancel', function(stream) {
    var timeout;
    // service can return a promise on `cancel` for async operations
    stream.cancel = function(reason) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      return Promise.resolve(reason + '!!!');
    };
    var count = 0;
    var send = function() {
      stream.write(++count);
      timeout = setTimeout(send, 500);
    };
    send();
  })

  .listen();

bridge.service('bc-service')
  .method('ping', arg => {
    return 'pong';
  })

  .listen(new BroadcastChannel('bc-service-channel'));


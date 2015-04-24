/*global threads*/


importScripts('../../threads.js');

try {

  // this file only contains the basic features of the service stream; to test
  // advanced error handling and edge cases we use the service-stream.test.js

  var service = threads.service('test-streams')
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
    });

  service.stream('test-cancel', function(stream) {
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
      timeout = setTimeout(send, 5);
    };
    send();
  });

} catch(e) {
  console.log(e);
}


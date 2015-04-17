/*global threads*/


importScripts('../../threads.js');

try {

  threads.service('test-events')
    .method('testBroadcast', function(type, data) {
      this.broadcast(type, data);
    });

} catch(e) {
  console.log(e);
}


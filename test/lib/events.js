/*global threads*/


importScripts('../../threads.js');

try {

  threads.service('test-events')

    .method('testBroadcast', function(type, data) {
      this.broadcast(type, data);
    })

    .method('testTargetedBroadcast', function(type, data, clients) {
      this.broadcast(type, data, clients);
    });

} catch(e) {
  console.log(e);
}


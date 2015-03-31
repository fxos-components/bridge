/*global threads*/


importScripts('../../threads.js');

try {

  threads.service('test-event', {
    testBroadcast: function(type, data) {
      this.broadcast(type, data);
    }
  });

} catch(e) {
  console.log(e);
}


/*global threads*/


importScripts('../../threads.js');

try {

  threads.service('test-events', {
    testBroadcast: function(type, data) {
      this.broadcast(type, data);
    }
  });

} catch(e) {
  console.log(e);
}


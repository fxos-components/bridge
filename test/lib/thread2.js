/*global threads*/


importScripts('../../threads.js');

try {

  threads.service('thread2-service', {
    getData: function(id) {
      return { some: 'data' };
    }
  });

} catch(e) {
  console.log(e);
}


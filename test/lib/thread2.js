/*global threads*/


importScripts('../../threads.js');

try {

  threads.service('thread2-service')

    .method('getData', function(id) {
      return { some: 'data' };
    })

    .method('cloningError', function(id) {
      return self;
    });

} catch(e) {
  console.log(e);
}


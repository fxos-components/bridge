/*global threads*/


importScripts('../../threads.js');

try {

  threads.service('view-server')
    .method('getData', function(id) {
      return { some: 'data' };
    });

} catch(e) {
  console.log(e);
}


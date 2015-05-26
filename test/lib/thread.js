/*global threads*/


importScripts('../../threads.js');

try {

  threads.service('view-server')
    .method('getData', function(id) {
      return { some: 'data' };
    })

    .method('returnsFalse', function() {
      return false;
    })

    .method('returnsEmptyString', function() {
      return '';
    })

    .method('returnsNull', function() {
      return null;
    })

    .method('returnsZero', function() {
      return 0;
    })

    .method('returnsUndefined', function() {
      return null;
    });

} catch(e) {
  console.log(e, e.stack);
}


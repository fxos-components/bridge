
importScripts('../../threads.js');

try {

  threads.service('sharedworker-thread')
    .method('getData', function(id) {
      return { some: 'data' };
    });

} catch(e) {
  console.log(e, e.stack);
}
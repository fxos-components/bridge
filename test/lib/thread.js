/*global threads*/


importScripts('../../threads.js');

try {

  threads.service('view-server', {
    getData: function(id) {
      return { some: 'data' };
    }
  });

} catch(e) {
  console.log(e);
}


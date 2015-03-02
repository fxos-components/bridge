'use strict';

importScripts('../server.js');

var s1 = new Server('update', '1.0', {
  checkForUpdate: function() {
    s1.broadcast('updatefound', {});
    return 'Check for update from server';
  }
});


var s2 = new Server('contacts', '1.0', {
  getAll: function() {
    return ['foo', 'bar'];
  }
});

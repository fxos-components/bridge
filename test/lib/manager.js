define(function(require, exports, module) {
'use strict';

var threads = require('../../threads');

threads.manager({
  'view-server': {
    src: '/base/test/lib/thread.js',
    env: Worker,
    contract: {
      methods: {
        getData: {
          args: [],
          returns: '*'
        }
      }
    }
  }
});

});

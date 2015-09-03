/*global bridge,performance*/

// Overwrite to prevent key clashes
performance.mark = (function(mark, hash) {
  return key => {
    var count = hash[key] = (hash[key] && hash[key] + 1) || 1;
    if (count > 1) key += ` (${count})`;
    mark.call(performance, key + '@ping-worker.gaiamobile.org');
  };
})(performance.mark, {});

var mark = arg => performance.mark(`[App] ${arg}`);
mark('service script start');

importScripts('bridge.js');
mark('imported scripts');

bridge.service('my-service')
  .listen()
  .method('ping', function() {
    mark('got ping');
    mark('sent pong');
    return 'pong';
  });
mark('service created');

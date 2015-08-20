/*global bridge*/

// Overwrite to prevent key clashes
performance.mark = (function(real, hash) {
  return key => {
    var count = hash[key] = (hash[key] && hash[key] + 1) || 1;
    if (count > 1) key += ` (${count})`;
    real.call(performance, key);
  };
})(performance.mark, {});

var mark = arg => performance.mark(`[App] ${arg}`);
mark('app script start');

var worker = new SharedWorker('worker.js');
mark('created worker');

var client = bridge.client('my-service', worker);
mark('created client');

client.method('ping')
  .then(result => mark('got pong'))
  .then(() => {
    performance.mark('fullyLoaded');
  });
mark('sent ping');

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

var iframe = document.querySelector('iframe');
var client = bridge.client('my-service', iframe);
mark('created client');

client.method('ping')
  .then(result => mark('got pong'))
  .then(() => {
    performance.mark('fullyLoaded');
  });
mark('sent ping');

importScripts('../../bridge.min.js');

var service = bridge.service('clock').listen();

setInterval(() => {
  service.broadcast('tick', new Date());
}, 1000);

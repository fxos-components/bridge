importScripts('../../threads.min.js');

var service = threads.service('clock').listen();

setInterval(() => {
  service.broadcast('tick', new Date());
}, 1000);

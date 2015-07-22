importScripts('../../threads.js');

var myClient = threads.client('my-service', new BroadcastChannel('my-service-channel'));
var logger = threads.client('logger', new BroadcastChannel('logger-service-channel'));

myClient.method('ping').then(result => {
  logger.method('log', 'Got result: ' + result);
});

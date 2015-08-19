importScripts('../../bridge.min.js');

var myClient = bridge.client('my-service', new BroadcastChannel('my-service-channel'));
var logger = bridge.client('logger', new BroadcastChannel('logger-service-channel'));

myClient.method('ping').then(result => {
  logger.method('log', 'Got result: ' + result);
});

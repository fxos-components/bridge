importScripts('../../client.js');

var myClient = client('my-service', new BroadcastChannel('my-service-channel'));
var logger = client('logger', new BroadcastChannel('logger-service-channel'));

myClient.method('ping').then(result => {
  logger.method('log', 'Got result: ' + result);
});

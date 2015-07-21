importScripts('../../service.js');

service('my-service')
  .method('ping', () => 'pong')
  .listen();

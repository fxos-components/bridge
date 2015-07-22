importScripts('../../service.js');

threads.service('my-service')
  .method('ping', () => 'pong')
  .listen();

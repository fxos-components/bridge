importScripts('../../threads.min.js');

threads.service('my-service')
  .method('ping', () => 'pong')
  .listen();

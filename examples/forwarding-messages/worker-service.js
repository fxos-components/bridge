importScripts('../../bridge.min.js');

bridge.service('my-service')
  .method('ping', () => 'pong')
  .listen();

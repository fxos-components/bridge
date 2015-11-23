/*global bridge, IACAdaptorService*/

bridge.service('my-service')
  .listen(new IACAdaptorService())
  .method('my-method', data => {
    return 'pong';
  });

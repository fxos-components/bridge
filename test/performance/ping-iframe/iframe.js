/*global bridge*/

performance.mark = arg => window.parent.performance.mark(arg);
var mark = arg => performance.mark(`[App] ${arg}`);
mark('service script start');

bridge.service('my-service')
  .listen()
  .method('ping', function() {
    mark('got ping');
    mark('sent pong');
    return 'pong';
  });
mark('service created');

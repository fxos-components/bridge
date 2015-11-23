/*global bridge, IACAdaptorClient*/

var port = new IACAdaptorClient('my-service');
var client = bridge.client('my-service', port);

client.method('my-method', 'foo').then(result => {
  document.body.textContent = `response: ${result}`;
});
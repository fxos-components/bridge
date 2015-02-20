(function(exports) {

var debug = 0 ? console.log.bind(console, '[server]') : function() {};

/**
 * exports
 */

exports.Server = Server;

const ERRORS = {
  1: 'Method not defined in the contract'
};

function Server(contract, methods) {
  this.contract = contract;
  this.methods = methods;
  this._broadcast = broadcast;
  this.onmessage = this.onmessage.bind(this);
  this.listen = listen;
  this.send = send;
  this.ports = [];
  this.listen();
}

Server.prototype.broadcast = function(name, data) {
  debug('broadcast', name, data);
  this._broadcast({
    contract: this.contract.name,
    type: 'broadcast',
    name: name,
    data: data
  });
};

Server.prototype.respond = function(request, result) {
  debug('respond', request.type, result);
  var response = request;
  response.result = result;
  response.type = 'response';
  this.send(response);
};

Server.prototype.onmessage = function(data) {
  debug('on message', data);

  // TODO: This is an ugly re-entrant message!
  if (data === 'connected') {
    return;
  }

  // TODO: This part should be moved out of this function.
  if (typeof data === 'string') {
    console.log('Opening channel: ' + data);
    var channel = new BroadcastChannel(data);
    channel.uuid = data;
    this.ports.push(channel);

    var uuid = data;
    var self = this;
    channel.onmessage = function(data) {
      if (data.data === 'die') {
        console.log('[server] Closing channel (' + uuid + ')  for: ' + self.contract.name);
        channel.close();
        return;
      }

      data.data.port = channel;
      self.onmessage(data.data);
    };

    // TODO: This is a bit weak to say that in this simple way.
    // Would be better is there is a set of default events for clients
    // such as connected/disconnected.
    channel.postMessage('connected');
    return;
  }

  if (data.contract !== this.contract.name) return;
  if (data.type !== 'request') return;
  this.onrequest(data);
};

Server.prototype.onrequest = function(request) {
  debug('on request', request);
  var fn = this.methods[request.method];
  var args = request.args || [];
  if (!fn) throw new Error(ERRORS[1]);
  Promise.resolve(fn.apply(null, args)).then((result) => {
    this.respond(request, result);
  });
};

function listen() {
  addEventListener('message', e => this.onmessage(e.data));
};

function send(data) {
  var port = data.port;
  delete data.port;
  port.postMessage(data);
};

function broadcast(data) {
  this.ports.forEach(port => port.postMessage(data));
};

})(this);

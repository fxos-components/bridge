(function(exports) {
'use strict';

function ClientFactory(name, version) {
  return createNewClient(name, version);
}

const kErrors = {
  NotImplemented: 'Not Implemented.',
  NoPromise: 'No Promise Found.'
}

function createNewClient(name, version) {
  /*
   * Global variables
   */
  var pendings = {};


  /*
   * Registration
   */
  function Registration(client, uuid) {
    var kRegistrationChannelName = 'smuggler';
    var smuggler = new BroadcastChannel(kRegistrationChannelName);
    smuggler.postMessage({
      name: 'Register',
      type: 'client',
      contract: client.name,
      version: client.version,
      uuid: uuid
    });
    smuggler.close();
  }


  /*
   * Packet
   */
  function Packet(id, method, args) {
    return {
      uuid: id,
      method: method,
      args: args,
    };
  }


  /*
   * Deferred
   */
  function Deferred() {
    var deferred = {};
    deferred.promise = new Promise(function(resolve, reject) {
      deferred.resolve = resolve;
      deferred.reject = reject;
    });
    return deferred;
  }


  /*
   * RemotePrototype
   */
  function RemotePrototype() {
    var self = this;

    var prototype = {
      get: function(target, method) {
        return self.invoke(method);
      }
    };

    return new Proxy({}, prototype);
  }

  RemotePrototype.prototype.invoke = function(method) {
    return function() {
      var id = uuid();
      var packet = new Packet(id, method, [].slice.call(arguments));

      var deferred = new Deferred();
      pendings[id] = {
        packet: packet,
        deferred: deferred
      }
      return deferred.promise;
    }
  };

  /*
   * ClientInternal
   */
  function ClientInternal(client) {
    this.client = client;
    this.uuid = uuid();

    this.server = null;
    this.connect();
  }

  ClientInternal.prototype.connect = function() {
    new Registration(this.client, this.uuid);
    this.server = new BroadcastChannel(this.uuid);
    this.listen();
  };

  ClientInternal.prototype.onconnected = function(contract) {
    debug(this.client.name + ' [connected]');

    this.connected = true;

    for (var id in pendings) {
      this.send(pendings[id].packet);
      pendings[id] = pendings[id].deferred;
    }

    mutatePrototype(this.client, this.createPrototype(contract));
  };

  ClientInternal.prototype.disconnect = function() {
    throw new Error(kErrors.NotImplemented);
  };

  ClientInternal.prototype.ondisconnected = function() {
    throw new Error(kErrors.NotImplemented);
  };

  ClientInternal.prototype.listen = function() {
    this.server.addEventListener('message', e => this.onmessage(e));
  };

  ClientInternal.prototype.addEventListener = function(name, fn) {
    this.server.addEventListener('broadcast:' + name, fn);
  };

  ClientInternal.prototype.removeEventListener = function(name, fn) {
    this.server.removeEventListener('broadcast:' + name, fn);
  };

  ClientInternal.prototype.dispatchEvent = function(e) {
    this.server.dispatchEvent(e);
  };

  ClientInternal.prototype.send = function(packet) {
    debug('send', packet);
    this.server.postMessage(packet);
  };

  ClientInternal.prototype.request = function(method, args) {
    debug('request', method, args);

    var id = uuid();
    var packet = new Packet(id, method, args);
    this.send(packet);

    var deferred = new Deferred();
    pendings[id] = deferred;
    return deferred.promise;
  };

  ClientInternal.prototype.onresponse = function(packet) {
    debug('on response', packet);

    var id = packet.uuid;
    var promise = pendings[id];
    if (!promise) {
      throw new Error(KErrors.NoPromise);
    }
    delete pendings[id];

    promise.resolve(packet.result);
  };

  ClientInternal.prototype.onmessage = function(e) {
    debug('on message', e, e.data);

    switch (e.data.type) {
      case 'connected':
        this.onconnected(e.data.interface);
        break;

      case 'disconnected':
        this.ondisconnected();
        break;

      case 'broadcast':
        this.onbroadcast(e.data);
        break;

      default:
        this.onresponse(e.data);
        break;
    }
  };

  ClientInternal.prototype.onbroadcast = function(packet) {
    debug('on broadcast', packet);

    var e = new CustomEvent('broadcast:' + packet.name);
    e.data = packet.data;
    this.server.dispatchEvent(e);
  };

  ClientInternal.prototype.createInterface = function() {
    throw new Error(kErrors.NotImplemented);
  };

  ClientInternal.prototype.createPrototype = function(contract) {
    var prototype = {};
    for (var name in contract.methods) {
      prototype[name] = createMethod(name, contract.methods[name]);
    }

    var self = this;
    function createMethod(name, definition) {
      debug('create method', name, definition);
      return function() {
        // XXX Most of those checks should be performed on the server side.
        var args = [].slice.call(arguments);
        var invalidLength = args.length !== definition.args.length;
        var invalidType = !typesMatch(args, definition.args);
        if (invalidLength || invalidType) {
          throw new Error(name + '() called with invalid argument');
        }

        return self.request(name, args);
      };
    }

    return prototype;
  };


  /*
   * Client
   */
  function Client(name, version) {
    this.name = name;
    this.version = version;

    mutatePrototype(this, new RemotePrototype());
  };

  Client.prototype.addEventListener = function(name, fn) {
    internal.addEventListener(name, fn);
  };

  Client.prototype.removeEventListener = function(name, fn) {
    internal.removeEventListener(name, callback);
  };


  var client = new Client(name, version);
  var internal = new ClientInternal(client);

  return client;
}


/*
 * Utils
 */

function debug() {
  //console.log.bind(console, '[client]').apply(console, arguments);
}

function mutatePrototype(object, prototype) {
  Object.setPrototypeOf(Object.getPrototypeOf(object), prototype);
}

function typesMatch(args, types) {
  for (var i = 0, l = args.length; i < l; i++) {
    if (typeof args[i] !== types[i]) {
      return false;
    }
  }

  return true;
}

function uuid(){
  var timestamp = Date.now();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    function onEachCharacter(c) {
      var r = (timestamp + Math.random() * 16) % 16 | 0;
      timestamp = Math.floor(timestamp / 16);
      return (c == 'x' ? r : (r&0x7|0x8)).toString(16);
    }
  );
}

exports.Client = ClientFactory;
})(this);

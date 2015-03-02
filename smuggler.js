(function() {
  'use strict';

  function debug(str) {
    console.log('[smuggler] ' + str);
  };

  // Config is an object populate by the application itself.
  var config = {};

  var kConfigTypes = {
    'Worker': Worker,
    'SharedWorker': SharedWorker,
    'ServiceWorker': function() {
      return navigator.serviceWorker.controller || new Boolean(false);
    },
    'Window': null
  };

  function getConfigForContract(name) {
    for (var url in config) {
      if (config[url].contracts.indexOf(name) != -1) {
        return {
          url: url,
          type: config[url].type
        }
      }
    }

    return null;
  }

  var channel = new BroadcastChannel('smuggler');
  channel.onmessage = function(msg) {
    switch (msg.data.name) {
      case 'Register':
        register(msg.data);
        break;

      case 'Unregister':
        unregister(msg.data);
        break;

      case 'Config':
        config = msg.data.config;
        break;

      default:
        throw new Error('Not Implemented.');
        break;
    }
  };

  // Registrations is a map of contracts, that has a list of clients
  // and who is the server.
  // It also contains the unique UUID used for the side-to-side
  // communications between one client and the server.
  //
  // This is more or less something like:
  //  {
  //    contract: {
  //      server: server_instance,
  //      clients: [uuid1, uuid2, ...]
  //    }
  //  }
  //
  // When the server is running the |server| state is set to the
  // server instance.
  // If |server| then the smuggler does not see datas that are
  // transferred.
  // If |!server| then the smuggler receive the data, start the
  // server using the defined configuration, and forward the request
  // before setting |server| to true and forget about the channel.
  // 
  // In some special cases we would like to intercept messages even
  // if |server| is set to true.
  // For example we may want to be able to inspect the data
  // that are exchange between the client and the server and rewrite
  // them on the fly for debugging purpose.
  // Or if one of the client is not prioritary anymore (it may
  // happens if the client is a view, and this is not the view
  // that is currently visible to the user. Then we may want to
  // intercept those messages in order to delay them a little bit
  // to favor the server that is actively running.
  //
  var registrations = new Map();

  // Based on the configuration there could be multiple contracts
  // served by one end point. So if a server instance has already
  // started for a contract that is part of a group, let's return
  // this instance.
  function getInstanceForContract(name) {
    for (var url in config) {
      var contracts = config[url].contracts;
      if (contracts.indexOf(name) === -1) {
        continue;
      }

      for (var i = 0; i < contracts.length; i++) {
        if (!registrations.has(contracts[i])) {
          continue;
        }

        return registrations.get(contracts[i]).server;
      };
    }

    return null;
  }

  function registerContract(name) {
    if (registrations.has(name)) {
      return;
    }

    var registration = {
      server: getInstanceForContract(name),
      clients: []
    };

    registrations.set(name, registration);
  }

  function registerClientForContract(uuid, name) {
    registerContract(name);

    var registration = registrations.get(name);
    registration.clients.push(uuid);
  }

  function hasClientsForContract(name) {
    var registration = registrations.get(name);
    return !!registration.clients.length;
  }

  function getClientsForContract(name) {
    var registration = registrations.get(name);
    return registration.clients;
  }

  function registerServerForContract(server, name) {
    registerContract(name);

    var registration = registrations.get(name);
    registration.server = server;
  }

  function hasServerForContract(name) {
    var registration = registrations.get(name);
    return !!registration.server;
  }

  function getServerForContract(name) {
    var registration = registrations.get(name);
    return registration.server;
  }

  // TODO: Add version support
  var kEmptyRegistration = 'Empty registration are not allowed.';
  var kEmptyContract = 'Empty contract are not allowed.';
  var kUnknownRegistrationType = 'Unknown registration type.';
  function register(registration) {
    if (!registration) {
      throw new Error(kEmptyRegistration);
    }

    var contract = registration.contract;
    if (!contract) {
      throw new Error(kEmptyContract);
    }

    switch (registration.type) {
      case 'client':
        registerClientForContract(registration.uuid, contract);
        registerServerForContract(
          getInstanceForContract(contract),
          contract
        );

        // TODO: Lazily start the server.
        // The server does not need to run if the client is not trying
        // to exchange any data. So the smuggler should first listen for
        // data coming over the communication channel before and once there
        // is some it can start the server and forward it the data before
        // dropping its own reference to the communication channel.
        // But for now we are lazy and start the server as soon the client
        // is connected.

        if (!hasServerForContract(contract)) {
          var config = getConfigForContract(contract)
          var server = new kConfigTypes[config.type](config.url);

          // TODO: If the server is supposed to be hosted by a serviceWorker
          // that is not running, then we don't support lazy restart here.
          if (server == false) {
            return;
          }

          registerServerForContract(server, contract);
        }


        if (hasServerForContract(contract)) {
          var server = getServerForContract(contract);
          server.postMessage({
            contract: contract,
            uuid: registration.uuid
          });
        }
        break;

      case 'server':
        registerServerForContract(uuid, contract);

        if (hasClientsForContract(contract)) {
          // TODO:
          // Forward clients uuids to the server if the server is
          // restarted lazily.
        }
        break;

      default:
        throw new Error(registration.type + ': ' + kUnknowRegistrationType);
        break;
    }
  };

  function unregister(registration) {
    debug('Someone is trying to unregister: ' + registration);
  };
})();


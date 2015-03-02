'use strict';

function registerServers() {
  var config = {
    'usage/server.js': {
      contracts: ['update', 'contacts'],
      type: 'Worker'
    }
  };

  var channel = new BroadcastChannel('smuggler');
  channel.postMessage({
    name: 'Config',
    config: config
  });
  channel.close();
}

registerServers();

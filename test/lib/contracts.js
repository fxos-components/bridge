/*global threads*/

importScripts('../../threads.js');

try {

  threads.service('contract-service')
    .method('contractMethod', function(string) {
      return 'conformance: ' + string;
    })
    .method('uncontractMethod', function() {
      return 'rebellion!';
    });

  /**
   * An example of a service that
   * provides its own contract.
   */

  var contract = {
    methods: {
      contractMethod: ['string']
    },

    events: {
      'contractevent': {
        object: 'object',
        number: 'number',
        string: 'string',
        boolean: 'boolean'
      }
    }
  };

  threads.service('service-supplied-contract')
    .contract(contract)
    .method('contractMethod', function(string) {
      return 'conformance: ' + string;
    })
    .method('uncontractMethod', function() {
      return 'rebellion!';
    });

} catch(e) {
  console.log(e);
}


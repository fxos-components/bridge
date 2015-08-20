/*global bridge*/

importScripts('../../bridge.js');

try {

  bridge.service('contract-service')
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

  bridge.service('service-supplied-contract')
    .contract(contract)
    .method('contractMethod', function(string) {
      return 'conformance: ' + string;
    })
    .method('uncontractMethod', function() {
      return 'rebellion!';
    });

} catch(e) {
  console.log('ZZZ');
  console.log(e);
}


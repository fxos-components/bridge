define(function(require, exports, module) {

module.exports = {
  name: 'view-server',

  methods: {
    getContact: {
      args: ['number'],
      returns: 'object'
    },

    testBroadcast: {
      args: ['string']
    }
  },

  events: {
    contactchanged: 'object',
    someeventname: 'object',
  }
};

});




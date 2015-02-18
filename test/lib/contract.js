
var _self = typeof window != 'undefined' ? window : self;

self.contract = {
  name: 'foobar',

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

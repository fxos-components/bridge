
var contract = {
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
    contactchanged: 'object'
  }
};

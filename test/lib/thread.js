
importScripts('../../bower_components/alameda/alameda.js');

require.config({ baseUrl: '../../' });

require(['threads'], function(threads) {
  try {

  threads.service('view-server', {
    getData: function(id) {
      return { some: 'data' };
    }
  });

} catch(e) {
  console.log(e);
}

});




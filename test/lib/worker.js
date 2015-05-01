
importScripts('../../server.js');
importScripts('./contract.js');

var server = new Server(contract, {
  getContact: getContact,
  testBroadcast: testBroadcast
});

var database = {
  1: { id: 1, firstname: 'bill' },
  2: { id: 2, firstname: 'bob' },
  3: { id: 3, firstname: 'ben' }
};

server.handle('getContact', function(id) {
  return new Promise(function(resolve, reject) {
    var record = database[id];
    if (!record) return reject(new Error('no contact found'));
    setTimeout(function() { resolve(record); }, 100);
  });
});

function testBroadcast(name) {
  server.broadcast(name, database[3]);
}

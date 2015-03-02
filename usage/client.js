
function debug() {
  console.log.apply(console, arguments);
}

var c1 = new Client('update');
debug(c1.name);

c1.checkForUpdate().then(function(hasUpdate) {
  debug('CheckForUpdate: ' + hasUpdate);
});

c1.addEventListener('updatefound', function(infos) {
  debug('onupdatefound: ' + JSON.stringify(infos));
});


var c2 = new Client('contacts');
c1.checkForUpdate().then(function(hasUpdate) {
  debug('CheckForUpdate: ' + hasUpdate);
});

debug(c2.name);

c2.getAll().then(function(contacts) {
  debug('GetAll: ' + contacts.length);
});

c2.addEventListener('contactschanged', function() {
  debug('oncontactschanged');
});

c2.getAll().then(function(contacts) {
  debug('GetAll: ' + contacts.length);
});


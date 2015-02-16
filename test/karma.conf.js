
module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'sinon-chai'],
    browsers: ['firefox_latest'],
    client: {
      captureConsole: true,
      mocha: { 'ui': 'tdd' }
    },
    basePath: '../',

    customLaunchers: {
      firefox_latest: {
        base: 'FirefoxNightly',
        prefs: { 'dom.webcomponents.enabled': true }
      }
    },

    files: [
      'client.js',
      'server.js',
      'test/lib/contract.js',
      {
        pattern: 'test/lib/worker.js',
        included: false
      },
      'test/test.js'
    ]
  });
};

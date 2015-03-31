
module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'sinon-chai'],
    browsers: ['firefox_latest'],
    basePath: '../',
    client: {
      captureConsole: true,
      mocha: { 'ui': 'tdd' }
    },

    customLaunchers: {
      firefox_latest: {
        base: 'FirefoxNightly',
        prefs: {
          'dom.webcomponents.enabled': true
        }
      }
    },

    files: [
      'threads.js',
      { pattern: 'test/lib/*', included: false },
      'test/*.test.js'
    ]
  });
};

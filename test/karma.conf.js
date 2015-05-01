
module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'sinon-chai'],
    browsers: ['FirefoxLatest'],
    basePath: '../',
    client: {
      captureConsole: true,
      mocha: { 'ui': 'tdd' }
    },

    customLaunchers: {
      FirefoxLatest: {
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

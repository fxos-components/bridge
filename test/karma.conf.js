
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
        prefs: { 'dom.webcomponents.enabled': true }
      }
    },

    files: [
      'bower_components/alameda/alameda.js',
      'test/setup.js',
      {
        pattern: 'threads.js',
        included: false
      },
      {
        pattern: 'lib/*',
        included: false
      },
      {
        pattern: 'test/lib/*',
        included: false
      },
      'test/client.test.js'
    ]
  });
};

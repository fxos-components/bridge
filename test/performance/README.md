## Runing Raptor performance tests

1. Setup [Raptor](https://developer.mozilla.org/en-US/Firefox_OS/Automated_testing/Raptor#Getting_Started)
2. Checkout both [gaia/apps](https://github.com/mozilla-b2g/gaia) and [bridge.js](https://github.com/gaia-components/bridge) repo locally
3. Symlink a test app (eg. `test/performance/ping-iframe`) into [gaia/apps](https://github.com/mozilla-b2g/gaia/tree/master/apps)
4. Toggle `debug` on relevant `bridge.js` modules
5. Build `bridge.js` (or `npm run watch`)
6. Build and flash Gaia to device running `make raptor` in `gaia/`.
7. Run raptor tests with  `raptor test coldlaunch --app ping-iframe --runs 20`

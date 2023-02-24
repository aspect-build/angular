import {customLaunchers} from '../../../browser-providers.conf';
import {Browser} from '../browser';

import {SaucelabsDaemon} from './saucelabs-daemon';

const parallelExecutions = 2;

const args = process.argv.slice(2)
const username = process.env.SAUCE_USERNAME;
const accessKey = process.env.SAUCE_ACCESS_KEY;
const tunnelIdentifier = process.env.SAUCE_TUNNEL_IDENTIFIER;
const buildName = process.env.CIRCLE_BUILD_NUM;

if (!username || !accessKey) {
  throw Error('Please set the `SAUCE_USERNAME` and `SAUCE_ACCESS_KEY` variables.');
}

if (!tunnelIdentifier) {
  throw Error('No tunnel set up. Please set the `SAUCE_TUNNEL_IDENTIFIER` variable.');
}

if (!buildName) {
  throw Error('No build name specified. Set the `CIRCLE_BUILD_NUM` variable.');
}

const browserInstances: Browser[] = [];
for (let i = 0; i < parallelExecutions; i++) {
  browserInstances.push(...Object.values(customLaunchers) as any);
}

const sauceConnect = args[0]  // First argument is the path to the sauce connect binary

    // Start the daemon and launch the given browser.
    const daemon = new SaucelabsDaemon(
        username, accessKey, process.env.CIRCLE_BUILD_NUM!, browserInstances, sauceConnect, {
          tunnelIdentifier,
        })

if (args.includes('--launch')) {
  daemon.launchBrowsers().catch((err) => {
    console.error(`Failed to launcher browsers: ${err}`);
    process.exit(1);
  })
}

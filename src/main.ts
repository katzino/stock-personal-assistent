// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor } from 'apify';

import { getTwitterPosts } from './twitter.js';
import { isTickerValid, normalizeTicker } from './common.js';
import { processPrompt } from './openai.js';
import { getGoogleNewsPosts } from './google.js';

// this is ESM project, and as such, it requires you to specify extensions in your relative imports
// read more about this here: https://nodejs.org/docs/latest-v18.x/api/esm.html#mandatory-file-extensions
// note that we need to use `.js` even when inside TS files
// import { router } from './routes.js';

interface Input {
    ticker: string;
    persona: string;
}

// The init() call configures the Actor for its environment. It's recommended to start every Actor with an init().
await Actor.init();
await Actor.charge({ eventName: 'init' });

// Structure of input is defined in input_schema.json
const input = await Actor.getInput<Input>();

if (!input) throw new Error('Input is missing!');
else if (!(await isTickerValid(input.ticker))) throw new Error('Stock ticker is invalid!');

const ticker = normalizeTicker(input.ticker);

const [google, twitter] = await Promise.all([
    getGoogleNewsPosts(ticker),
    getTwitterPosts(ticker),
]);

const response = await processPrompt(ticker, input.persona, { google, twitter });

if (response != null) {
    // Save headings to Dataset - a table-like storage.
    await Actor.pushData(response);
    await Actor.charge({ eventName: 'analysis' });
}

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit().
await Actor.exit();

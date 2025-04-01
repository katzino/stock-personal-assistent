// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor } from 'apify';

import { getTwitterPosts } from './twitter.js';
import { ERRORS, isTickerValid, normalizeTicker } from './common.js';
import { processPrompt } from './openai.js';
import { getGoogleNewsPosts } from './google.js';

// this is ESM project, and as such, it requires you to specify extensions in your relative imports
// read more about this here: https://nodejs.org/docs/latest-v18.x/api/esm.html#mandatory-file-extensions
// note that we need to use `.js` even when inside TS files
// import { router } from './routes.js';

interface Input {
    tickers: string[];
    persona: string;
}

// The init() call configures the Actor for its environment. It's recommended to start every Actor with an init().
await Actor.init();
await Actor.charge({ eventName: 'init' });

// Structure of input is defined in input_schema.json
const input = await Actor.getInput<Input>();

if (!input) throw new Error('Input is missing!');

for (const ticker of input.tickers) {
    if (await isTickerValid(ticker)) {
        const normalizedTicker = normalizeTicker(ticker);

        const [google, twitter] = await Promise.all([
            getGoogleNewsPosts(normalizedTicker),
            getTwitterPosts(normalizedTicker),
        ]);

        const response = await processPrompt(normalizedTicker, input.persona, { google, twitter });

        if (response != null) {
            // Save headings to Dataset - a table-like storage.
            await Actor.pushData(response);
            await Actor.charge({ eventName: 'analysis' });
        } else {
            console.warn(ERRORS.ANALYSIS_FAILED);
            await Actor.pushData({ error: ERRORS.ANALYSIS_FAILED });
        }
    } else {
        console.warn(ERRORS.INVALID_TICKER);
        await Actor.pushData({ error: ERRORS.INVALID_TICKER });
    }
}

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit().
await Actor.exit();

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

if (!input) throw new Error(ERRORS.INVALID_INPUT);

for (const inputTicker of input.tickers) {
    if (await isTickerValid(inputTicker)) {
        const ticker = normalizeTicker(inputTicker);

        const [google, twitter] = await Promise.all([
            getGoogleNewsPosts(ticker),
            getTwitterPosts(ticker),
        ]);

        const response = await processPrompt(ticker, input.persona, { google, twitter });

        if (response != null) {
            // Save headings to Dataset - a table-like storage.
            await Actor.pushData(response);
            await Actor.charge({ eventName: 'analysis' });
        } else {
            console.warn(ERRORS.ANALYSIS_FAILED);
            await Actor.pushData({ ticker, error: ERRORS.ANALYSIS_FAILED });
        }
    } else {
        const message = ERRORS.INVALID_TICKER.format(inputTicker);

        console.warn(message);
        await Actor.pushData({ error: message });
    }
}

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit().
await Actor.exit();

// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor } from 'apify';
import dayjs from 'dayjs';

import { getTwitterPosts } from './twitter.js';
import { normalizeTicker } from './common.js';
import { processPrompt } from './openai.js';

// this is ESM project, and as such, it requires you to specify extensions in your relative imports
// read more about this here: https://nodejs.org/docs/latest-v18.x/api/esm.html#mandatory-file-extensions
// note that we need to use `.js` even when inside TS files
// import { router } from './routes.js';

// The init() call configures the Actor for its environment. It's recommended to start every Actor with an init().
await Actor.init();

interface Input {
    ticker: string;
    persona: string;
    openai_api_key: string;
}
// Structure of input is defined in input_schema.json
const input = await Actor.getInput<Input>();
if (!input) throw new Error('Input is missing!');

const ticker = normalizeTicker(input.ticker);
const startDate = dayjs().add(-1, 'month').format('YYYY-MM-DD');

const [twitter] = await Promise.all([getTwitterPosts(ticker, startDate)]);

const response = await processPrompt(input.openai_api_key, ticker, input.persona, { twitter });

// Save headings to Dataset - a table-like storage.
await Actor.pushData(response);

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit().
await Actor.exit();

import { Actor } from 'apify';
import { reportResearchData, RESEARCH_DEPTH } from './common.js';

export type GoogleNewsPost = {
    title: string;
    snippet: string;
    source: string;
    date: string;
};

export async function getGoogleNewsPosts(ticker: string) {
    const run = await Actor.call('6vAxbA15R5J4uLKZ0', {
        cr: 'us',
        gl: 'us',
        hl: 'en',
        lr: 'lang_en',
        maxItems: RESEARCH_DEPTH,
        query: ticker,
        time_period: 'last_month',
    });

    if (run.status === 'SUCCEEDED') {
        await Actor.charge({ eventName: 'google' });
        const { items } = (await Actor.apifyClient.dataset(run.defaultDatasetId).listItems());
        await reportResearchData('google', run.defaultDatasetId);

        return normalizeGoogleNewsPost(items as GoogleNewsPost[]);
    }

    return null;
}

function normalizeGoogleNewsPost<T extends GoogleNewsPost>(items: T[]): GoogleNewsPost[] {
    return items.map((item) => ({
        title: item.title,
        snippet: item.snippet,
        source: item.source,
        date: item.date,
    }));
}

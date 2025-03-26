import { Actor } from 'apify';
import { reportResearchData, RESEARCH_DEPTH } from './common.js';

type GoogleNewsPostInput = {
    Title: string;
    Description: string;
    'Source Name': string;
    Date: string;
};

export type GoogleNewsPost = {
    title: string;
    description: string;
    source: string;
    date: string;
};

export async function getGoogleNewsPosts(ticker: string) {
    const run = await Actor.call('KIe0dFDnUt4mqQyVI', {
        keyword: ticker,
        maxitems: RESEARCH_DEPTH,
        time_filter: 'Less than a month 🗓️',
    });

    if (run.status === 'SUCCEEDED') {
        await Actor.charge({ eventName: 'google' });
        const { items } = (await Actor.apifyClient.dataset(run.defaultDatasetId).listItems());
        await reportResearchData('google', run.defaultDatasetId);

        return normalizeGoogleNewsPost(items as GoogleNewsPostInput[]);
    }

    return null;
}

function normalizeGoogleNewsPost(items: GoogleNewsPostInput[]): GoogleNewsPost[] {
    return items.map((item) => ({
        title: item.Title,
        description: item.Description,
        source: item['Source Name'],
        date: item.Date,
    }));
}

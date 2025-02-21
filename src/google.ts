import { Actor } from 'apify';
import { reportResearchData, RESEARCH_DEPTH } from './common.js';

export type GoogleNewsPost = {
    title: string;
    description: string;
    source: string;
    date: string;
};

export async function getGoogleNewsPosts(ticker: string) {
    const run = await Actor.call('fUkiYdRK6KtcuOgXt', {
        extract_description: true,
        extract_image: false,
        keyword: ticker,
        max_articles: RESEARCH_DEPTH,
        region_language: 'US:en',
        date: '30d',
        proxy_type: 'RESIDENTIAL',
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
        description: item.description,
        source: item.source,
        date: item.date,
    }));
}

import { Actor } from 'apify';
import { getResearchKeywords, reportResearchData, RESEARCH_DEPTH, startDate } from './common.js';
import type { Entity } from './common.js';

export type TwitterPost = {
    author?: {
        userName: string;
        name: string;
        isVerified: boolean;
        isBlueVerified: boolean;
        description: string;
        location: string;
        followers: number;
        createdAt: string;
    };
    bookmarkCount: number;
    createdAt: string;
    fullText: string;
    likeCount: number;
    quoteCount: number;
    replyCount: number;
    retweetCount: number;
    viewCount: number;
};

export async function getTwitterPosts(entity: Entity) {
    const run = await Actor.call('61RPP7dywgiy0JPD0', {
        includeSearchTerms: true,
        maxItems: RESEARCH_DEPTH,
        onlyImage: false,
        onlyQuote: false,
        onlyTwitterBlue: false,
        onlyVerifiedUsers: false,
        onlyVideo: false,
        searchTerms: getResearchKeywords(entity),
        sort: 'Top',
        start: startDate.format('YYYY-MM-DD'),
        tweetLanguage: 'en',
    });

    if (run.status === 'SUCCEEDED') {
        await Actor.charge({ eventName: 'twitter' });
        const { items } = (await Actor.apifyClient.dataset(run.defaultDatasetId).listItems());
        await reportResearchData(entity.ticker, 'twitter', run.defaultDatasetId);

        return normalizeTwitterPosts(items as TwitterPost[]);
    }

    return null;
}

function normalizeTwitterPosts<T extends TwitterPost>(items: T[]): TwitterPost[] {
    return items.map((item) => ({
        author: item.author != null ? {
            userName: item.author.userName,
            name: item.author.name,
            isVerified: item.author.isVerified,
            isBlueVerified: item.author.isBlueVerified,
            description: item.author.description,
            location: item.author.location,
            followers: item.author.followers,
            createdAt: item.author.createdAt,
        } : undefined,
        bookmarkCount: item.bookmarkCount,
        createdAt: item.createdAt,
        fullText: item.fullText,
        likeCount: item.likeCount,
        quoteCount: item.quoteCount,
        replyCount: item.replyCount,
        retweetCount: item.retweetCount,
        viewCount: item.viewCount,
    }));
}

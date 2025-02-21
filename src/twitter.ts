import { Actor } from 'apify';
import { reportResearchData, RESEARCH_DEPTH, startDate } from './common.js';

export type TwitterPost = {
    author: {
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

export async function getTwitterPosts(ticker: string) {
    const run = await Actor.call('61RPP7dywgiy0JPD0', {
        includeSearchTerms: true,
        maxItems: RESEARCH_DEPTH,
        onlyImage: false,
        onlyQuote: false,
        onlyTwitterBlue: false,
        onlyVerifiedUsers: false,
        onlyVideo: false,
        searchTerms: [ticker],
        sort: 'Top',
        start: startDate,
        tweetLanguage: 'en',
    });

    if (run.status === 'SUCCEEDED') {
        await Actor.charge({ eventName: 'twitter' });
        const { items } = (await Actor.apifyClient.dataset(run.defaultDatasetId).listItems());
        await reportResearchData('twitter', run.defaultDatasetId);

        return normalizeTwitterPosts(items as TwitterPost[]);
    }

    return null;
}

function normalizeTwitterPosts<T extends TwitterPost>(items: T[]): TwitterPost[] {
    return items.map((item) => ({
        author: {
            userName: item.author.userName,
            name: item.author.name,
            isVerified: item.author.isVerified,
            isBlueVerified: item.author.isBlueVerified,
            description: item.author.description,
            location: item.author.location,
            followers: item.author.followers,
            createdAt: item.author.createdAt,
        },
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

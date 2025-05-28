import { KeyValueStore } from 'apify';
import dayjs from 'dayjs';

export type Source = 'google' | 'twitter';
const SOURCES: Source[] = ['google', 'twitter'];

export function validateSources(input: string[]): Source[] {
    if (input.length === 0) {
        return SOURCES;
    }

    return input.filter((source) => SOURCES.includes(source as Source)) as Source[];
}

export type Input = {
    companies?: string[];
    cryptocurrencies?: string[];
    persona: string;
    sources?: Source[];
}

export const ERRORS = {
    INVALID_INPUT: 'Input is invalid!',
    INVALID_SOURCE: `No valid source provided! Valid sources are: ${SOURCES.join(', ')}.`,
    INVALID_TICKER: {
        format: (input: string) => `${input} is invalid stock ticker!`,
    },
    ANALYSIS_FAILED: 'Analysis failed!',
};

export const startDate = dayjs().add(-1, 'month').format('YYYY-MM-DD');

export type Entity = {
    type: 'company' | 'cryptocurrency';
    ticker: string;
    name: string | null;
    isOverflowing?: boolean;
}

type EntityResponse = {
    inputTicker: string;
    entity: Entity | null;
};

export async function validateEntities(companies: string[], cryptocurrencies: string[]): Promise<EntityResponse[]> {
    const entities: EntityResponse[] = [];

    for (const inputTicker of companies) {
        const symbol = stripTicker(inputTicker);
        const entity = await isCompanyStock(symbol);

        if (entity != null) {
            entity.isOverflowing = await isCryptocurrencyStock(symbol) != null;
        }

        entities.push({ inputTicker, entity });
    }

    for (const inputTicker of cryptocurrencies) {
        const symbol = stripTicker(inputTicker);
        const entity = await isCryptocurrencyStock(symbol);

        if (entity != null) {
            entity.isOverflowing = await isCompanyStock(symbol) != null;
        }

        entities.push({ inputTicker, entity });
    }

    return entities;
}

async function isCompanyStock(symbol: string): Promise<Entity | null> {
    const response = await fetch(`https://finance.yahoo.com/quote/${symbol}/`);

    if (response.status === 200 && !response.redirected) {
        const body = await response.text();
        const match = body.match(new RegExp(`<title>(.*?)\\(${symbol}\\)?.*<\\/title>`)) ?? [];
        const name = match[1] !== null ? normalizeCompanyName(match[1]) : null;
        const ticker = normalizeTicker(symbol);

        return {
            type: 'company',
            ticker,
            name: name?.toUpperCase() !== symbol ? name : null,
        };
    }

    return null;
}

const BLACKLISTED_COMPANY_PHRASES = [
    ' & co.',
    ' &amp; co.',
    ' & company',
    ' &amp; company',
    ' and co.',
    ' and company',
    ' co.',
    ' companies',
    ' corp.',
    ' corporation',
    ' enterprise',
    ' inc',
    ' inc.',
    ' incorporated',
    ' llc',
    ' ltd',
    ' plc',
    ' technologies',
    '.com',
];

const BLACKLISTED_COMPANY_PREFIXES = [
    'the ',
    'a ',
    'an ',
];

const COMPANY_TRANSFORMATIONS: Array<[RegExp, string]> = [
    [/&amp;/g, '&'], // Replace &amp; with &
];

function normalizeCompanyName(input: string) {
    try {
        let [output] = input.split(', ');

        for (const prefix of BLACKLISTED_COMPANY_PREFIXES) {
            if (output.toLowerCase().startsWith(prefix)) {
                output = output.slice(prefix.length);
            }
        }

        for (const phrase of BLACKLISTED_COMPANY_PHRASES) {
            const index = output.toLowerCase().indexOf(phrase);

            // it should look for an exact match of the phrase
            // it can either be at the end of the string or followed by a space
            if (index >= 0 && output.charAt(index + phrase.length).trim() === '') {
                output = output.slice(0, index);
            }
        }

        for (const [regex, replacement] of COMPANY_TRANSFORMATIONS) {
            output = output.replace(regex, replacement);
        }

        return output;
    } catch (error) {
        return input;
    }
}

async function isCryptocurrencyStock(symbol: string): Promise<Entity | null> {
    try {
        const response = await fetch(`https://api.kucoin.com/api/v1/currencies/${symbol}`);

        if (response.ok) {
            const { code, data } = await response.json();

            if (code === '200000') {
                const ticker = normalizeTicker(symbol);

                return {
                    type: 'cryptocurrency',
                    ticker,
                    name: data.fullName.toUpperCase() !== ticker ? data.fullName : null,
                };
            }
        }

        return null;
    } catch {
        return null;
    }
}

function stripTicker(input: string) {
    return input.startsWith('$') ? input.slice(1) : input;
}

function normalizeTicker(input: string) {
    return (input.startsWith('$') ? input : `$${input}`).toUpperCase();
}

const RESEARCH_STORE_ID = 'RESEARCH';
export const RESEARCH_DEPTH = 50;

export function getResearchKeywords(entity: Entity) {
    if (entity.name) {
        if (entity.isOverflowing) {
            return [entity.name];
        }

        return [entity.ticker, entity.name];
    }

    return [entity.ticker];
}

export async function reportResearchData(ticker: string, source: string, datasetId: string) {
    const value: Record<string, unknown> = await KeyValueStore.getValue(RESEARCH_STORE_ID) ?? {};

    return KeyValueStore.setValue(RESEARCH_STORE_ID, { ...value, [ticker]: { ...(typeof value[ticker] === 'object' && value[ticker]), [source]: `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=html` } });
}

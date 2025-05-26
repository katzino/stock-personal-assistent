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
    tickers: string[];
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
    ticker: string;
    name: string | null;
}

export async function validateEntity(input: string): Promise<Entity | null> {
    const symbol = stripTicker(input);

    const [company, crypto] = await Promise.all([
        isCompanyStock(symbol),
        isCryptoStock(symbol),
    ]);

    return company ?? crypto;
}

async function isCompanyStock(symbol: string): Promise<Entity | null> {
    const response = await fetch(`https://finance.yahoo.com/quote/${symbol}/`);

    if (response.status === 200 && !response.redirected) {
        const body = await response.text();
        const match = body.match(/"shortName\\":\\"(.*?)\\"/) ?? [];
        const name = match[1] !== null ? normalizeCompanyName(match[1]) : null;

        return {
            ticker: normalizeTicker(symbol),
            name: name !== symbol ? name : null,
        };
    }

    return null;
}

const BLACKLISTED_COMPANY_PHRASES = [
    ' & co.',
    ' & company',
    ' co.',
    ' company',
    ' corp.',
    ' corporation',
    ' company',
    ' companies',
    ' enterprise',
    ' global',
    ' group',
    ' holdings',
    ' inc',
    ' international',
    ' llc',
    ' ltd',
    ' partners',
    ' plc',
    ' technologies',
];

function normalizeCompanyName(input: string) {
    try {
        let output = input.split(', ')[0];

        for (const phrase of BLACKLISTED_COMPANY_PHRASES) {
            const index = input.toLowerCase().indexOf(phrase);

            if (index >= 0) {
                output = output.slice(0, index);
            }
        }

        return output;
    } catch (error) {
        return input;
    }
}

async function isCryptoStock(symbol: string): Promise<Entity | null> {
    try {
        const response = await fetch(`https://api.kucoin.com/api/v1/currencies/${symbol}`);

        if (response.ok) {
            const { code, data } = await response.json();

            if (code === '200000') {
                return {
                    ticker: normalizeTicker(symbol),
                    name: data.fullName !== symbol ? data.fullName : null,
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

export async function reportResearchData(ticker: string, source: string, datasetId: string) {
    const value: Record<string, unknown> = await KeyValueStore.getValue(RESEARCH_STORE_ID) ?? {};

    return KeyValueStore.setValue(RESEARCH_STORE_ID, { ...value, [ticker]: { ...(typeof value[ticker] === 'object' && value[ticker]), [source]: `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=html` } });
}

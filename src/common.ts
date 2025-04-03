import { KeyValueStore } from 'apify';
import dayjs from 'dayjs';

export const ERRORS = {
    INVALID_INPUT: 'Input is invalid!',
    INVALID_TICKER: {
        format: (input: string) => `${input} is invalid stock ticker!`,
    },
    ANALYSIS_FAILED: 'Analysis failed!',
};

export const startDate = dayjs().add(-1, 'month').format('YYYY-MM-DD');

export async function isTickerValid(input: string) {
    return (await Promise.all([
        isCompanyStock(input),
        isCryptoStock(input),
    ])).some(Boolean);
}

async function isCompanyStock(input: string) {
    const response = await fetch(`https://finance.yahoo.com/quote/${stripTicker(input)}/`);
    return response.status === 200 && !response.redirected;
}

async function isCryptoStock(input: string) {
    try {
        const response = await fetch(`https://api.kucoin.com/api/v1/currencies/${stripTicker(input)}`);

        if (response.ok) {
            const data = await response.json();
            return data.code === '200000';
        }

        return false;
    } catch {
        return false;
    }
}

function stripTicker(input: string) {
    return input.startsWith('$') ? input.slice(1) : input;
}

export function normalizeTicker(input: string) {
    return (input.startsWith('$') ? input : `$${input}`).toUpperCase();
}

const RESEARCH_STORE_ID = 'RESEARCH';
export const RESEARCH_DEPTH = 50;

export async function reportResearchData(ticker: string, source: string, datasetId: string) {
    const value: Record<string, unknown> = await KeyValueStore.getValue(RESEARCH_STORE_ID) ?? {};

    return KeyValueStore.setValue(RESEARCH_STORE_ID, { ...value, [ticker]: { ...(typeof value[ticker] === 'object' && value[ticker]), [source]: `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=html` } });
}

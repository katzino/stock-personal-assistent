import { KeyValueStore } from 'apify';
import dayjs from 'dayjs';

export const startDate = dayjs().add(-1, 'month').format('YYYY-MM-DD');

export async function isTickerValid(input: string) {
    const response = await fetch(`https://finance.yahoo.com/quote/${stripTicker(input)}/`);

    return response.status === 200 && !response.redirected;
}

function stripTicker(input: string) {
    return input.startsWith('$') ? input.slice(1) : input;
}

export function normalizeTicker(input: string) {
    return input.startsWith('$') ? input : `$${input}`;
}

const RESEARCH_STORE_ID = 'RESEARCH';
export const RESEARCH_DEPTH = 50;

export async function reportResearchData(key: string, datasetId: string) {
    const value = await KeyValueStore.getValue(RESEARCH_STORE_ID) ?? {};

    return KeyValueStore.setValue(RESEARCH_STORE_ID, { ...value, [key]: `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=html` });
}

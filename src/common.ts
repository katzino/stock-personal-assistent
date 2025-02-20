import dayjs from 'dayjs';

export const startDate = dayjs().add(-1, 'month').format('YYYY-MM-DD');

export async function isTickerValid(input: string) {
    const response = await fetch(`https://finance.yahoo.com/quote/${input}/`);

    return response.status === 200 && !response.redirected;
}

export function normalizeTicker(input: string) {
    return input.startsWith('$') ? input : `$${input}`;
}

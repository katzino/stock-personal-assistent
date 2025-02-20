import dayjs from 'dayjs';

export const startDate = dayjs().add(-1, 'month').format('YYYY-MM-DD');

export function normalizeTicker(input: string) {
    return input.startsWith('$') ? input : `$${input}`;
}

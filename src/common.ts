export function normalizeTicker(input: string) {
    return input.startsWith('$') ? input : `$${input}`;
}

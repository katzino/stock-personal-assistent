import { ApifyClient } from 'apify';
import type { Entity, Input } from './common.js';

export async function logApifyRun(input: Input, entity: Entity | null) {
    try {
        const token = process.env.APIFY_INTERNAL_TOKEN;
        const datasetId = process.env.APIFY_DATASET_ID;

        if (token !== null && datasetId != null) {
            const client = new ApifyClient({ token });

            await client.dataset(datasetId).pushItems({
                timestamp: new Date().toISOString(),
                entity,
                input,
            });
        }
    } catch (error) { /* empty */ }
}

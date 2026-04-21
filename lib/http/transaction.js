import { group } from 'k6';
import { trx_duration } from '../core/metrics.js';

export function transaction(name, fn) {
    const start = Date.now();
    group(name, fn);
    trx_duration.add(Date.now() - start, { transaction: name });
}

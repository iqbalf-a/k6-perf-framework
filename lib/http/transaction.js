import { group } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { trx_duration } from '../core/metrics.js';
import { getSession } from '../core/session.js';

const trx_count      = new Counter('trx_count');
const trx_count_pass = new Counter('trx_count_pass');
const trx_count_fail = new Counter('trx_count_fail');
const trx_duration_pass = new Trend('trx_duration_pass');
const trx_duration_fail = new Trend('trx_duration_fail');

class TransactionAbortError extends Error {}
export class IterationAbortError extends Error {}

export function transaction(name, fn) {
    const session = getSession();
    const channel = session.channel || 'default';
    const start = Date.now();

    let hasSuccess = true;
    const prevCallback = session.__trx_fail_callback;
    session.__trx_fail_callback = () => {
        hasSuccess = false;
        throw new TransactionAbortError();
    };

    try {
        group(channel, fn);
    } catch (e) {
        if (!(e instanceof TransactionAbortError)) throw e;
    } finally {
        session.__trx_fail_callback = prevCallback;
    }

    const duration = Date.now() - start;
    const tags = { transaction: name, group: `::${channel}` };

    trx_duration.add(duration, tags);
    trx_count.add(1, tags);

    if (hasSuccess) {
        trx_count_pass.add(1, tags);
        trx_duration_pass.add(duration, tags);
    } else {
        trx_count_fail.add(1, tags);
        trx_duration_fail.add(duration, tags);
        throw new IterationAbortError();
    }
}

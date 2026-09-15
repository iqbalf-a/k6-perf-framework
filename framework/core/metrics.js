import { Trend } from 'k6/metrics';

export const api_duration = new Trend("api_duration");
export const trx_duration = new Trend("trx_duration");
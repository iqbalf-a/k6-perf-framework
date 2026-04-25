// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Transaksi Login
// Salin dan sesuaikan dengan mekanisme auth aplikasi target.
// Contoh pemanggilan: Login('BP001_01_Login', data)
// → api name: '001_01_01_/auth/login'
// ─────────────────────────────────────────────────────────────────────────────
import { transaction } from '../../../../lib/http/transaction.js';
import { api }         from '../../../../lib/http/api.js';
import { parameter } from '../parameter.config.js';

export function Login(tx, data) {
    const prefix = tx.match(/^BP(\d+_\d+)/)?.[1] ?? tx;
    transaction(tx, () => {
        api({
            name       : `${prefix}_01_/auth/login`,
            url        : `${parameter.BASE_URL}/auth/login`,
            method     : 'POST',
            body       : JSON.stringify({ username: data.userName, password: data.password }),
            extract    : [
                { name: 'accessToken', type: 'json', path: 'data.accessToken' },
            ],
            transaction: tx,
        });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Transaksi Login
// Salin dan sesuaikan dengan mekanisme auth aplikasi target.
// Contoh pemanggilan: Login('BP001_01_Login', user)
// → api name: '001_01_01_/auth/login'
// ─────────────────────────────────────────────────────────────────────────────
import { transaction } from '../../../../lib/http/transaction.js';
import { api }         from '../../../../lib/http/api.js';
import { BASE_URL }    from '../channel.config.js';

export function Login(tx, user) {
    const prefix = tx.match(/^BP(\d+_\d+)/)?.[1] ?? tx;
    transaction(tx, () => {
        api({
            name       : `${prefix}_01_/auth/login`,
            url        : `${BASE_URL}/auth/login`,
            method     : 'POST',
            body       : JSON.stringify({ username: user.userName, password: user.password }),
            extract    : [
                { name: 'accessToken', type: 'json', path: 'data.accessToken' },
            ],
            transaction: tx,
        });
    });
}

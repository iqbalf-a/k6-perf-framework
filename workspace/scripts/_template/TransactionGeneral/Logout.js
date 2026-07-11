// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Transaksi Logout
// Salin dan sesuaikan dengan mekanisme logout aplikasi target.
// Contoh pemanggilan: Logout('BP001_99_Logout', data)
// ─────────────────────────────────────────────────────────────────────────────
import { transaction, api } from '../../../../framework/index.js';
import { parameter } from '../parameter.config.js';

export function Logout(tx, data) {
    const prefix = tx.match(/^BP(\d+_\d+)/)?.[1] ?? tx;
    transaction(tx, () => {
        api({
            name       : `${prefix}_01_/auth/logout`,
            url        : `${parameter.BASE_URL}/auth/logout`,
            method     : 'POST',
            body       : JSON.stringify({}),
            transaction: tx,
        });
    });
}

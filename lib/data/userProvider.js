import { getVuUserIndex } from '../core/vuContext.js';

export function getUser(users, bp) {
    if (!users || users.length === 0) throw new Error(`[${bp}] users kosong / belum load`);

    const index = getVuUserIndex(users.length);
    const user  = users[index];

    if (!user) throw new Error(`[${bp}] user tidak ditemukan! VU=${__VU} idx=${index} total=${users.length}`);

    console.log(`[${bp}] VU=${__VU} idx=${index} user=${user.userName}`);
    return user;
}

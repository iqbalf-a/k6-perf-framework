// Per-VU batch queue — safe karena k6 single-threaded per VU
// api() membaca ini saat dipanggil: jika active, enqueue bukan execute
export const batchState = { active: false, queue: [] };

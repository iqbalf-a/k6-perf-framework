# Auth

## Pilih Sesuai Kebutuhan

| Metode | Helper | Contoh |
|--------|--------|--------|
| Basic Auth | `lib/auth/basicAuth.js` | `addAutoHeader('Authorization', \`Basic ${basicAuth(user, pass)}\`)` |
| Bearer / Token | `addAutoHeader` | `addAutoHeader('Authorization', \`Bearer ${session.token}\`)` |
| API Key | `addAutoHeader` | `addAutoHeader('X-Api-Key', key)` |
| Form / JSON body | — | Kirim via `body` di `api()` |

## addAutoHeader

`addAutoHeader(key, value)` menyuntikkan header ke **semua request** setelah baris tersebut dipanggil.

```js
// Set setelah login
addAutoHeader('Authorization', `Bearer ${session.token}`)
addAutoHeader('X-Company-Id',  data.companyId)

// Hapus satu header
deleteAutoHeader('Authorization')

// Hapus semua (reset ke kondisi awal)
clearAutoHeaders()
```

`clearAutoHeaders()` dipanggil otomatis oleh `runScript` di akhir setiap iterasi — iterasi berikutnya selalu mulai dari header bersih.

## Contoh: Login → Pakai Token

```js
tx = 'BP001_01_Login';
transaction(tx, () => {
    api({
        name       : '01_01_/api/login',
        url        : `${parameter.BASE_URL}/api/login`,
        method     : 'POST',
        body       : JSON.stringify({ username: data.username, password: data.password }),
        transaction: tx,
        extract    : [
            { name: 'token', type: 'jsonpath', path: '$.data.token' },
        ],
    });
});

// Token dari Login tersedia di session.token
addAutoHeader('Authorization', `Bearer ${session.token}`)

tx = 'BP001_02_GetProfile';
transaction(tx, () => {
    api({
        name       : '02_01_/api/profile',
        url        : `${parameter.BASE_URL}/api/profile`,
        transaction: tx,
    });
});
```

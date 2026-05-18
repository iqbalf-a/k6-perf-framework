# Extract & Batch

## Extract — Ambil Nilai dari Response

Tambahkan `extract` di dalam `api()` untuk menyimpan nilai ke `session`:

```js
api({
    name       : '01_01_/api/login',
    url        : `${parameter.BASE_URL}/api/login`,
    method     : 'POST',
    transaction: tx,
    extract    : [
        { name: 'accessToken', type: 'jsonpath', path: '$.data.accessToken' },
        { name: 'sessionId',   type: 'header',   header: 'X-Session-Id'     },
        { name: 'csrf',        type: 'regex',     pattern: '"csrf":"(.*?)"'  },
    ],
});
// session.accessToken, session.sessionId, session.csrf tersedia setelah ini
```

### Type

| `type` | Field wajib | Keterangan |
|--------|-------------|------------|
| `jsonpath` | `path` | JSONPath Plus: `$.data.token` |
| `header` | `header` | Nama response header |
| `regex` | `pattern` | Regex — capture group pertama |

### JSONPath Syntax

```js
extract: [
    { name: 'token',      type: 'jsonpath', path: '$.data.token'                              },
    { name: 'userId',     type: 'jsonpath', path: '$.data.user.id'                            },
    { name: 'lastItem',   type: 'jsonpath', path: '$.data.items[-1].name'                     },

    // all: true → ordinal (session.itemId_1, _2, ..., _count + session.itemId = array)
    { name: 'itemId',     type: 'jsonpath', path: '$.data.items[*].id',          all: true    },
    { name: 'activeId',   type: 'jsonpath', path: '$.data.items[?(@.status=="active")].id', all: true },
]
```

| Syntax | Contoh | Keterangan |
|--------|--------|------------|
| `$.field` | `$.data.token` | Field dari root |
| `$.a.b.c` | `$.data.user.id` | Path bersarang |
| `[*]` | `$.data.items[*].id` | Semua item array |
| `[n]` / `[-n]` | `[-1]` | Index ke-n / dari belakang |
| `[start:end]` | `[0:3]` | Slice |
| `[?(@.f==v)]` | `[?(@.status=="active")]` | Filter kondisi |
| `$..field` | `$..token` | Recursive search |

### notFound

| Nilai | Perilaku | Kapan dipakai |
|-------|----------|---------------|
| `'warning'` | `console.warn` lalu lanjut **(default)** | Kebanyakan kasus |
| `'error'` | `console.error` lalu lanjut | Field wajib |
| `'ignore'` | Silent | Pagination / field boleh kosong |

```js
extract: [
    { name: 'token',     type: 'jsonpath', path: '$.data.token'                           },
    { name: 'reqId',     type: 'jsonpath', path: '$.requestId',  notFound: 'error'        },
    { name: 'nextPage',  type: 'jsonpath', path: '$.nextToken',  notFound: 'ignore'       },
]
```

---

## Batch — Request Paralel

`batch()` mengumpulkan semua `api()` di dalam callback, lalu mengirimnya serentak via `http.batch()` k6.

```js
import { batch } from '../../../../lib/http/batch.js';

tx = 'BPxxx_03_LoadAssets';
transaction(tx, () => {
    batch(tx, () => {
        api({ name: '03_01_/api/config',
              url:  `${parameter.BASE_URL}/api/config` });

        api({ name:    '03_02_/api/profile',
              url:     `${parameter.BASE_URL}/api/profile`,
              extract: [{ name: 'profileId', type: 'jsonpath', path: '$.data.id' }] });

        api({ name:   '03_03_/api/menu',
              url:    `${parameter.BASE_URL}/api/menu`,
              method: 'POST',
              body:   JSON.stringify({ type: 'main' }) });
    });
});
```

- `api()` di dalam `batch()` mendukung semua field yang sama: `name`, `url`, `method`, `body`, `headers`, `extract`.
- Parameter `transaction` tidak perlu di-pass per `api()` — sudah di-pass ke `batch()` sebagai argumen pertama.
- `check`, `extract`, dan `api_duration` diproses per item setelah semua response kembali.

::: warning
Gunakan `batch()` hanya jika request memang perlu dikirim serentak (load aset paralel). Untuk sequential flow, gunakan beberapa `api()` biasa dalam satu `transaction()`.
:::

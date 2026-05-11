import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'k6 Perf Framework',
  description: 'Framework k6 untuk load testing multi-BP (Business Process)',
  base: '/docs/',
  outDir: '../k6-dashboard/public/docs',

  themeConfig: {
    nav: [
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Framework Guide', link: '/framework/tambah-bp' },
      { text: 'Observability', link: '/observability/k6-dashboard' },
      { text: 'k6 Dashboard', link: 'http://localhost:3000', target: '_blank' },
    ],

    sidebar: [
      {
        text: 'Pengenalan',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Cara Run',        link: '/cara-run' },
          { text: 'Struktur Folder', link: '/struktur-folder' },
        ],
      },
      {
        text: 'Framework Guide',
        items: [
          { text: 'Tambah BP Baru',       link: '/framework/tambah-bp' },
          { text: 'Tambah Project Baru',  link: '/framework/tambah-project' },
          { text: 'Extract & Batch',      link: '/framework/extract-batch' },
          { text: 'Sumber Variabel',      link: '/framework/variable-sources' },
          { text: 'Auth',                 link: '/framework/auth' },
          { text: 'Transaksi Gagal',      link: '/framework/transaction-fail' },
        ],
      },
      {
        text: 'Metrics & Tags',
        items: [
          { text: 'Custom Metrics', link: '/metrics' },
        ],
      },
      {
        text: 'Observability',
        items: [
          { text: 'k6 Dashboard', link: '/observability/k6-dashboard' },
          { text: 'Grafana Stack', link: '/observability/grafana' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/iqbalf-a/k6-perf-framework' },
    ],

    footer: {
      message: 'k6 Perf Framework',
      copyright: 'Moh. Iqbal Firman Ardiansyah',
    },

    search: { provider: 'local' },
  },
})

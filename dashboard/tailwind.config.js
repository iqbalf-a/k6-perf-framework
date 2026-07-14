/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:          'var(--bg)',
        sidebar:     'var(--sidebar)',
        surface:     'var(--surface)',
        'surface-2': 'var(--surface-2)',
        code:        'var(--code)',
        border:      'var(--border)',
        'border-soft': 'var(--border-soft)',
        text:        'var(--text)',
        head:        'var(--head)',
        muted:       'var(--muted)',
        faint:       'var(--faint)',
        accent:      'var(--accent)',
        'accent-2':  'var(--accent-2)',
        'accent-soft': 'var(--accent-soft)',
        'accent-line': 'var(--accent-line)',
        good:        '#3dd68c',
        bad:         '#f87171',
        cyan:        '#22d3ee',
        warn:        '#fb923c',
        purple:      '#a78bfa',
      },
      fontFamily: {
        sans: ['"Geist Sans"', '"Segoe UI Variable Text"', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Geist Mono"', '"Cascadia Code"', '"JetBrains Mono"', '"Consolas"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'accent-grad': 'linear-gradient(135deg, var(--accent), var(--accent-2))',
      },
      maxHeight: {
        'tw-table': '240px',
        'log': '58vh',
      },
    },
  },
  plugins: [],
};

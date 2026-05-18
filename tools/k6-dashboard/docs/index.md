# k6 Perf Framework

Framework k6 untuk load testing multi-BP (Business Process).

## Fitur Utama

| Fitur | Keterangan |
|-------|------------|
| **Multi-BP & Multi-Channel** | Satu scenario menjalankan beberapa Business Process dengan distribusi VU otomatis |
| **Metrics Siap Pakai** | `trx_duration`, `trx_count_pass/fail`, `api_duration` — terekam otomatis dengan tag lengkap |
| **k6 Dashboard** | Visualisasi CSV hasil k6 tanpa Prometheus — parse file 1.8 GB dalam ~30 detik |
| **Extract & Batch** | Ekstrak nilai dari response ke session, kirim request paralel tanpa boilerplate |

## Pengenalan

- [Getting Started](getting-started) — setup, prerequisites, struktur project
- [Cara Run](cara-run) — parameter `run.ps1` dan contoh penggunaan
- [Struktur Folder](struktur-folder) — layout direktori lengkap

## Framework Guide

- [Tambah BP](framework/tambah-bp) — membuat Business Process baru
- [Tambah Project](framework/tambah-project) — setup project baru dari template
- [Extract & Batch](framework/extract-batch) — ekstrak data response dan request paralel
- [Variable Sources](framework/variable-sources) — sumber data: CSV, session, parameter
- [Auth](framework/auth) — pola autentikasi token
- [Transaksi Gagal](framework/transaction-fail) — behavior otomatis saat API error

## Observability

- [k6 Dashboard](observability/k6-dashboard) — setup dan fitur dashboard CSV
- [Grafana Stack](observability/grafana) — integrasi Prometheus + Loki + Grafana

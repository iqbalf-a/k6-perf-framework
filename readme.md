# k6-perf-framework

Framework k6 untuk load testing multi-BP (Business Process).

> Dibuat oleh **Moh. Iqbal Firman Ardiansyah**

---

## Quickstart

```powershell
# 1. Letakkan k6.exe satu level di atas folder repo
#    k6-portable/k6.exe
#    k6-portable/k6-perf-framework/  ← di sini

# 2. Install type definitions (IDE autocomplete)
npm install

# 3. Jalankan scenario template
.\run.ps1
```

## Dokumentasi

Jalankan k6 Dashboard, lalu buka docs di browser:

```powershell
cd tools\k6-dashboard
npm install   # sekali saja
node server.js
```

Buka **http://localhost:3000/docs**

> Atau baca source Markdown langsung di [`tools/docs/`](tools/docs/).

## Cara Run Cepat

```powershell
.\run.ps1 -mode loadtest -scenario scenario_myproject -csv
```

| Parameter | Default | Keterangan |
|-----------|---------|------------|
| `-mode` | `testhit` | `testhit` / `loadtest` / `stress` / `spike` |
| `-scenario` | `scenario_template` | Nama file di `src/scenario/` |
| `-vus` | `1` | Jumlah VU |
| `-iterations` | `1` | Jumlah iterasi (mode testhit) |
| `-debug` | off | `--http-debug=full` |
| `-dashboard` | off | k6 web dashboard (`localhost:5665`) |
| `-csv` | off | Export hasil ke `results/<testid>.csv` |

# Nameday Calendars

Country-aware nameday data for PeopleVault. Each file is a CSV with the format:

```
month,day,names
1,1,Nový rok;Karina;Tatiana
1,2,Karina;Patrícia
```

- `month` — 1–12
- `day` — 1–31
- `names` — semicolon-separated list of names (UTF-8, diacritics preserved)

## Supported countries

| Code | Country | File |
|---|---|---|
| `cz` | Czech Republic | `cz.csv` |
| `sk` | Slovakia | `sk.csv` |
| `pl` | Poland | `pl.csv` |
| `hu` | Hungary | `hu.csv` |
| `at` | Austria | `at.csv` |
| `de` | Germany | `de.csv` |

## Adding a new country

1. Create a new CSV file named `<iso-code>.csv` (lowercase ISO 3166-1 alpha-2).
2. Include a header row: `month,day,names`.
3. Cover every day from January 1 through December 31.
4. For February 29 (leap day), include row `2,29` — repeat the February 28 entry if the calendar has no dedicated leap-day name.
5. Use semicolons to separate multiple names on the same day.
6. Quote fields containing commas (rare).

The backend loads these at startup and serves them via the `/namedays/{country}` API.

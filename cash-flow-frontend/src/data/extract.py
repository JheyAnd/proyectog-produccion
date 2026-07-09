import pandas as pd
import json

file_path = r'C:\Users\EQUIPO\Downloads\Control Patio Sur.xlsx'
df = pd.read_excel(file_path, sheet_name='Cortes Semanales', header=None)

cols = {'S-41': 24, 'S-42': 23, 'S-43': 22}

results = {
    'S-41': {'weekNum': 41, 'label': 'S-41', 'dateLabel': '01 Abr', 'values': {}},
    'S-42': {'weekNum': 42, 'label': 'S-42', 'dateLabel': '08 Abr', 'values': {}},
    'S-43': {'weekNum': 43, 'label': 'S-43', 'dateLabel': '15 Abr', 'values': {}},
    'S-44': {'weekNum': 44, 'label': 'S-44', 'dateLabel': '22 Abr', 'values': {}}
}

for i in range(4, len(df)):
    wbs = str(df.iloc[i, 1]).strip()
    if wbs == 'nan' or not wbs: continue

    for label, col_idx in cols.items():
        val = df.iloc[i, col_idx]
        if pd.notna(val) and isinstance(val, (int, float)):
             pct = round(val * 100, 4)
             results[label]['values'][wbs] = pct

    w8 = df.iloc[i, 8]
    w10 = df.iloc[i, 10]
    if pd.notna(w8) and pd.notna(w10) and isinstance(w8, (int, float)) and isinstance(w10, (int, float)):
        if w8 > 0:
            pct = round((w10 / w8) * 100, 4)
            results['S-44']['values'][wbs] = pct
        elif w10 > 0:
            results['S-44']['values'][wbs] = 100.0
            
arr = [results['S-41'], results['S-42'], results['S-43'], results['S-44']]
with open('src/data/updated_weeks_v2.json', 'w', encoding='utf-8') as f:
    json.dump(arr, f, indent=2)

weights = {}
for i in range(4, len(df)):
    wbs = str(df.iloc[i, 1]).strip()
    w8 = df.iloc[i, 8]
    if pd.notna(w8) and isinstance(w8, (int, float)) and wbs != 'nan':
        weights[wbs] = w8

for week in arr:
    total_real = 0
    for wbs, pct in week['values'].items():
        if wbs in weights:
            total_real += (pct / 100.0) * weights[wbs]
    print(f" {week['label']}: Web Total = {total_real*100:.3f}% ")

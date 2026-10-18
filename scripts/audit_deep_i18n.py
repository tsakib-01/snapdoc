# -*- coding: utf-8 -*-
import os
import re
import json

def scan_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    is_client = 'use client' in content
    uses_t = 'useLanguage' in content or 't(' in content

    # Find raw text in JSX: >Some text<
    raw_texts = []
    # match > ... < where ... has at least 3 letters and is not purely whitespace or curly braces
    matches = re.findall(r'>([^<>{}\n]+)<', content)
    for m in matches:
        text = m.strip()
        if len(text) > 2 and re.search(r'[a-zA-Z]{2,}', text):
            # Exclude known non-translatable tokens
            if text not in ['Snap', 'Doc', 'SnapDoc', 'PDF', 'JPG', 'PNG', 'WebP', 'MB', 'KB', 'px', 'OK', 'ESC', 'px', 'A4', 'A3', 'A5', 'LTR', 'RTL', 'RGB', 'HEX', 'DPI', 'OCR']:
                raw_texts.append(text)

    # Find raw attributes: placeholder="...", title="...", alt="...", aria-label="..."
    attr_matches = re.findall(r'(placeholder|title|aria-label)=["\']([^"\']+)["\']', content)
    for attr, val in attr_matches:
        v = val.strip()
        if len(v) > 2 and re.search(r'[a-zA-Z]{2,}', v):
            if not v.startswith('{') and v not in ['SnapDoc Logo', 'logo', 'icon', 'Close modal']:
                raw_texts.append(f'{attr}="{v}"')

    # Find alerts, confirm, toast strings
    call_matches = re.findall(r'(?:alert|confirm|prompt|toast\.(?:error|success|info|warn))\(\s*["\']([^"\']+)["\']', content)
    for msg in call_matches:
        if len(msg.strip()) > 2 and re.search(r'[a-zA-Z]{2,}', msg):
            raw_texts.append(f'alert/toast: "{msg.strip()}"')

    return is_client, uses_t, raw_texts

results = {}

for folder in ['app', 'components']:
    for root, dirs, files in os.walk(folder):
        for f in files:
            if f.endswith('.tsx'):
                path = os.path.join(root, f).replace('\\', '/')
                is_client, uses_t, raw = scan_file(path)
                if raw:
                    results[path] = {
                        'is_client': is_client,
                        'uses_t': uses_t,
                        'snippets': raw
                    }

print(f"Total files with hardcoded or untranslated snippets: {len(results)}")
for path, data in sorted(results.items(), key=lambda x: len(x[1]['snippets']), reverse=True):
    print(f"\n{path} (uses_t: {data['uses_t']}, total: {len(data['snippets'])}):")
    for s in data['snippets'][:8]:
        print(f"   • {s}")
    if len(data['snippets']) > 8:
        print(f"   ... and {len(data['snippets']) - 8} more")

with open('scripts/deep_audit_results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("\nAudit written to scripts/deep_audit_results.json")

# -*- coding: utf-8 -*-
"""Descobre em que página do PDF cada seção começa."""
import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader


def norm(s):
    return re.sub(r"\s+", " ", s).strip()


pdf_path, md_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
md = Path(md_path).read_text(encoding="utf-8")
sections = [
    (int(m.group(1)), m.group(2))
    for m in re.finditer(r"^## (\d+)\. (.+)$", md, re.M)
]

reader = PdfReader(pdf_path)
pages = [norm(p.extract_text() or "") for p in reader.pages]

result, missing = {}, []
for num, title in sections:
    key = norm(f"{num}. {title}")
    found = None
    for idx in range(2, len(pages)):
        if key in pages[idx][:600]:
            found = idx + 1
            break
    if found is None:
        key = norm(f"{num}. {title[:16]}")
        for idx in range(2, len(pages)):
            if key in pages[idx][:600]:
                found = idx + 1
                break
    result[str(num)] = found
    if found is None:
        missing.append(num)

Path(out_path).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(result, ensure_ascii=False))
print(f"paginas no pdf: {len(pages)}")
if missing:
    print("FALTANDO:", missing)
    sys.exit(2)

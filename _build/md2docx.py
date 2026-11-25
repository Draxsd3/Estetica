# -*- coding: utf-8 -*-
"""Converte o plano em Markdown para um DOCX formatado."""
import json
import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2])

INK = RGBColor(0x1A, 0x22, 0x20)
ACCENT = RGBColor(0x1F, 0x4E, 0x43)
SAND = RGBColor(0xB0, 0x82, 0x55)
MUTED = RGBColor(0x5E, 0x6A, 0x66)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

ACCENT_HEX = "1F4E43"
SAND_HEX = "B08255"
ZEBRA_HEX = "F5F7F6"
BORDER_HEX = "D6DDDA"
CODE_FILL = "F1F4F2"

CONTENT_W = 16.6  # cm


def cell_shade(cell, hexcolor):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hexcolor)
    tc_pr.append(shd)


def para_border(p, edge="bottom", color=ACCENT_HEX, size=8, space=4):
    p_pr = p._p.get_or_add_pPr()
    pbdr = p_pr.find(qn("w:pBdr"))
    if pbdr is None:
        pbdr = OxmlElement("w:pBdr")
        p_pr.append(pbdr)
    el = OxmlElement(f"w:{edge}")
    el.set(qn("w:val"), "single")
    el.set(qn("w:sz"), str(size))
    el.set(qn("w:space"), str(space))
    el.set(qn("w:color"), color)
    pbdr.append(el)


def para_shade(p, hexcolor):
    p_pr = p._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hexcolor)
    p_pr.append(shd)


def add_field(paragraph, instr, placeholder="1"):
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), instr)
    r = OxmlElement("w:r")
    rpr = OxmlElement("w:rPr")
    sz = OxmlElement("w:sz")
    sz.set(qn("w:val"), "16")
    rpr.append(sz)
    r.append(rpr)
    t = OxmlElement("w:t")
    t.text = placeholder
    r.append(t)
    fld.append(r)
    paragraph._p.append(fld)


def strip_md(text):
    return re.sub(r"\*\*|`", "", text)


def add_runs(p, text, size, color=None, bold=False, italic=False, mono_color=None):
    parts = re.split(r"(\*\*.+?\*\*|`[^`]+`)", text)
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**") and len(part) > 4:
            r = p.add_run(part[2:-2])
            r.bold = True
            r.font.size = Pt(size)
            if color:
                r.font.color.rgb = color
        elif part.startswith("`") and part.endswith("`") and len(part) > 2:
            r = p.add_run(part[1:-1])
            r.font.name = "Consolas"
            r.font.size = Pt(size - 1)
            r.font.color.rgb = mono_color or SAND
        else:
            r = p.add_run(part)
            r.bold = bold
            r.italic = italic
            r.font.size = Pt(size)
            if color:
                r.font.color.rgb = color


def table_setup(table, widths):
    tbl = table._tbl
    tbl_pr = tbl.tblPr
    layout = OxmlElement("w:tblLayout")
    layout.set(qn("w:type"), "fixed")
    tbl_pr.append(layout)
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), BORDER_HEX)
        borders.append(el)
    tbl_pr.append(borders)
    mar = OxmlElement("w:tblCellMar")
    for tag, val in (("top", 50), ("left", 90), ("bottom", 50), ("right", 90)):
        el = OxmlElement(f"w:{tag}")
        el.set(qn("w:w"), str(val))
        el.set(qn("w:type"), "dxa")
        mar.append(el)
    tbl_pr.append(mar)
    for idx, w in enumerate(widths):
        table.columns[idx].width = Cm(w)


def compute_widths(rows, ncols):
    """Larguras que respeitam a maior palavra de cada coluna."""
    floors, weights = [], []
    for c in range(ncols):
        cells = [strip_md(r[c]) for r in rows]
        longest = max(len(x) for x in cells)
        longest_word = max((len(w) for x in cells for w in x.split()), default=1)
        weights.append(max(5, min(45, longest)))
        floors.append(min(4.6, max(1.5, longest_word * 0.19 + 0.45)))
    if sum(floors) >= CONTENT_W:
        factor = CONTENT_W / sum(floors)
        return [f * factor for f in floors]
    remaining = CONTENT_W - sum(floors)
    total_w = sum(weights)
    return [floors[i] + remaining * weights[i] / total_w for i in range(ncols)]


doc = Document()

sec = doc.sections[0]
sec.page_width = Cm(21.0)
sec.page_height = Cm(29.7)
sec.top_margin = Cm(2.2)
sec.bottom_margin = Cm(2.0)
sec.left_margin = Cm(2.2)
sec.right_margin = Cm(2.2)
sec.header_distance = Cm(1.1)
sec.footer_distance = Cm(0.9)
sec.different_first_page_header_footer = True

styles = doc.styles
normal = styles["Normal"]
normal.font.name = "Calibri"
normal.font.size = Pt(10.5)
normal.font.color.rgb = INK
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.15
rpr = normal.element.get_or_add_rPr()
rfonts = rpr.get_or_add_rFonts()
rfonts.set(qn("w:eastAsia"), "Calibri")
rfonts.set(qn("w:cs"), "Calibri")

for name, size, before, after in (
    ("Heading 1", 20, 0, 10),
    ("Heading 2", 16, 0, 10),
    ("Heading 3", 12, 12, 4),
):
    st = styles[name]
    st.font.name = "Calibri"
    st.font.size = Pt(size)
    st.font.bold = True
    st.font.italic = False
    st.font.color.rgb = ACCENT if name != "Heading 3" else INK
    st.paragraph_format.space_before = Pt(before)
    st.paragraph_format.space_after = Pt(after)
    st.paragraph_format.keep_with_next = True
    st.paragraph_format.line_spacing = 1.0
    st.element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), "Calibri")

toc_style = styles.add_style("TOC 1", WD_STYLE_TYPE.PARAGRAPH)
toc_style.base_style = styles["Normal"]
toc_style.font.name = "Calibri"
toc_style.font.size = Pt(10.5)
toc_style.font.color.rgb = INK
toc_style.paragraph_format.space_before = Pt(2)
toc_style.paragraph_format.space_after = Pt(5)
toc_style.paragraph_format.line_spacing = 1.0
toc_style.paragraph_format.tab_stops.add_tab_stop(
    Cm(CONTENT_W), WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS
)

hdr = sec.header.paragraphs[0]
hdr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
hr = hdr.add_run("PLANO DIRETOR  ·  PLATAFORMA DE GESTÃO PARA CLÍNICA DE ESTÉTICA")
hr.font.size = Pt(7)
hr.font.color.rgb = MUTED
hr.font.name = "Calibri"

ftr = sec.footer.paragraphs[0]
ftr.style = styles["Normal"]
ftr.paragraph_format.tab_stops.clear_all()
ftr.paragraph_format.tab_stops.add_tab_stop(Cm(CONTENT_W), WD_TAB_ALIGNMENT.RIGHT)
fr = ftr.add_run("Versão 1.0  ·  23/11/2026\t")
fr.font.size = Pt(7.5)
fr.font.color.rgb = MUTED
pr = ftr.add_run("Página ")
pr.font.size = Pt(7.5)
pr.font.color.rgb = MUTED
add_field(ftr, "PAGE")
de = ftr.add_run(" de ")
de.font.size = Pt(7.5)
de.font.color.rgb = MUTED
add_field(ftr, "NUMPAGES")

# capa
top = doc.add_paragraph()
top.paragraph_format.space_before = Pt(90)
top.paragraph_format.space_after = Pt(0)
r = top.add_run("PLANO DIRETOR   ·   VERSÃO 1.0")
r.font.size = Pt(9)
r.font.bold = True
r.font.color.rgb = SAND

p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(18)
p.paragraph_format.space_after = Pt(10)
r = p.add_run("Plataforma de Gestão\npara Clínica de Estética")
r.font.size = Pt(34)
r.font.bold = True
r.font.color.rgb = ACCENT
r.font.name = "Calibri"

p = doc.add_paragraph()
p.paragraph_format.space_after = Pt(6)
r = p.add_run("Do orçamento de serviços ao controle financeiro")
r.font.size = Pt(15)
r.font.color.rgb = MUTED

rule = doc.add_paragraph()
rule.paragraph_format.space_before = Pt(6)
rule.paragraph_format.space_after = Pt(26)
para_border(rule, "bottom", SAND_HEX, 12, 1)

p = doc.add_paragraph()
p.paragraph_format.space_after = Pt(4)
r = p.add_run("Uma unidade · equipe pequena · uso interno")
r.font.size = Pt(11)
r.font.bold = True
r.font.color.rgb = INK

p = doc.add_paragraph()
p.paragraph_format.space_after = Pt(40)
r = p.add_run(
    "Documento de planejamento. Prazos, custos e metas são estimativas de "
    "referência para decisão, não compromissos contratuais."
)
r.font.size = Pt(9.5)
r.font.color.rgb = MUTED

meta = [
    ("Escopo", "Orçamento · Agenda · Prontuário · Estoque · Financeiro · Fiscal"),
    ("Horizonte", "28 semanas, com MVP operacional em 12"),
    ("Data", "23 de novembro de 2026"),
    ("Status", "Proposta para decisão"),
]
t = doc.add_table(rows=0, cols=2)
t.alignment = WD_TABLE_ALIGNMENT.LEFT
table_setup(t, [3.6, CONTENT_W - 3.6])
for k, v in meta:
    row = t.add_row()
    c0, c1 = row.cells
    c0.width = Cm(3.6)
    c1.width = Cm(CONTENT_W - 3.6)
    p0 = c0.paragraphs[0]
    p0.paragraph_format.space_after = Pt(2)
    p0.paragraph_format.space_before = Pt(2)
    r0 = p0.add_run(k.upper())
    r0.font.size = Pt(7.5)
    r0.font.bold = True
    r0.font.color.rgb = SAND
    p1 = c1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(2)
    p1.paragraph_format.space_before = Pt(2)
    r1 = p1.add_run(v)
    r1.font.size = Pt(9.5)
    r1.font.color.rgb = INK

doc.add_page_break()

md = SRC.read_text(encoding="utf-8")
lines = md.splitlines()
start = next(i for i, ln in enumerate(lines) if ln.strip() == "## Sumário")

H2 = re.compile(r"^## (\d+)\. (.+)$")
H3 = re.compile(r"^### (.+)$")
OL = re.compile(r"^(\d+)\.\s+(.*)$")

PAGES = {}
if len(sys.argv) > 3 and Path(sys.argv[3]).exists():
    PAGES = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8"))

SECTIONS = []
for ln in lines:
    m = H2.match(ln.strip())
    if m:
        SECTIONS.append((int(m.group(1)), m.group(2)))

i = start
while i < len(lines):
    line = lines[i].rstrip()

    if not line.strip():
        i += 1
        continue

    if line.startswith("```"):
        block = []
        i += 1
        while i < len(lines) and not lines[i].startswith("```"):
            block.append(lines[i].rstrip("\n"))
            i += 1
        i += 1
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(10)
        p.paragraph_format.line_spacing = 1.0
        para_shade(p, CODE_FILL)
        for edge in ("top", "left", "bottom", "right"):
            para_border(p, edge, BORDER_HEX, 4, 4)
        for n, code_line in enumerate(block):
            run = p.add_run(code_line)
            run.font.name = "Consolas"
            run.font.size = Pt(7.8)
            run.font.color.rgb = INK
            if n < len(block) - 1:
                run.add_break()
        continue

    if line.startswith("|"):
        rows = []
        while i < len(lines) and lines[i].strip().startswith("|"):
            raw = lines[i].strip()
            i += 1
            if re.match(r"^\|[\s:\-|]+\|$", raw):
                continue
            rows.append([c.strip() for c in raw.strip("|").split("|")])
        if not rows:
            continue
        ncols = max(len(r) for r in rows)
        rows = [r + [""] * (ncols - len(r)) for r in rows]
        widths = compute_widths(rows, ncols)
        size = 9.5 if ncols <= 4 else (9 if ncols == 5 else 8)
        table = doc.add_table(rows=0, cols=ncols)
        table_setup(table, widths)
        for ridx, data in enumerate(rows):
            row = table.add_row()
            trpr = row._tr.get_or_add_trPr()
            trpr.append(OxmlElement("w:cantSplit"))
            if ridx == 0:
                th = OxmlElement("w:tblHeader")
                th.set(qn("w:val"), "true")
                trpr.append(th)
            for cidx, val in enumerate(data):
                cell = row.cells[cidx]
                cell.width = Cm(widths[cidx])
                p = cell.paragraphs[0]
                p.paragraph_format.space_before = Pt(1)
                p.paragraph_format.space_after = Pt(1)
                p.paragraph_format.line_spacing = 1.0
                if ridx == 0:
                    cell_shade(cell, ACCENT_HEX)
                    add_runs(p, val, size, WHITE, bold=True)
                else:
                    if ridx % 2 == 0:
                        cell_shade(cell, ZEBRA_HEX)
                    add_runs(p, val, size, INK)
        spacer = doc.add_paragraph()
        spacer.paragraph_format.space_after = Pt(2)
        spacer.paragraph_format.space_before = Pt(0)
        continue

    if line.strip() == "## Sumário":
        h = doc.add_paragraph("Sumário", style="Heading 2")
        h.paragraph_format.space_after = Pt(14)
        para_border(h, "bottom", SAND_HEX, 8, 6)
        toc_p = doc.add_paragraph()
        toc_p.paragraph_format.space_after = Pt(0)
        for num, title in SECTIONS:
            entry = doc.add_paragraph(style="TOC 1")
            r_t = entry.add_run(f"{num}.  {title}")
            r_t.font.size = Pt(10.5)
            entry.add_run("\t")
            r_p = entry.add_run(str(PAGES.get(str(num), "00")))
            r_p.font.size = Pt(10.5)
            r_p.font.color.rgb = MUTED
        i += 1
        while i < len(lines) and lines[i].strip() != "---":
            i += 1
        i += 1
        continue

    m = H2.match(line)
    if m:
        h = doc.add_paragraph(f"{m.group(1)}. {m.group(2)}", style="Heading 2")
        h.paragraph_format.page_break_before = True
        h.paragraph_format.space_before = Pt(0)
        para_border(h, "bottom", ACCENT_HEX, 10, 6)
        i += 1
        continue

    m = H3.match(line)
    if m:
        doc.add_paragraph(m.group(1), style="Heading 3")
        i += 1
        continue

    if line.startswith("# "):
        i += 1
        continue

    if line.strip() == "---":
        i += 1
        continue

    if line.startswith("> "):
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.5)
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(10)
        para_border(p, "left", SAND_HEX, 12, 8)
        para_shade(p, "FBF8F4")
        add_runs(p, line[2:], 9.5, MUTED, italic=True)
        i += 1
        continue

    if line.startswith("- [ ] "):
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.75)
        p.paragraph_format.first_line_indent = Cm(-0.45)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.1
        box = p.add_run("\u2610  ")
        box.font.size = Pt(10)
        box.font.color.rgb = SAND
        add_runs(p, line[6:], 10.5, INK)
        i += 1
        continue

    if line.startswith("- "):
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.12
        p.paragraph_format.left_indent = Cm(0.65)
        p.paragraph_format.first_line_indent = Cm(-0.4)
        add_runs(p, line[2:], 10.5, INK)
        i += 1
        continue

    m = OL.match(line)
    if m:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.85)
        p.paragraph_format.first_line_indent = Cm(-0.6)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.12
        p.paragraph_format.tab_stops.add_tab_stop(Cm(0.85), WD_TAB_ALIGNMENT.LEFT)
        num = p.add_run(f"{m.group(1)}.")
        num.bold = True
        num.font.size = Pt(10.5)
        num.font.color.rgb = SAND
        p.add_run("\t")
        add_runs(p, m.group(2), 10.5, INK)
        i += 1
        continue

    buf = [line]
    i += 1
    while i < len(lines):
        nxt = lines[i]
        if (
            not nxt.strip()
            or nxt.startswith(("#", "|", ">", "- ", "```", "---"))
            or OL.match(nxt)
        ):
            break
        buf.append(nxt.strip())
        i += 1
    p = doc.add_paragraph()
    for n, chunk in enumerate(buf):
        if n:
            p.add_run().add_break()
        add_runs(p, chunk, 10.5, INK)

settings = doc.settings.element
upd = OxmlElement("w:updateFields")
upd.set(qn("w:val"), "true")
settings.append(upd)

cp = doc.core_properties
cp.title = "Plano diretor — Plataforma de gestão para clínica de estética"
cp.subject = "Plano de produto, arquitetura e financeiro"
cp.author = "Planejamento"
cp.language = "pt-BR"

OUT.parent.mkdir(parents=True, exist_ok=True)
doc.save(OUT)
print(f"ok: {OUT} ({OUT.stat().st_size/1024:.0f} KB)")

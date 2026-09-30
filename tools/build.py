#!/usr/bin/env python3
"""Buduje stronę z folderu 'uporzadkowane info drogi'.

Uruchomienie (z folderu wiki-drogowa):   python tools/build.py
Wymaga: Python 3 + pypdf (pip install pypdf). Pliki .docx zamienia na PDF przez MS Word.

Co robi:
- kopiuje oryginalne PDF-y do pdf/<ID>.pdf (nazwy bez polskich znaków i spacji),
- tworzy data/registry.json (rejestr), data/fazy.json (przewodniki po fazach z numerami stron),
  data/wiki.json (sekcje indeksu), data/search.json (indeks wyszukiwarki pełnotekstowej).
"""
import json, os, re, shutil, subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE / "tools"))
from fazy import PHASES, MATRIX, WWIORB_PHASES, GROUP_EXTRA  # noqa: E402

BASE = HERE.parent / "uporzadkowane info drogi"
MD_ROOT = BASE / "_TEKST_MD"
INDEX = BASE / "00_INDEKS.md"
OUT = HERE / "data"
PDF = HERE / "pdf"

try:
    import pypdf
except ImportError:
    sys.exit("Brak biblioteki pypdf. Zainstaluj: python -m pip install pypdf")

SHORT = {
    "S1": "Klasy i kategorie dróg", "S2": "Weryfikacja podłoża drogi", "S3": "Źródła wymagań a fazy inwestycji",
    "S4": "Jak powstaje projekt drogi w Polsce",
    "U-PB": "Prawo budowlane", "U-UDP": "Ustawa o drogach publicznych", "U-OOS": "Ustawa OOŚ (decyzja środowiskowa)",
    "U-KC": "Kodeks cywilny, art. 647–658", "U-PORD": "Prawo o ruchu drogowym", "U-PZP": "Prawo zamówień publicznych",
    "U-ZRID": "Specustawa drogowa (ZRID)",
    "R-DB": "Dziennik budowy i EDB", "R-BIOZ": "Informacja BIOZ i plan BIOZ", "R-GEO": "Geotechniczne warunki posadawiania",
    "R-PROJ": "Zakres i forma projektu budowlanego", "R-PTB": "Przepisy techniczno-budowlane drogowe",
    "R-STW": "Dokumentacja projektowa, STWiORB, PFU",
    "W-M-00.00.00": "Wymagania ogólne", "W-M-13.01.00": "Beton konstrukcyjny w obiektach inżynierskich",
    "W-D-08.01.01": "Krawężniki betonowe", "W-D-05.03.04": "Nawierzchnia z betonu cementowego",
    "W-D-05.03.05A": "Warstwa wiążąca z AC", "W-D-05.03.05B": "Warstwa ścieralna z AC",
    "W-D-05.03.05C": "Warstwa podbudowy i wiążąca z AC WMS", "W-D-05.03.13": "Warstwa ścieralna z SMA",
    "W-D-04.02.01": "Warstwa odcinająca", "W-D-04.02.02": "Warstwa mrozoochronna i odsączająca",
    "W-D-04.03.01": "Oczyszczenie i skropienie warstw", "W-D-04.04.02": "Podbudowa z mieszanki niezwiązanej",
    "W-D-04.05.00": "Ulepszone podłoże (stabilizacja gruntu)", "W-D-04.05.01": "Podbudowa z mieszanki związanej cementem",
    "W-D-04.07.01": "Warstwa podbudowy z AC", "W-D-04.10.01": "Podbudowa z mieszanki MCE",
    "W-D-01.01.01": "Wytyczenie trasy i punktów wysokościowych", "W-D-01.02.01a": "Ochrona istniejących drzew",
    "W-D-01.02.02a": "Zdjęcie warstwy ziemi urodzajnej", "W-D-01.02.01": "Usunięcie drzew i krzewów",
    "W-D-06.03.01a": "Pobocza z destruktu asfaltowego", "W-D-02.00.01": "Roboty ziemne – wymagania ogólne",
    "W-D-02.01.01A": "Platformy robocze", "W-D-02.01.01B": "Wymiana gruntów", "W-D-02.01.01C": "Materace geosyntetyczne",
    "W-D-02.01.01D": "Dreny pionowe i nasyp przeciążający", "W-D-02.01.01E": "Kolumny DSM",
    "W-D-02.01.01F": "Jet grouting", "W-D-02.01.01G": "Kolumny żwirowe", "W-D-02.01.01H": "Kolumny betonowo-żwirowe",
    "W-D-02.01.01I": "Prefabrykowane pale żelbetowe", "W-D-02.01.01J": "Pale CFA",
    "W-D-02.01.01": "Wykonanie wykopów", "W-D-02.03.01": "Wykonanie nasypów", "W-D-09.01.01": "Zieleń drogowa",
    "WR-D-63": "Katalog nawierzchni: ruch bardzo lekki i inne części dróg", "WR-D-64": "Cechy powierzchniowe nawierzchni",
    "WR-D-61": "Katalog nawierzchni podatnych i półsztywnych", "WR-D-62": "Katalog nawierzchni sztywnych",
    "WR-D-21": "Skrajnia dróg zamiejskich i ulic", "WR-D-22-1": "Drogi zamiejskie – wymagania podstawowe",
    "WR-D-22-2": "Drogi zamiejskie – geometria", "WR-D-22-3": "Drogi zamiejskie – wyposażenie techniczne",
    "WR-D-22-4": "Drogi zamiejskie – typowe przekroje", "WR-D-24-1": "Ulice – planowanie i wymagania podstawowe",
    "WR-D-24-2": "Ulice – geometria i wyposażenie", "WR-D-24-3": "Ulice – katalog typowych rozwiązań",
    "WR-D-31-1": "Skrzyżowania – wymagania podstawowe", "WR-D-31-2": "Skrzyżowania zwykłe i skanalizowane",
    "WR-D-31-3": "Ronda", "WR-D-32-1": "Węzły – wymagania podstawowe", "WR-D-32-2": "Węzły – elementy i wyposażenie",
    "WR-D-33": "Zjazdy, wyjazdy i wjazdy", "WR-D-71-1": "Odwodnienie – wymagania podstawowe",
    "WR-D-71-2": "Odwodnienie powierzchniowe i wgłębne", "WR-D-72-1": "Oświetlenie – wymagania",
    "WR-D-72-2": "Oświetlenie – katalog typowych rozwiązań",
    "WT-1": "Kruszywa", "WT-2/I": "Mieszanki mineralno-asfaltowe", "WT-2/II": "Wykonanie warstw nawierzchni asfaltowych",
    "WT-4": "Mieszanki niezwiązane", "WT-5": "Mieszanki związane spoiwem hydraulicznym",
    "WT-OCR": "OCR skanów WT-2/I i WT-5",
}
# Dokumenty spoza indeksu (dopisz tu nowe pliki, zanim trafią do 00_INDEKS.md)
EXTRA = [
    {"id": "S4", "cat": "sciagi", "file": "{ŚCIĄGA}Jak_powstaje_projekt_drogi_w_Polsce_poprawiony.docx",
     "full": "Jak powstaje projekt drogi w Polsce – materiał źródłowy do ściągi",
     "ident": "notatka własna, .docx; stan prawny wg notatki: 29.09.2026",
     "scope": "Przebieg projektowania drogi: etapy, decyzje, zawartość opracowań; materiał dla młodszego projektanta / inżyniera budowy.",
     "note": "Źródło wtórne, spoza 00_INDEKS.md. Wartości i odwołania weryfikuj w dokumentach źródłowych."},
]
# Skany: strony OCR (WT-OCR) -> (dokument oryginalny, przesunięcie)
OCR_MAP = [(1, 52, "WT-2/I", 0), (53, 152, "WT-5", 52)]


def slug(i):
    return re.sub(r"[^A-Za-z0-9.\-]+", "_", i)


def collapse(t):
    t = re.sub(r"\.{3,}", " … ", t)
    t = re.sub(r"[ \t]+", " ", t)
    return re.sub(r"\s*\n\s*", " ", t).strip()


def md_pages(p):
    parts = re.split(r"<!-- \[str\. (\d+)\] -->", p.read_text(encoding="utf-8"))
    return [(int(parts[k]), parts[k + 1]) for k in range(1, len(parts), 2)]


def pdf_pages(p):
    r = pypdf.PdfReader(str(p))
    return [(i + 1, (pg.extract_text() or "")) for i, pg in enumerate(r.pages)]


def docx_to_pdf(src, dst):
    if dst.exists() and dst.stat().st_mtime > src.stat().st_mtime:
        return
    tmp = Path(tempfile.mkdtemp())
    a, b = tmp / "in.docx", tmp / "out.pdf"
    shutil.copy2(src, a)   # Word źle znosi nawiasy klamrowe i polskie znaki w ścieżce przez COM
    ps = (f"$w=New-Object -ComObject Word.Application; $w.DisplayAlerts=0; "
          f"$d=$w.Documents.Open('{a}',$false,$true,$false); $d.ExportAsFixedFormat('{b}',17); $d.Close($false); $w.Quit()")
    subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=True, timeout=180)
    shutil.copy2(b, dst)
    shutil.rmtree(tmp, ignore_errors=True)


# ---------- indeks ----------
def parse_index():
    lines = INDEX.read_text(encoding="utf-8").split("\n")
    entries, sec, cat, i = [], None, None, 0
    while i < len(lines):
        l = lines[i]
        if l.startswith("## "):
            sec = l[3:].strip()
        if l.startswith("### "):
            cat = l[4:].strip()
        in3 = sec and sec.startswith("3.")
        m = re.match(r"^\*\*(\S+)\*\* – (.+)$", l)
        if m and in3:
            e = {"id": m.group(1), "full": m.group(2).strip()}
            i += 1
            while i < len(lines) and lines[i].startswith("- "):
                k, _, v = lines[i][2:].partition(":")
                k, v = k.strip(), v.strip()
                if k == "Plik":
                    fm = re.match(r"`(.+?)`", v)
                    e["file"] = fm.group(1)
                else:
                    e[{"Identyfikator": "ident", "Zakres": "scope", "Struktura": "struct", "Uwaga": "note"}.get(k, k)] = v
                i += 1
            entries.append(e)
            continue
        if in3 and l.startswith("| ") and not l.startswith("| ID") and not l.startswith("|---"):
            c = [x.strip() for x in l.strip().strip("|").split("|")]
            if len(c) == 7:
                f = re.match(r"`(.+)`", c[1])
                entries.append({"id": c[0], "file": f.group(1) if f else c[1], "ident": c[2],
                                "scope": c[4], "norms": c[5], "note": c[6]})
        i += 1
    return entries


def sections():
    parts = re.split(r"(?m)^## ", INDEX.read_text(encoding="utf-8"))
    out = {"intro": parts[0].strip()}
    for p in parts[1:]:
        head, _, body = p.partition("\n")
        out[head.split(".")[0]] = {"title": head.strip(), "body": body.strip()}
    return out


def cat_of(i):
    if re.match(r"^S\d+$", i): return "sciagi"
    if i.startswith("U-"): return "ustawy"
    if i.startswith("R-"): return "rozp"
    if i.startswith("WR-D"): return "wrd"
    if i.startswith("W-"): return "wwiorb"
    if i.startswith("WT"): return "wt"
    return "inne"


# ---------- kotwice (numer strony) ----------
def anchor_rx(a):
    kind, _, v = a.partition(":")
    if kind == "art":
        num, _, sup = v.partition("^")
        s = (r"\.?\s*" + ("[¹1]" if sup == "1" else re.escape(sup))) if sup else ""
        return re.compile(r"^\s*Art\.\s*" + re.escape(num) + s + r"\s*\.", re.M)
    if kind == "par":
        return re.compile(r"^\s*§\s*" + re.escape(v) + r"\.", re.M)
    if kind == "pkt":
        return re.compile(r"^\s*" + re.escape(v) + r"\.?\s*[^\W\d_]", re.M)
    if kind == "rozdz":
        return re.compile(r"^\s*Rozdział\s+" + re.escape(v) + r"\b", re.M | re.I)
    if kind == "re":
        return re.compile(v, re.M | re.I)
    raise ValueError(a)


def is_toc(t):
    lines = [l for l in t.split("\n") if l.strip()]
    if re.search(r"SPIS\s+TREŚCI", t, re.I):
        return True
    num = [l for l in lines if re.match(r"^\s*\d+(\.\d+)*\.?\s*\S.{0,110}$", l)]
    return len(num) >= 8 and len(num) > 0.5 * len(lines)


def find_page(pages, a):
    rx = anchor_rx(a)
    for n, t in pages:
        if is_toc(t):
            continue
        for m in rx.finditer(t):
            s = t.rfind("\n", 0, m.start()) + 1
            e = t.find("\n", m.end())
            line = t[s:e if e >= 0 else None]
            if "...." in line or "…" in line:
                continue          # wiersz spisu treści
            if os.environ.get("WIKI_DEBUG"):
                print(f"   {a:22} s.{n:<4} {line.strip()[:70]}")
            return n
    return None


CH = [("1", r"WST[ĘE]P"), ("2", r"MATERIA"), ("3", r"SPRZ[ĘE]T"), ("4", r"TRANSPORT"), ("5", r"WYKONANIE\s+ROB"),
      ("6", r"KONTROLA\s+JAKO"), ("7", r"OBMIAR"), ("8", r"ODBI[ÓO]R"), ("9", r"PODSTAWA\s+P"), ("10", r"PRZEPISY")]


def wwiorb_chapters(pages):
    hits = {n: {k for k, pat in CH if re.search(r"^\s*" + k + r"\.?\s{1,12}" + pat, t, re.M | re.I)} for n, t in pages}
    toc = [n for n, f in hits.items() if len(f) >= 4 and n <= 5]
    last, res = (max(toc) + 1 if toc else 1), {}
    for k, _ in CH:
        for n, _ in pages:
            if n >= last and k in hits[n]:
                res[k] = n
                last = n
                break
    return res


# ---------- main ----------
def main():
    OUT.mkdir(exist_ok=True)
    PDF.mkdir(exist_ok=True)
    old_docs = OUT / "docs"
    if old_docs.exists():
        shutil.rmtree(old_docs)
    mdmap = {p.stem: p for p in MD_ROOT.rglob("*.md")}
    src_files = {}
    for p in BASE.rglob("*"):
        if p.is_file() and "_TEKST_MD" not in p.parts and "_NOTION_IMPORT" not in p.parts:
            src_files.setdefault(p.name, p)

    entries = parse_index() + EXTRA
    reg, texts, used_pdfs = [], {}, set()
    for e in entries:
        i = e["id"]
        item = {"id": i, "slug": slug(i), "cat": e.get("cat") or cat_of(i),
                "title": SHORT.get(i) or e.get("full", i), "full": e.get("full", ""),
                "ident": e.get("ident", ""), "scope": e.get("scope", ""), "note": e.get("note", ""),
                "struct": e.get("struct", ""), "norms": e.get("norms", "")}
        fname = e.get("file", "")
        src = src_files.get(fname)
        if fname.endswith(".txt"):
            m = re.search(r"https?://[^\s?]+", src.read_text(encoding="utf-8", errors="ignore")) if src else None
            item.update(cat="inne", title="Strona WR-D w Ministerstwie Infrastruktury", url=m.group(0) if m else "")
        elif not src:
            print("UWAGA – nie znaleziono pliku:", i, fname)
        else:
            dst = PDF / (slug(i) + ".pdf")
            md = None
            if src.suffix.lower() == ".docx":
                docx_to_pdf(src, dst)
                pages = pdf_pages(dst)
                item["converted"] = True
            else:
                if not dst.exists() or dst.stat().st_size != src.stat().st_size:
                    shutil.copy2(src, dst)
                md = mdmap.get(src.stem)
                pages = md_pages(md) if md else pdf_pages(dst)
            used_pdfs.add(dst.name)
            item["pdf"] = "pdf/" + dst.name
            item["mb"] = round(dst.stat().st_size / 1e6, 1)
            item["nPages"] = len(pypdf.PdfReader(str(dst)).pages)
            if md and len(pages) != item["nPages"]:
                print(f"UWAGA – {i}: stron w tekście {len(pages)}, w PDF {item['nPages']}")
            item["scan"] = sum(len(t.strip()) for _, t in pages) < 800
            texts[i] = pages
            if item["cat"] == "wwiorb":
                grp = src.parent.name.replace("[WWiORB] ", "").strip()
                item["group"] = "Ogólne" if "Wzorcowe" in grp else grp
                item["ch"] = wwiorb_chapters(pages)
        ph = WWIORB_PHASES if item["cat"] == "wwiorb" else MATRIX.get(i, "")
        item["ph"] = ph
        reg.append(item)
    for f in PDF.glob("*.pdf"):
        if f.name not in used_pdfs:
            f.unlink()
    byid = {r["id"]: r for r in reg}

    # --- fazy: kotwice -> strony
    missing = []
    fazy = []
    for P in PHASES:
        secs = []
        for s in P["sections"]:
            items = []
            for it in s["items"]:
                refs = []
                for did, a, label in it["r"]:
                    if did not in byid:
                        missing.append(did); continue
                    pg = 1
                    if a and a.startswith("ch:"):
                        pg = byid[did].get("ch", {}).get(a[3:])
                        if pg is None:
                            missing.append(f"{did} {a}"); pg = 1
                    elif a:
                        pg = find_page(texts.get(did, []), a)
                        if pg is None:
                            missing.append(f"{did} {a}"); pg = 1
                    refs.append([did, pg, label])
                items.append({"q": it["q"], "r": refs})
            secs.append({"t": s["t"], "items": items})
        f = {k: P[k] for k in ("key", "name", "sub", "lead")}
        f["sections"] = secs
        if "auto" in P:
            f["auto"] = P["auto"]
        fazy.append(f)
    if missing:
        print("UWAGA – nie znaleziono kotwic (link na s. 1):", missing)

    # --- wyszukiwarka: teksty stron; OCR przepięty na oryginalne skany
    sdocs, rows = [], []
    def did_index(d):
        if d not in sdocs: sdocs.append(d)
        return sdocs.index(d)
    for i, pages in texts.items():
        if byid[i].get("scan"):
            continue
        for n, t in pages:
            c = collapse(t)
            if len(c) < 20: continue
            target, pg = i, n
            if i == "WT-OCR":
                for a, b, orig, off in OCR_MAP:
                    if a <= n <= b: target, pg = orig, n - off
            rows.append([did_index(target), pg, c])

    (OUT / "registry.json").write_text(json.dumps(reg, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (OUT / "fazy.json").write_text(json.dumps({"phases": fazy, "groups": GROUP_EXTRA}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (OUT / "wiki.json").write_text(json.dumps({"sections": sections()}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (OUT / "search.json").write_text(json.dumps({"d": sdocs, "r": rows}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    mb = sum(f.stat().st_size for f in PDF.glob("*.pdf")) / 1e6
    print(f"dokumentów: {len(reg)}, PDF: {len(used_pdfs)} ({mb:.0f} MB), stron w wyszukiwarce: {len(rows)}")
    big = [f"{f.name} {f.stat().st_size/1e6:.0f} MB" for f in PDF.glob('*.pdf') if f.stat().st_size > 45e6]
    if big:
        print("UWAGA – pliki > 45 MB (GitHub ostrzega od 50 MB, blokuje od 100 MB):", big)


if __name__ == "__main__":
    main()

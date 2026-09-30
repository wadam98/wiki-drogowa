#!/usr/bin/env python3
"""Buduje dane strony (data/*.json) z folderu 'uporzadkowane info drogi'.

Uruchomienie (z folderu wiki-drogowa):   python tools/build.py
Po dodaniu/zmianie dokumentów w bazie: najpierw zaktualizuj 00_INDEKS.md
i _TEKST_MD, potem uruchom ten skrypt ponownie.
"""
import json, os, re, sys, unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
BASE = HERE.parent / "uporzadkowane info drogi"
MD_ROOT = BASE / "_TEKST_MD"
INDEX = BASE / "00_INDEKS.md"
OUT = HERE / "data"
DOCS = OUT / "docs"

SHORT = {
    "S1": "Klasy i kategorie dróg", "S2": "Weryfikacja podłoża drogi", "S3": "Źródła wymagań a fazy inwestycji",
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
# Skany bez tekstu -> gdzie szukać wersji OCR (dokument, pierwsza strona)
REDIRECT = {"WT-2/I": ("WT-OCR", 1), "WT-5": ("WT-OCR", 53)}


def slug(i):
    return re.sub(r"[^A-Za-z0-9.\-]+", "_", i)


def clean_page(t):
    t = t.replace("\f", "").replace("\r", "")
    lines = [l.rstrip() for l in t.split("\n")]
    ind = [len(l) - len(l.lstrip(" ")) for l in lines if l.strip()]
    d = min(ind) if ind else 0
    lines = [l[d:] if l.strip() else "" for l in lines]
    out, blank = [], 0
    for l in lines:
        if not l:
            blank += 1
            if blank > 1:
                continue
        else:
            blank = 0
        out.append(l)
    return "\n".join(out).strip()


def split_pages(text):
    parts = re.split(r"<!-- \[str\. (\d+)\] -->", text)
    pages = []
    for k in range(1, len(parts), 2):
        pages.append((int(parts[k]), clean_page(parts[k + 1])))
    if not pages:  # .docx – brak znaczników stron, cały tekst jako s. 1
        body = re.sub(r"\A# .*\n+(Źródło:.*\n+)?", "", text)
        body = body.replace("**", "")
        body = re.sub(r"\\([\[\]\(\)\.\-_*#])", r"\1", body)
        pages.append((1, clean_page(body)))
    return pages


def collapse(t):
    t = re.sub(r"\.{3,}", " … ", t)
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\s*\n\s*", " ", t)
    return t.strip()


def find_md():
    m = {}
    for p in MD_ROOT.rglob("*.md"):
        m[p.stem] = p
    return m


def parse_index():
    lines = INDEX.read_text(encoding="utf-8").split("\n")
    entries = []
    cur_section = None
    cur_cat = None
    i = 0
    while i < len(lines):
        l = lines[i]
        if l.startswith("### "):
            cur_cat = l[4:].strip()
        if l.startswith("## "):
            cur_section = l[3:].strip()
        m = re.match(r"^\*\*(\S+)\*\* – (.+)$", l)
        if m and cur_section and cur_section.startswith("3."):
            e = {"id": m.group(1), "full": m.group(2).strip(), "cat": cur_cat}
            i += 1
            while i < len(lines) and lines[i].startswith("- "):
                b = lines[i][2:]
                k, _, v = b.partition(":")
                k = k.strip()
                v = v.strip()
                if k == "Plik":
                    fm = re.match(r"`(.+?)`(?:,\s*(\d+)\s*s\.)?", v)
                    e["file"] = fm.group(1)
                    if fm.group(2):
                        e["pages"] = int(fm.group(2))
                elif k == "Identyfikator":
                    e["ident"] = v
                elif k == "Zakres":
                    e["scope"] = v
                elif k == "Struktura":
                    e["struct"] = v
                elif k == "Uwaga":
                    e["note"] = v
                i += 1
            entries.append(e)
            continue
        if (cur_section and cur_section.startswith("3.") and l.startswith("| ")
                and not l.startswith("| ID") and not l.startswith("|---")):
            c = [x.strip() for x in l.strip().strip("|").split("|")]
            if len(c) == 7:
                f = re.match(r"`(.+)`", c[1])
                e = {"id": c[0], "cat": cur_cat, "file": f.group(1) if f else c[1],
                     "ident": c[2], "scope": c[4], "norms": c[5], "note": c[6]}
                if c[3].isdigit():
                    e["pages"] = int(c[3])
                entries.append(e)
            elif len(c) == 6:
                pass
        i += 1
    return entries


def sections():
    txt = INDEX.read_text(encoding="utf-8")
    parts = re.split(r"(?m)^## ", txt)
    intro = parts[0]
    out = {"intro": intro.strip()}
    for p in parts[1:]:
        head, _, body = p.partition("\n")
        n = head.split(".")[0]
        out[n] = {"title": head.strip(), "body": body.strip()}
    return out


def norm_id_cat(e):
    i = e["id"]
    if i.startswith("S") and i[1:].isdigit():
        return "sciagi"
    if i.startswith("U-"):
        return "ustawy"
    if i.startswith("R-"):
        return "rozp"
    if i.startswith("W-"):
        return "wwiorb"
    if i.startswith("WR-D"):
        return "wrd"
    if i.startswith("WT"):
        return "wt"
    return "inne"


def main():
    OUT.mkdir(exist_ok=True)
    DOCS.mkdir(exist_ok=True)
    for f in DOCS.glob("*.json"):
        f.unlink()
    mdmap = find_md()
    entries = parse_index()
    print("wpisy w indeksie:", len(entries))

    reg = []
    search_docs, search_rows = [], []
    missing = []
    for e in entries:
        cat = norm_id_cat(e)
        item = {"id": e["id"], "slug": slug(e["id"]), "cat": cat,
                "title": SHORT.get(e["id"]) or e.get("full", e["id"]),
                "ident": e.get("ident", ""), "scope": e.get("scope", ""),
                "note": e.get("note", ""), "struct": e.get("struct", ""),
                "norms": e.get("norms", ""), "pages": e.get("pages")}
        if "full" in e:
            item["full"] = e["full"]
        fname = e.get("file", "")
        if e["id"] == "X-LINK":
            url = ""
            for p in BASE.rglob("link do strony*.txt"):
                m = re.search(r"https?://[^\s?]+", p.read_text(encoding="utf-8", errors="ignore"))
                if m:
                    url = m.group(0)
            item.update(cat="inne", title="Strona WR-D w Ministerstwie Infrastruktury", url=url, hasText=False)
            reg.append(item)
            continue
        stem = re.sub(r"\.(pdf|docx|txt)$", "", fname)
        md = mdmap.get(stem)
        if not md:
            # dopasowanie po znormalizowanej nazwie
            key = re.sub(r"\W+", "", stem).lower()
            for s, p in mdmap.items():
                if re.sub(r"\W+", "", s).lower() == key:
                    md = p
                    break
        if cat == "wwiorb" and md:
            rel = md.relative_to(MD_ROOT).parts
            grp = rel[-2].replace("[WWiORB] ", "").strip() if len(rel) >= 2 else ""
            item["group"] = grp if grp and "Wzorcowe" not in grp else "Ogólne"
        if not md:
            missing.append(e["id"])
            item["hasText"] = False
            reg.append(item)
            continue
        pages = split_pages(md.read_text(encoding="utf-8"))
        chars = sum(len(t) for _, t in pages)
        item["hasText"] = chars > 800
        item["nPages"] = len(pages)
        if e["id"] in REDIRECT:
            item["redirect"] = {"id": REDIRECT[e["id"]][0], "page": REDIRECT[e["id"]][1]}
        if item["hasText"]:
            (DOCS / (slug(e["id"]) + ".json")).write_text(
                json.dumps({"id": e["id"], "pages": [[n, t] for n, t in pages]}, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8")
            di = len(search_docs)
            search_docs.append(e["id"])
            for n, t in pages:
                c = collapse(t)
                if len(c) > 20:
                    search_rows.append([di, n, c])
        reg.append(item)
    if missing:
        print("UWAGA – brak pliku tekstowego dla:", missing)

    sec = sections()
    wiki = {"built": "2026-09-30", "sections": sec}
    (OUT / "registry.json").write_text(json.dumps(reg, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (OUT / "wiki.json").write_text(json.dumps(wiki, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (OUT / "search.json").write_text(json.dumps({"d": search_docs, "r": search_rows}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tot = sum(f.stat().st_size for f in OUT.rglob("*.json"))
    print(f"dokumentów: {len(reg)}, stron w wyszukiwarce: {len(search_rows)}, dane razem: {tot/1e6:.1f} MB")
    print("search.json:", round((OUT / 'search.json').stat().st_size / 1e6, 1), "MB")


if __name__ == "__main__":
    main()

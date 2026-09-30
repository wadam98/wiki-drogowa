# Wiki drogowa

Osobista baza wiedzy o budownictwie drogowym: 80 oryginalnych dokumentów PDF (ustawy, rozporządzenia, WWiORB, WR-D, WT GDDKiA, ściągi S1–S4) podzielonych na trzy fazy inwestycji:

- **Projektowanie**: ścieżka formalna (DŚU, ZRID), projekt budowlany, projekt wykonawczy i STWiORB, parametry techniczne, konstrukcja nawierzchni
- **Wykonawstwo**: plac budowy, kierownik i dziennik budowy, umowa i podwykonawcy, materiały i badania, technologie wg WWiORB
- **Odbiory**: rodzaje odbiorów, badania, kontrola jakości i odbiór dla każdej pozycji WWiORB, zakończenie budowy

Każdy odnośnik otwiera oryginalny PDF (przeglądarka PDF.js) od razu na właściwej stronie. Wyszukiwarka pełnotekstowa obejmuje ok. 4000 stron, a wynik otwiera PDF z podświetloną frazą. Przydział dokumentów do faz pochodzi ze ściągi S3.

## Podgląd lokalny

```
python -m http.server 8000
```

Potem wejdź na http://localhost:8000. Po dwukliknięciu `index.html` strona nie zadziała.

## Aktualizacja strony na GitHub Pages

1. Zmień pliki w folderze `uporzadkowane info drogi` (i w razie potrzeby `00_INDEKS.md` oraz `_TEKST_MD`).
2. W folderze `wiki-drogowa` uruchom `python tools/build.py`. Wymaga `pip install pypdf`, a do plików .docx także programu MS Word. Skrypt kopiuje PDF-y do `pdf/` i odtwarza `data/`.
3. W `sw.js` zwiększ numer w `const CACHE = 'wiki-drogowa-v2'`, żeby telefony pobrały nową wersję.
4. W GitHub Desktop: wpisz opis zmian → *Commit to main* → *Push origin*. Strona odświeży się po 1–2 minutach.

Nowy dokument dopisujesz do rejestru w `00_INDEKS.md` (sekcja 3) albo do listy `EXTRA` w `tools/build.py`. Dokumenty trafiają do faz według słownika `MATRIX` w `tools/fazy.py`. Tam też są pytania i odnośniki na stronach faz. Kotwica, np. `("U-PB", "art:22", "art. 22")`, sama znajduje numer strony w PDF-ie.

## Struktura

- `index.html`, `style.css`, `app.js`: aplikacja (routing `#/…`, przeglądarka PDF z CDN jsDelivr: `pdfjs-dist`)
- `pdf/`: oryginalne PDF-y pod nazwami ID (pliki .docx zamienione na PDF)
- `data/registry.json` rejestr, `data/fazy.json` strony faz z numerami stron, `data/wiki.json` sekcje indeksu, `data/search.json` indeks wyszukiwarki
- `tools/build.py` generator, `tools/fazy.py` treść stron faz
- `sw.js`, `manifest.json`, `icons/`: instalacja na telefonie i offline

## Uwagi

- Repozytorium jest publiczne, więc każdy zobaczy wszystkie pliki, w tym ściągi S1–S4.
- WT-2/I i WT-5 to skany bez tekstu. Wyszukiwarka korzysta z ich OCR (średnia jakość), ale otwiera oryginalny skan.
- PDF-y do pracy bez zasięgu zapisujesz w przeglądarce PDF: menu ⋯ → „Zapisz offline”.

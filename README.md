# Wiki drogowa

Osobista baza wiedzy o budownictwie drogowym: 80 dokumentów (ustawy, rozporządzenia, WWiORB, WR-D, WT GDDKiA, Twoje ściągi), ok. 4000 stron tekstu z wyszukiwarką pełnotekstową, mapą tematyczną „pytanie → dokumenty” i trybem offline. Czysty HTML/JS, bez serwera i bez bazy danych, więc działa na darmowym GitHub Pages.

## Podgląd lokalny

Strona wczytuje dane przez `fetch`, więc nie działa po dwukliknięciu `index.html`. Uruchom mały serwer:

```
python -m http.server 8000
```

i wejdź na http://localhost:8000.

## Publikacja na GitHub Pages (darmowa domena `nazwa.github.io`)

1. Załóż konto na github.com (jeśli go nie masz).
2. Zainstaluj **GitHub Desktop** (desktop.github.com) i zaloguj się kontem GitHub.
3. W GitHub Desktop: *File → Add local repository…* → wskaż folder `wiki-drogowa`. Gdy program napisze, że to nie repozytorium, kliknij *create a repository*. Nazwa: `wiki-drogowa`.
4. Kliknij *Commit to main* (opis np. „Pierwsza wersja”), potem *Publish repository*. **Odznacz „Keep this code private”**. Darmowe Pages działają tylko dla repozytoriów publicznych.
5. Na github.com otwórz repozytorium → *Settings → Pages*. W *Build and deployment* wybierz *Source: Deploy from a branch*, *Branch: main*, folder */ (root)*, *Save*.
6. Po 1–2 minutach strona działa pod adresem `https://TWOJ-LOGIN.github.io/wiki-drogowa/`.

## Na telefonie

Otwórz adres w przeglądarce → menu → *Dodaj do ekranu głównego* (iPhone: Udostępnij → *Do ekranu początkowego*). W zakładce **O bazie → Zapisz offline** pobierzesz całą bazę (ok. 20 MB), by czytać i szukać bez zasięgu.

## Aktualizacja bazy

1. Zaktualizuj `00_INDEKS.md` i teksty w `_TEKST_MD` w folderze `uporzadkowane info drogi`.
2. W folderze `wiki-drogowa` uruchom `python tools/build.py`. Skrypt odtwarza `data/`.
3. W `sw.js` zwiększ numer w `const CACHE = 'wiki-drogowa-v1'` (np. na `v2`), żeby telefony pobrały nową wersję.
4. W GitHub Desktop: *Commit to main* → *Push origin*. Strona odświeży się po ok. minucie.

Nowy dokument dodajesz do tabeli w sekcji 3 indeksu (kolumny jak w istniejących wierszach) i, dla dokumentów spoza ściąg/ustaw/rozporządzeń, dopisujesz krótką nazwę w słowniku `SHORT` w `tools/build.py`.

## Struktura

- `index.html`, `style.css`, `app.js`: cała aplikacja (routing przez `#/…`)
- `data/registry.json`: rejestr dokumentów; `data/wiki.json`: sekcje indeksu (mapa, normy, luki); `data/docs/*.json`: tekst dokumentów strona po stronie; `data/search.json`: indeks wyszukiwarki
- `sw.js`, `manifest.json`, `icons/`: instalacja jako aplikacja i tryb offline
- `tools/build.py`: generator danych (wymaga Pythona 3, bez dodatkowych bibliotek)

## Uwagi

- Tekst jest wyciągnięty automatycznie z PDF/DOCX. Tabele i wzory mogą być zniekształcone, a skany WT-2/I i WT-5 mają tylko OCR o średniej jakości. Wartości liczbowe weryfikuj w oryginale.
- Repozytorium publiczne oznacza, że każdy zobaczy zawartość, w tym Twoje ściągi S1–S3. Jeśli nie chcesz ich publikować, usuń je przed publikacją z rejestru i z `data/docs/`.

# Treść przewodników po fazach inwestycji.
# Źródła: 00_INDEKS.md (mapa tematyczna, rejestr) i ściąga S3 (dokument × faza).
# Odwołanie: (ID dokumentu, kotwica, etykieta). Kotwica:
#   'art:22'  -> artykuł,   'par:11' -> paragraf §,   'pkt:8.2' -> punkt WWiORB,
#   'rozdz:2' -> rozdział,  'ch:6' -> rozdział 6 w WWiORB,  're:<regex>' -> dowolny wzorzec,  None -> strona 1.
# build.py zamienia kotwicę na numer strony w oryginalnym PDF.

# Macierz S3: ● = używasz stale, ○ = pomocniczo. Klucze: P projektowanie, W wykonawstwo, O odbiory.
MATRIX = {
    "U-PB": "PWO", "U-UDP": "Pwo", "U-ZRID": "P", "U-OOS": "Pw", "U-PZP": "PWo", "U-KC": "WO", "U-PORD": "PWo",
    "R-PTB": "Pwo", "R-PROJ": "Po", "R-STW": "PWo", "R-GEO": "Pw", "R-DB": "WO", "R-BIOZ": "pW",
    "WR-D-21": "Po", "WR-D-22-1": "P", "WR-D-22-2": "P", "WR-D-22-3": "P", "WR-D-22-4": "P",
    "WR-D-24-1": "P", "WR-D-24-2": "P", "WR-D-24-3": "P", "WR-D-31-1": "P", "WR-D-31-2": "P", "WR-D-31-3": "P",
    "WR-D-32-1": "P", "WR-D-32-2": "P", "WR-D-33": "P", "WR-D-61": "Pwo", "WR-D-62": "Pwo", "WR-D-63": "Pwo",
    "WR-D-64": "PwO", "WR-D-71-1": "P", "WR-D-71-2": "P", "WR-D-72-1": "P", "WR-D-72-2": "P", "X-LINK": "P",
    "WT-1": "pWO", "WT-2/I": "pWO", "WT-2/II": "WO", "WT-4": "pWO", "WT-5": "pWO", "WT-OCR": "WO",
    "S1": "P", "S2": "PWo", "S3": "PWO", "S4": "P",
}
# Wszystkie WWiORB: pomocniczo w projekcie (wzór STWiORB), stale w wykonawstwie i odbiorach.
WWIORB_PHASES = "pWO"

# WT i ściągi powiązane z grupą robót WWiORB
GROUP_EXTRA = {
    "Roboty ziemne": ["S2"],
    "Podbudowy": ["WT-4", "WT-5", "S2"],
    "Nawierzchnie": ["WT-1", "WT-2/I", "WT-2/II", "WR-D-64"],
    "Beton": [],
}

PHASES = [
 {
  "key": "projektowanie", "name": "Projektowanie",
  "sub": "Decyzje, projekt budowlany, projekt wykonawczy, parametry techniczne",
  "lead": "Projektant pracuje głównie na PTB, wytycznych WR-D i katalogach konstrukcji nawierzchni. Ustawy wyznaczają ścieżkę formalną: DŚU → ZRID (lub pozwolenie na budowę) → projekt budowlany → projekt wykonawczy i STWiORB.",
  "sections": [
   {"t": "Jak powstaje projekt drogi", "items": [
     {"q": "Przebieg projektowania drogi krok po kroku (Twoja notatka)", "r": [("S4", None, "S4")]},
     {"q": "Które dokumenty w której fazie i co ma pierwszeństwo przy sprzeczności", "r": [("S3", None, "S3")]},
   ]},
   {"t": "Ścieżka formalna", "items": [
     {"q": "Decyzja środowiskowa: istota, kolejność, wniosek, organ, treść", "r": [("U-OOS", "art:71", "art. 71"), ("U-OOS", "art:72", "art. 72"), ("U-OOS", "art:74", "art. 74"), ("U-OOS", "art:75", "art. 75"), ("U-OOS", "art:82", "art. 82")]},
     {"q": "Przedsięwzięcia wymagające oceny oddziaływania; raport OOŚ", "r": [("U-OOS", "art:59", "art. 59"), ("U-OOS", "art:66", "art. 66")]},
     {"q": "ZRID: organ i termin, wniosek, elementy decyzji, podział nieruchomości i odszkodowania", "r": [("U-ZRID", "art:11a", "art. 11a"), ("U-ZRID", "art:11d", "art. 11d"), ("U-ZRID", "art:11f", "art. 11f"), ("U-ZRID", "art:11i", "art. 11i"), ("U-ZRID", "art:12", "art. 12")]},
     {"q": "Pozwolenie na budowę", "r": [("U-PB", "art:28", "art. 28")]},
     {"q": "Kategorie dróg, zarządcy, zjazdy, pas drogowy", "r": [("U-UDP", "art:2", "art. 2"), ("U-UDP", "art:19", "art. 19"), ("U-UDP", "art:29", "art. 29"), ("U-UDP", "art:39", "art. 39"), ("U-UDP", "art:40", "art. 40"), ("S1", None, "S1")]},
     {"q": "Geotechnika: kategoria geotechniczna, opinia, dokumentacja badań podłoża, projekt geotechniczny", "r": [("R-GEO", None, "R-GEO"), ("S2", None, "S2 krok 0")]},
     {"q": "Przetarg, „zaprojektuj i wybuduj”, podstawa rozporządzenia o STWiORB i PFU", "r": [("U-PZP", "art:103", "art. 103"), ("R-STW", "rozdz:4", "PFU – Rozdz. 4")]},
   ]},
   {"t": "Projekt budowlany", "items": [
     {"q": "Projekt zagospodarowania terenu (PZT)", "r": [("R-PROJ", "rozdz:2", "Rozdz. 2")]},
     {"q": "Projekt architektoniczno-budowlany (PAB)", "r": [("R-PROJ", "rozdz:3", "Rozdz. 3")]},
     {"q": "Projekt techniczny (PT)", "r": [("R-PROJ", "rozdz:4", "Rozdz. 4")]},
     {"q": "Zmiana projektu: istotne i nieistotne odstąpienie", "r": [("U-PB", "art:36a", "art. 36a")]},
   ]},
   {"t": "Projekt wykonawczy, przedmiar, STWiORB", "items": [
     {"q": "Zakres i forma dokumentacji projektowej (w tym projekt wykonawczy i przedmiar)", "r": [("R-STW", "rozdz:2", "Rozdz. 2"), ("R-STW", "re:projekt(?:u|y)?\\s+wykonawcz", "projekt wykonawczy")]},
     {"q": "Zakres i forma STWiORB", "r": [("R-STW", "rozdz:3", "Rozdz. 3")]},
     {"q": "Wzorcowe WWiORB GDDKiA jako podstawa STWiORB (wymagania ogólne)", "r": [("W-M-00.00.00", None, "W-M-00.00.00")]},
     {"q": "Informacja BIOZ – przygotowuje projektant", "r": [("R-BIOZ", "par:2", "§ 2")]},
   ]},
   {"t": "Parametry techniczne drogi", "items": [
     {"q": "Klasy dróg; kategoria a klasa; prędkość do projektowania", "r": [("R-PTB", "par:11", "§ 11"), ("R-PTB", "par:12", "§ 12"), ("R-PTB", "par:13", "§ 13"), ("S1", None, "S1")]},
     {"q": "Szerokość pasa ruchu, pochylenie poprzeczne, łuk kołowy, niweleta", "r": [("R-PTB", "par:17", "§ 17"), ("R-PTB", "par:18", "§ 18"), ("R-PTB", "par:19", "§ 19"), ("R-PTB", "par:20", "§ 20")]},
     {"q": "Drogi zamiejskie: wymagania podstawowe, geometria, wyposażenie, przekroje", "r": [("WR-D-22-1", None, "WR-D-22-1"), ("WR-D-22-2", None, "22-2"), ("WR-D-22-3", None, "22-3"), ("WR-D-22-4", None, "22-4")]},
     {"q": "Ulice: planowanie, geometria i wyposażenie, katalog rozwiązań", "r": [("WR-D-24-1", None, "WR-D-24-1"), ("WR-D-24-2", None, "24-2"), ("WR-D-24-3", None, "24-3")]},
     {"q": "Skrajnia", "r": [("WR-D-21", None, "WR-D-21"), ("R-PTB", "re:^\\s*Skrajnia", "PTB – skrajnia")]},
   ]},
   {"t": "Skrzyżowania, węzły, zjazdy", "items": [
     {"q": "Skrzyżowania: wymagania, zwykłe i skanalizowane, ronda", "r": [("WR-D-31-1", None, "WR-D-31-1"), ("WR-D-31-2", None, "31-2"), ("WR-D-31-3", None, "31-3 ronda")]},
     {"q": "Węzły drogowe", "r": [("WR-D-32-1", None, "WR-D-32-1"), ("WR-D-32-2", None, "32-2")]},
     {"q": "Zjazdy, wyjazdy i wjazdy", "r": [("WR-D-33", None, "WR-D-33"), ("U-UDP", "art:29", "u.d.p. art. 29")]},
   ]},
   {"t": "Konstrukcja nawierzchni i podłoże", "items": [
     {"q": "Dobór konstrukcji wg KR i grupy nośności G1–G4 (podatne, półsztywne)", "r": [("WR-D-61", None, "WR-D-61")]},
     {"q": "Nawierzchnie sztywne (beton cementowy)", "r": [("WR-D-62", None, "WR-D-62")]},
     {"q": "Ruch bardzo lekki, parkingi, chodniki, drogi rowerowe", "r": [("WR-D-63", None, "WR-D-63")]},
     {"q": "Cechy powierzchniowe: tarcie, tekstura, równość", "r": [("WR-D-64", None, "WR-D-64")]},
     {"q": "Weryfikacja podłoża: wysadzinowość, E2, wzmocnienie, mrozoochrona (notatka – weryfikuj)", "r": [("S2", None, "S2")]},
     {"q": "Wymagania PTB dla nawierzchni", "r": [("R-PTB", "re:^\\s*Nawierzchnie\\s*$", "PTB – nawierzchnie")]},
   ]},
   {"t": "Odwodnienie, oświetlenie, organizacja ruchu", "items": [
     {"q": "Odwodnienie: wymagania, odwodnienie powierzchniowe i wgłębne", "r": [("WR-D-71-1", None, "WR-D-71-1"), ("WR-D-71-2", None, "71-2")]},
     {"q": "Oświetlenie: wymagania, katalog rozwiązań", "r": [("WR-D-72-1", None, "WR-D-72-1"), ("WR-D-72-2", None, "72-2")]},
     {"q": "Organizacja ruchu (SOR). Rozporządzeń o znakach i zarządzaniu ruchem nie ma w bazie.", "r": [("U-PORD", None, "PoRD")]},
   ]},
  ],
 },
 {
  "key": "wykonawstwo", "name": "Wykonawstwo",
  "sub": "Budowa: plac budowy, dziennik, umowa, materiały, technologie",
  "lead": "Inżynier budowy pracuje na umowie i WWiORB, a do WT i norm PN-EN sięga po szczegóły (kryteria, metody badań). Jeśli WWiORB powołuje konkretną wersję WT/WR-D, obowiązuje ta wersja.",
  "sections": [
   {"t": "Rozpoczęcie robót", "items": [
     {"q": "Przekazanie placu budowy", "r": [("W-M-00.00.00", "pkt:1.5.1", "W-M pkt 1.5.1"), ("U-KC", "art:652", "KC art. 652")]},
     {"q": "Czasowa organizacja ruchu (TOR); zajęcie pasa drogowego", "r": [("W-M-00.00.00", "pkt:1.5.3", "W-M pkt 1.5.3"), ("U-UDP", "art:40", "u.d.p. art. 40")]},
     {"q": "Ochrona środowiska na budowie; warunki decyzji środowiskowej", "r": [("W-M-00.00.00", "pkt:1.5.5", "W-M pkt 1.5.5"), ("U-OOS", "art:82", "OOŚ art. 82")]},
     {"q": "Plan BIOZ – sporządza kierownik budowy; roboty, które plan uwzględnia", "r": [("R-BIOZ", "par:3", "§ 3"), ("R-BIOZ", "par:6", "§ 6")]},
   ]},
   {"t": "Kierownik budowy i dokumenty budowy", "items": [
     {"q": "Obowiązki kierownika budowy", "r": [("U-PB", "art:22", "PB art. 22")]},
     {"q": "Dziennik budowy (papier / EDB), wpisy", "r": [("U-PB", "art:45", "PB art. 45"), ("U-PB", "art:47a", "art. 47a"), ("R-DB", "rozdz:3", "R-DB Rozdz. 3 wpisy"), ("R-DB", "rozdz:4", "Rozdz. 4 EDB")]},
     {"q": "Dokumenty budowy: dziennik, rejestr obmiarów, dokumenty laboratoryjne", "r": [("W-M-00.00.00", "pkt:6.7", "W-M pkt 6.7")]},
     {"q": "Zmiana projektu w toku budowy", "r": [("U-PB", "art:36a", "PB art. 36a")]},
   ]},
   {"t": "Umowa i podwykonawcy", "items": [
     {"q": "Umowa o roboty budowlane; podwykonawcy i solidarna odpowiedzialność inwestora", "r": [("U-KC", "art:647", "KC art. 647"), ("U-KC", "art:647^1", "art. 647¹")]},
     {"q": "Gwarancja zapłaty", "r": [("U-KC", "art:649^1", "KC art. 649¹–649⁵")]},
     {"q": "Przeszkody na budowie – zawiadomienie", "r": [("U-KC", "art:651", "KC art. 651")]},
     {"q": "Umowa w sprawie zamówienia publicznego: zmiany umowy, podwykonawstwo", "r": [("U-PZP", "re:^\\s*DZIAŁ\\s+VII\\s*$", "Pzp Dział VII")]},
     {"q": "Warunki umowy (FIDIC, warunki szczególne) – brak w bazie; sprawdzaj w dokumentach kontraktu.", "r": []},
   ]},
   {"t": "Materiały i badania", "items": [
     {"q": "Dopuszczenie materiałów i wyrobów; materiały nieodpowiadające wymaganiom", "r": [("W-M-00.00.00", "pkt:2.1", "W-M pkt 2.1"), ("W-M-00.00.00", "pkt:2.4", "pkt 2.4")]},
     {"q": "System jakości, pobieranie próbek, badania Wykonawcy, badania przed przystąpieniem do robót", "r": [("W-M-00.00.00", "pkt:6.1", "W-M pkt 6.1"), ("W-M-00.00.00", "pkt:6.4.1", "6.4.1"), ("W-M-00.00.00", "pkt:6.4.5", "6.4.5")]},
     {"q": "Kruszywa do MMA; mieszanki mineralno-asfaltowe; wykonanie warstw asfaltowych", "r": [("WT-1", None, "WT-1"), ("WT-2/I", None, "WT-2/I"), ("WT-2/II", None, "WT-2/II")]},
     {"q": "Mieszanki niezwiązane; mieszanki związane spoiwem hydraulicznym", "r": [("WT-4", None, "WT-4"), ("WT-5", None, "WT-5")]},
     {"q": "Sprawdzenie układu warstw konstrukcji na budowie", "r": [("WR-D-61", None, "WR-D-61"), ("WR-D-62", None, "62"), ("WR-D-63", None, "63")]},
   ]},
  ],
  "auto": {"t": "Technologie robót wg WWiORB", "d": "Każda pozycja otwiera oryginalny PDF od wskazanego rozdziału.", "chapters": [("2", "Materiały"), ("3", "Sprzęt"), ("5", "Wykonanie robót")]},
 },
 {
  "key": "odbiory", "name": "Odbiory",
  "sub": "Rodzaje odbiorów, badania, kryteria i dokumenty odbiorowe",
  "lead": "Odbiór to sprawdzenie zgodności z WWiORB (badania, tolerancje), zgodności z projektem (geodezja) i kompletności dokumentów wg umowy. Zasady odbiorów w konkretnym kontrakcie określa umowa – jej nie ma w bazie.",
  "sections": [
   {"t": "Rodzaje odbiorów", "items": [
     {"q": "Rodzaje odbiorów robót", "r": [("W-M-00.00.00", "pkt:8.1", "W-M pkt 8.1")]},
     {"q": "Odbiór robót zanikających i ulegających zakryciu", "r": [("W-M-00.00.00", "pkt:8.2", "W-M pkt 8.2")]},
     {"q": "Odbiór częściowy", "r": [("W-M-00.00.00", "pkt:8.3", "W-M pkt 8.3"), ("U-KC", "art:654", "KC art. 654")]},
     {"q": "Odbiór końcowy i dokumenty do odbioru końcowego", "r": [("W-M-00.00.00", "pkt:8.4", "W-M pkt 8.4"), ("W-M-00.00.00", "pkt:8.4.2", "8.4.2 dokumenty")]},
     {"q": "Obowiązek odbioru w umowie o roboty budowlane", "r": [("U-KC", "art:647", "KC art. 647")]},
   ]},
   {"t": "Badania i pomiary", "items": [
     {"q": "Badania Wykonawcy, kontrolne, dodatkowe, arbitrażowe", "r": [("W-M-00.00.00", "pkt:6.4.1", "6.4.1"), ("W-M-00.00.00", "pkt:6.4.2", "6.4.2"), ("W-M-00.00.00", "pkt:6.4.3", "6.4.3"), ("W-M-00.00.00", "pkt:6.4.4", "6.4.4")]},
     {"q": "Przykład: badania w czasie robót i cechy geometryczne warstwy ścieralnej z AC", "r": [("W-D-05.03.05B", "pkt:6.7", "pkt 6.7"), ("W-D-05.03.05B", "pkt:6.8", "pkt 6.8")]},
     {"q": "Wymagane właściwości warstw z mieszanek mineralno-asfaltowych", "r": [("WT-2/II", "re:^\\s*8\\.?\\s+Wymagan", "WT-2/II pkt 8")]},
     {"q": "Cechy powierzchniowe: tarcie, tekstura, równość podłużna i poprzeczna", "r": [("WR-D-64", None, "WR-D-64")]},
     {"q": "Wskaźnik zagęszczenia Is, nośność podłoża (notatka – weryfikuj w WWiORB)", "r": [("W-D-02.00.01", "ch:6", "D-02.00.01 rozdz. 6"), ("W-D-02.03.01", "ch:6", "nasypy rozdz. 6"), ("S2", None, "S2")]},
   ]},
   {"t": "Zakończenie budowy", "items": [
     {"q": "Użytkowanie, zawiadomienie o zakończeniu budowy, pozwolenie na użytkowanie", "r": [("U-PB", "art:54", "PB art. 54"), ("U-PB", "art:55", "art. 55"), ("U-PB", "art:57", "art. 57")]},
     {"q": "Dziennik budowy i rejestr obmiarów jako dokumenty odbiorowe", "r": [("W-M-00.00.00", "pkt:6.7", "W-M pkt 6.7"), ("R-DB", None, "R-DB")]},
   ]},
  ],
  "auto": {"t": "Kontrola jakości i odbiór wg WWiORB", "d": "Dla każdej pozycji robót: rozdział 6 (kontrola jakości – badania, częstotliwość, tolerancje), 7 (obmiar) i 8 (odbiór).", "chapters": [("6", "Kontrola jakości"), ("7", "Obmiar"), ("8", "Odbiór")]},
 },
]

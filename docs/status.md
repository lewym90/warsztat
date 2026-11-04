# Warsztat: status (2026-11-04)

Nowa szata graficzna (Dark Luxury), ekrany Start i Naprawy, 5 pozycji dolnej nawigacji: patrz KONTYNUACJA.md, sekcja 3.0.


Prywatna aplikacja PWA do napraw samochodów rodziny. Adres: https://lewym90.github.io/warsztat/ (repo lewym90/warsztat, gałąź main, wdrożenie ok. 1–2 min). Pierwsze auto: BMW X5 E53 3.0d 2003 (M57). Interfejs po polsku, jasny motyw (kość słoniowa, złoty akcent).

## Co jest zrobione
- **Nawigacja:** garaż, ekran auta z obrotowym widokiem 360° i kropkami stref (drzwi, maska i przód, wnętrze, klapa i tył, koła i hamulce, progi i podwozie), ekran strefy z listą napraw (wyszukiwarka, grupy), lewa/prawa strona i przód/tył dla drzwi. Katalog: 260 pozycji, 14 napraw z kartami (2 pełne, 12 częściowych).
- **Ekran naprawy:** talia kart przesuwana palcem (podsumowanie, ostrzeżenia, narzędzia, części, filmy, kroki, po montażu, źródła). Jeden krok = jedna karta przewijana w pionie. Postęp = pozycja talii (cofnięcie cofa postęp). Zdjęcia powiększane dotknięciem, klipy w oknie, przycisk „Gdzie?” z rysunkiem drzwi, spis kart.
- **Offline na dziś:** zapis zdjęć i grafik na 24 h, automatyczne usunięcie; filmy YouTube nie są zapisywane (lista do pobrania w aplikacji YouTube).
- **Funkcje robocze (2026-11-01):** blokada wygaszania ekranu, wielkość liter, motyw jasny/ciemny/auto, minutnik w krokach, „Wznów ostatnią naprawę”, postęp na liście napraw, zdjęcia i notatki w krokach (ze zdjęciami z demontażu w krokach montażu), karta bezpieczeństwa, plan „Dzisiaj robię” z jedną listą zakupów i zapisem offline, wyszukiwarka globalna, książka serwisowa z propozycją wpisu po naprawie, kopie (plik ze zdjęciami, migawka dobowa, przypomnienie tygodniowe), synchronizacja QR/plik, podpowiedź „Dodaj do ekranu głównego”. Kod podzielony na moduły (`js/screens/*`), testy w `tests/`.
- **Granice (uczciwie):** iOS nie dzwoni minutnikiem w tle (dzwonek działa przy aplikacji na ekranie, po powrocie pojawia się komunikat); kopia automatycznie poza urządzeniem jest w PWA niemożliwa, więc: migawka dobowa lokalna plus tygodniowe przypomnienie z zapisem jednym dotknięciem; kody QR przenoszą dane bez zdjęć (zdjęcia przez plik).
- **Nie zrobione z listy pomysłów:** moduł diagnostyczny / wyszukiwanie po objawie (pkt 14): ODŁOŻONY do czasu skończenia bazy napraw, ustalenia w `modul-diagnostyczny.md`, czytanie na głos (5), 18, 19, 21–25.
- **Odświeżanie:** automatyczne (service worker) i przycisk „Odśwież aplikację teraz”.
- **Narzędzia:** `tools/build.py` (walidacja i generowanie service workera), `tools/smoke.py` (test w przeglądarce, zgodny z nowym interfejsem).

- **Źródła (2026-11-02):** na dole ekranu auta wiersz „Źródła” otwiera pełnoekranową listę: pogrupowane źródła (instrukcje BMW, artykuły, fora, filmy, części), nicki autorów cytowanych wypowiedzi tam, gdzie są znane, lista kart, w których źródło użyto, link do oryginału i wyszukiwarka; osobno zdjęcia, filmy i odnośniki z kredytami. Dane liczy `tools/build.py` (`sourceUse`, `mediaCredits` w pack.json). Karty napraw nie powtarzają autorów.

## Stan napraw (BMW E53)
| Naprawa | Status | Kroki | Zdjęcia | Klipy | Uwagi |
|---|---|---|---|---|---|
| Klamka zewnętrzna, przód | pełne | 26 | 34 | 28 | 2 filmy |
| Tapicerka drzwi przednich | pełne | 15 | 24 | 11 | |
| Klamka wewnętrzna | częściowe | 10 | 5 | 0 | brak zdjęć i filmu z E53 |
| Podnośnik szyby, przód | częściowe | 14 | 7 | 0 | film M Tech Guy tylko jako kafelek (brak czasów) |
| Siłownik zamka, przód | częściowe | 17 | 4 | 0 | wątek Xoutpost; zdjęcia z galerii autora, niesprawdzone |
| Tapicerka drzwi tylnych | częściowe | 13 | 12 | 0 | Pelican Parts; adresy zdjęć z wzorca nazw, niesprawdzone |
| Klamka zewnętrzna, tył | częściowe | 12 | 0 | 0 | tylko instrukcja fabryczna |
| Podnośnik szyby, tył | częściowe | 11 | 0 | 0 | TIS + Xoutpost + FCP Euro; bez mediów |
| Silnik podnośnika szyby | częściowe | 7 | 0 | 0 | TIS tył i przód + Xoutpost; bez mediów |
| Szyba w drzwiach: klips | częściowe | 7 | 0 | 0 | Xoutpost + FCP Euro + TIS tył; bez mediów |
| Lusterko: wymiana całości | częściowe | 7 | 0 | 0 | TIS + Xoutpost; bez mediów |
| Szkło lusterka | częściowe | 6 | 0 | 0 | TIS + Xoutpost; bez mediów |
| Uszczelka obwodowa drzwi | częściowe | 6 | 0 | 0 | jedna relacja forum (Xoutpost); bez mediów |
| Uszczelki szyby (listwy) | częściowe | 4 | 0 | 0 | TIS; bez mediów |

Tylko „pełne” liczą się jako gotowe w aplikacji.

## Do zrobienia (wymaga przeglądarki w aplikacji desktopowej)
- Transkrypty i wycinki filmów: klamka wewnętrzna, podnośnik szyby, siłownik zamka, tapicerka tył (kryteria wyboru filmu w `standard-naprawy.md`).
- Sprawdzenie ładowania zdjęć na żywo (Pelican Parts, Xoutpost, stevedu.com) oraz offline na telefonie.
- Teksty wszystkich 14 kart Drzwi są kompletne (kroki, źródła, części, lista „nieznane”). Do „pełne” brakuje mediów: zdjęcia i klipsy przy krokach, sprawdzenie ich ładowania na żywo.
- Strefa Drzwi: 14 z 53 pozycji ma kartę; pozostałe 39 to wpisy katalogu z krótkim opisem („Wkrótce”) i czekają na opracowanie ze źródeł.
- Pozostałe strefy (maska, wnętrze, tył, koła, podwozie, serwis): katalog z krótkimi opisami objawów, bez kart napraw.
- Diagnostyka: szkielet schematu i słownik objawów w `docs/diag/` (bez przyczyn; pełne drzewka po zakończeniu bazy).
- Auta rodziny (lista od użytkownika).
- Momenty dokręcenia: brak w źródłach, są w listach „unknown”.

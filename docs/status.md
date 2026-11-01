# Warsztat: status (2026-11-01)

Prywatna aplikacja PWA do napraw samochodów rodziny. Adres: https://lewym90.github.io/warsztat/ (repo lewym90/warsztat, gałąź main, wdrożenie ok. 1–2 min). Pierwsze auto: BMW X5 E53 3.0d 2003 (M57). Interfejs po polsku, jasny motyw (kość słoniowa, złoty akcent).

## Co jest zrobione
- **Nawigacja:** garaż, ekran auta z obrotowym widokiem 360° i kropkami stref (drzwi, maska i przód, wnętrze, klapa i tył, koła i hamulce, progi i podwozie), ekran strefy z listą napraw (wyszukiwarka, grupy), lewa/prawa strona i przód/tył dla drzwi. Katalog: ok. 260 pozycji, 7 napraw z kartami.
- **Ekran naprawy:** talia kart przesuwana palcem (podsumowanie, ostrzeżenia, narzędzia, części, filmy, kroki, po montażu, źródła). Jeden krok = jedna karta przewijana w pionie. Postęp = pozycja talii (cofnięcie cofa postęp). Zdjęcia powiększane dotknięciem, klipy w oknie, przycisk „Gdzie?” z rysunkiem drzwi, spis kart.
- **Offline na dziś:** zapis zdjęć i grafik na 24 h, automatyczne usunięcie; filmy YouTube nie są zapisywane (lista do pobrania w aplikacji YouTube).
- **Odświeżanie:** automatyczne (service worker) i przycisk „Odśwież aplikację teraz”.
- **Narzędzia:** `tools/build.py` (walidacja i generowanie service workera), `tools/smoke.py` (test w przeglądarce, zgodny z nowym interfejsem).

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

Tylko „pełne” liczą się jako gotowe w aplikacji.

## Do zrobienia (wymaga przeglądarki w aplikacji desktopowej)
- Transkrypty i wycinki filmów: klamka wewnętrzna, podnośnik szyby, siłownik zamka, tapicerka tył (kryteria wyboru filmu w `standard-naprawy.md`).
- Sprawdzenie ładowania zdjęć na żywo (Pelican Parts, Xoutpost, stevedu.com) oraz offline na telefonie.
- Dalej w strefie Drzwi: uszczelki, lusterko, szyba w drzwiach, silnik podnośnika, podnośnik tył i reszta listy; pozostałe strefy mają tylko katalog.
- Auta rodziny (lista od użytkownika).
- Momenty dokręcenia: brak w źródłach, są w listach „unknown”.

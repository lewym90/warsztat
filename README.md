# Warsztat

Prywatne centrum napraw (PWA): garaż aut, szkic auta z klikalnymi strefami, szkic drzwi, instrukcje krok po kroku.
Bez zależności, bez serwera – statyczne pliki.

## Publikacja na GitHub Pages
1. Utwórz repozytorium (np. `warsztat`) na GitHubie.
2. Wgraj całą zawartość tego folderu (z plikiem `.nojekyll`).
3. Settings → Pages → Source: `main` / root.
4. Otwórz adres `https://TWOJ-LOGIN.github.io/warsztat/` na iPhonie w Safari → Udostępnij → „Dodaj do ekranu początkowego".

## Zmiany w treści
Po edycji plików w `data/` uruchom `python3 tools/build.py` – waliduje paczki (źródła, kotwice, numery OE),
odświeża indeks napraw i listę plików offline (`sw.js`).
Test: `python3 tools/smoke.py /tmp/shots` (Playwright).

## Nowe auta
W aplikacji: Dodaj auto → brak paczki → „Zamów treści". Skopiowany tekst przekaż Claude; paczka trafia do `data/packs/<id>/`.

## Prywatność
Do repozytorium nie wrzucaj numerów VIN ani danych osobowych. Auta i postępy są w `localStorage` telefonu
(kopia: Więcej → Eksport).

## Wiarygodność
Każdy krok i część ma poziom pewności (high/med/low) i źródło. Momenty dokręcania i numery części oznaczone jako niepotwierdzone
sprawdź przed zakupem/montażem.

## Kontynuacja pracy
Pełny stan projektu, zasady i plan dalszych prac: `KONTYNUACJA.md` (dla nowej sesji Claude zaczyna się od niego, jest też krótki `CLAUDE.md`).

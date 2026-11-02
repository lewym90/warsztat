# Warsztat: instrukcja dla Claude

Zanim zaczniesz jakąkolwiek pracę w tym repozytorium, **przeczytaj w całości `KONTYNUACJA.md`** (stan projektu, zasady pracy z właścicielem, plan dalszych prac, polecenia) oraz dokumenty w `docs/`. Nie zaczynaj od zgadywania: wszystko, co trzeba wiedzieć, jest w tych plikach.

Skrót zasad (pełna wersja w `KONTYNUACJA.md`, sekcja 2): praca „od A do Z” bez zgłaszania czegoś jako zrobione, gdy jest zrobione częściowo; żadnych zgadywanych momentów dokręcania i numerów części (brak źródła = lista `unknown`); status „pełne” tylko dla napraw spełniających cały standard; źródła i autorzy zawsze zaznaczeni; żadnych haseł ani kluczy w plikach.

Po każdej zmianie: `python3 tools/build.py`, `node --test tests/*.test.mjs`, `bash tools/lint.sh`, a przy zmianach interfejsu `python3 tools/smoke.py /tmp/shots`. Zmiany zatwierdzaj i wypychaj (`git push origin HEAD:main`) i aktualizuj `KONTYNUACJA.md` oraz `docs/status.md`.

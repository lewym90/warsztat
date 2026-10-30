# Warsztat: standard przygotowania naprawy

Wzorzec: `data/packs/bmw-e53/repairs/klamka-zewn-przod.json` (26 kroków). Każda nowa naprawa ma być na tym poziomie. Test: czy osoba, która robi to pierwszy raz, wykona naprawę wyłącznie z tego, co widzi w aplikacji?

## 1. Zbieranie materiału (przed pisaniem JSON)
Nie piszemy z pamięci. Dla każdej naprawy zbieramy:
1. **Filmy (1 do 3)**, ocena kryteriów poniżej. Z każdego bierzemy pełną transkrypcję z czasami (panel transkrypcji lub napisy przy przyspieszeniu odtwarzania ×8) i rozdziały w sekundach.
2. **Artykuły ze zdjęciami** (Pelican Parts, forum DIY: Xoutpost itp.): opis każdego zdjęcia, adres pliku, czy da się go hotlinkować (sprawdzić w przeglądarce, `referrerpolicy="no-referrer"`).
3. **Wątki forów**: pułapki, tipy, błędy, ile zajęło, ile kosztuje część, OE vs zamiennik.
4. **Numer OE części** (11 cyfr) z co najmniej jednego źródła i strona auta (lewa/prawa), wersje (lifting).
5. **Narzędzia** potwierdzone w co najmniej dwóch źródłach; rozmiary kluczy.

### Kryteria wyboru filmu (nie byle jaki)
- Dokładnie ten model i generacja (np. E53), ta sama operacja i ten sam silnik/wersja, jeśli ma znaczenie.
- Pokazuje całość od początku do końca, z montażem, nie tylko demontaż.
- Dobra jakość obrazu, narrator pokazuje ręce i miejsca śrub z bliska.
- Ma transkrypcję lub napisy, żeby dało się przypisać fragmenty do kroków.
- Duża liczba wyświetleń i pozytywne komentarze; brak błędów technicznych (np. niebezpieczne skróty przy poduszce powietrznej).
- Dwa filmy, gdy się uzupełniają (popularny i krótki + dłuższy i dokładny). Jeśli filmy się różnią (np. akumulator odłączony lub nie), opisz konflikt w kroku i wybierz wariant ostrożniejszy.
- Nie dodajemy filmów „byle jakich” tylko po to, by były.

## 2. Struktura pliku naprawy
- Kroki w **fazach** (`phase`): przygotowanie → dostęp (np. boczek) → demontaż → montaż → test i składanie.
- Pola kroku: `phase`, `t`, `view`, `focus`, `min`, `conf`, `src`, `b` (krótki opis), `see` (co zobaczysz i gdzie), `how` (numerowane podkroki, jedna czynność na linię), `mistakes`, `check` (jak poznać, że gotowe), `tip`, `tools` (chipy), `warn`, `danger` (poduszka/akumulator), `link` (do innej karty), `media`.
- Zasada: krok nie może brzmieć „załóż mechanizm, wymaga cierpliwości”. Ma mówić, co, gdzie, w jakiej kolejności, jakim narzędziem i jak sprawdzić.
- Każdy krok ma `conf` i `src`. Nie zgadujemy momentów dokręcenia: brak w źródłach = wpis w `unknown`.
- Części z OE (11 cyfr) i `conf`. Rada OE vs zamiennik, jeśli źródła ją dają.
- Pierwszy krok zawiera kafelki filmów. Ostatnie kroki: test przed złożeniem i kontrola końcowa.

## 3. Media w krokach
Każdy krok ma co najmniej jedno zdjęcie lub klip. Typy w `media`:
- `photo`: `{type, url, cap, credit, page}`. Zdjęcia są hotlinkowane, **nie zapisujemy ich w repozytorium** (prawa autorów). Podpis opisuje, co widać i na co zwrócić uwagę; `credit` i `page` zawsze.
- `video`: `{type:'video', id, t, e, cap, credit}`. Klip od sekundy do sekundy dla tego kroku, nie cały film.
- `film`: `{type:'film', id, len, cap, credit}`. Kafelek całego filmu w kroku 1. Etykiety „Film naprawy 1, 2, 3…” nadaje się automatycznie w kolejności. Kafelek otwiera YouTube w nowej karcie.
- `link`: `{type, url, label, credit}`.
Po dodaniu: sprawdzić w przeglądarce, że wszystkie zdjęcia się ładują (Image onload).

## 4. Proces
1. Zbierz materiał (sekcja 1), zapisz najważniejsze fakty.
2. Napisz JSON według sekcji 2, przypisz media z sekcji 3.
3. `python3 tools/build.py` (walidacja źródeł, mediów, OE) oraz `python3 tools/smoke.py /tmp/shots`, obejrzyj zrzuty.
4. Commit i `git push origin HEAD:main` z `/home/claude/repo`.
5. Na żywo: wyrejestruj service worker, wyczyść cache, odśwież dwa razy i sprawdź (Pages ma cache).
6. Raport do użytkownika po polsku: co zmieniono i czego nie zweryfikowano.

## 5. Uwagi stałe
- Interfejs po polsku, wygląd premium (czerń + szampański złoty).
- Poduszka powietrzna: zalecamy odkręcić i zawiesić bez odpinania wtyczki. Odpinanie tylko po odłączeniu akumulatora i odczekaniu co najmniej 30 minut.
- Kolejne naprawy robimy po jednej, dopracowanej, a nie wiele szkiców.

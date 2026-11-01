# Warsztat: standard przygotowania naprawy

Wzorzec: `data/packs/bmw-e53/repairs/klamka-zewn-przod.json` (26 kroków). Każda nowa naprawa ma być na tym poziomie. Test: czy osoba, która robi to pierwszy raz, wykona naprawę wyłącznie z tego, co widzi w aplikacji?

## 1. Zbieranie materiału (przed pisaniem JSON)
Nie piszemy z pamięci. Dla każdej naprawy zbieramy:
1. **Filmy (1 do 3)**, ocena kryteriów poniżej. Z każdego bierzemy pełną transkrypcję z czasami i rozdziały w sekundach. Transkrypt czytamy w panelu przeglądarki w aplikacji desktopowej: włączamy napisy (CC), przeskakujemy `video.currentTime` co kilka sekund i odczytujemy `.ytp-caption-segment`; przy każdym przeskoku czekamy ok. 2,5 s, a panel musi być widoczny (ukryty gubi napisy). Pobieranie przez adres napisów (`baseUrl`) zwraca pustą odpowiedź.
2. **Artykuły ze zdjęciami** (Pelican Parts, forum DIY: Xoutpost itp.): opis każdego zdjęcia, adres pliku, czy da się go hotlinkować (sprawdzić w przeglądarce, `referrerpolicy="no-referrer"`). Pelican Parts nie daje się pobrać narzędziem WebFetch; czytamy go w panelu przeglądarki (`document.body.innerText` i lista `img`).
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
- Pola kroku: `phase`, `t`, `view`, `focus`, `min`, `conf`, `src`, `b` (krótki opis), `see` (co zobaczysz i gdzie), `how` (numerowane podkroki, jedna czynność na linię), `mistakes`, `check` (jak poznać, że gotowe), `tip`, `tools` (chipy), `warn` (tekst ostrzeżenia lub `true` = „zabezpiecz lakier”), `danger` (poduszka/akumulator; tekst lub `true`), `link` (do innej karty), `media`.
- `focus` to kotwice z `js/art-door.js`; muszą pasować do `view` (`outer.*` do `outer`, `card.*` do `card`, `inner.*` do `inner`), inaczej build.py zgłasza błąd.
- Zasada: krok nie może brzmieć „załóż mechanizm, wymaga cierpliwości”. Ma mówić, co, gdzie, w jakiej kolejności, jakim narzędziem i jak sprawdzić.
- Każdy krok ma `conf` i `src`. Nie zgadujemy momentów dokręcenia: brak w źródłach = wpis w `unknown`.
- Części z OE (11 cyfr) i `conf`. Rada OE vs zamiennik, jeśli źródła ją dają.
- Pierwszy krok zawiera kafelki filmów. Ostatnie kroki: test przed złożeniem i kontrola końcowa.
- `completeness`: `pełne` tylko gdy spełnia cały ten standard (zdjęcia/klipy w krokach, film, transkrypt). Inaczej `częściowe` lub `szkic`. Liczniki „Gotowe” liczą wyłącznie `pełne`.

## 3. Media w krokach
Każdy krok ma co najmniej jedno zdjęcie lub klip. Typy w `media`:
- `photo`: `{type, url, cap, credit, page}`. Zdjęcia są hotlinkowane, **nie zapisujemy ich w repozytorium** (prawa autorów). Podpis opisuje, co widać i na co zwrócić uwagę; `credit` i `page` zawsze.
- `video`: `{type:'video', id, t, e, cap, credit}`. Klip od sekundy do sekundy dla tego kroku, nie cały film. Otwiera się w oknie na karcie.
- `film`: `{type:'film', id, len, cap, credit}`. Kafelek całego filmu w kroku 1. Etykiety „Film naprawy 1, 2, 3…” nadaje się automatycznie w kolejności i trafiają na osobną kartę „Obejrzyj przed pracą”.
- `link`: `{type, url, label, credit}`.
Po dodaniu: sprawdzić w przeglądarce, że wszystkie zdjęcia się ładują (Image onload). Środowisko chmurowe blokuje zdjęcia z obcych stron, więc to wymaga panelu przeglądarki lub telefonu.

## 4. Wyświetlanie: talia kart (od 2026-11-01)
- Ekran naprawy to talia kart przesuwana palcem poziomo (CSS scroll-snap). Kolejność: Podsumowanie, Ostrzeżenia (jeśli są), Narzędzia (odhaczane), Części (z „Kopiuj”), Filmy (jeśli są), kroki, Po montażu, Źródła.
- **Jeden krok = jedna karta przewijana w pionie.** Nie dzielimy kroku na kilka ekranów (użytkownik odrzucił taki układ). Kolejność w karcie: pasek (faza, krok x z y, czas, pewność), tytuł, ostrzeżenia, zdjęcie (dotknięcie otwiera galerię), klipy, numerowane czynności, opis, „Co zobaczysz”, narzędzia, typowe błędy, kontrola, wskazówka, źródła.
- **Postęp = pozycja talii.** Krok jest „zrobiony”, gdy użytkownik przesunął się poza jego kartę; cofnięcie karty cofa postęp. Nie ma przycisku „Zrobione”. Postęp: `prog.pos`, `prog.steps[i]` liczone automatycznie.
- Przycisk „Gdzie?” w rogu pokazuje rysunek drzwi z celownicą (anchory) i powiększa się po dotknięciu.
- Spis kart (ikona listy lub pasek na dole): skok do dowolnego kroku, zapis offline, wyzerowanie postępu.

## 5. Offline „na dziś” (od 2026-11-01)
- Przycisk „Zapisz offline” (na karcie naprawy i w strefie) zapisuje na 24 h zdjęcia, klatki 360° i grafiki drzwi do pamięci `offline-24h` (service worker serwi je przy braku sieci), a po dobie usuwa je automatycznie. Teksty kart są w pamięci service workera zawsze.
- **Filmów YouTube nie zapisujemy** (zasady serwisu). Panel pokazuje listę filmów do pobrania w aplikacji YouTube (Premium).
- Zdjęcia z obcych stron zapisują się przez CORS, a gdy serwer go nie daje, jako odpowiedź nieprzezroczysta; zdjęć, które się nie zapiszą, nie da się wykryć w 100%.

## 5b. Funkcje robocze w talii (od 2026-11-01)
- **Karta bezpieczeństwa** (ogólna, z odhaczaniem; dla napraw z poduszką powietrzną dodatkowy punkt o odczekaniu). Treść bez wymyślonych liczb: wartości zawsze z kroków i źródeł (`js/safety.js`).
- **Minutnik:** krok z zapisanym czasem oczekiwania („odczekaj 30 minut”) dostaje przycisk minutnika (`suggestMinutes`). Przy pisaniu napraw zapisuj czas oczekiwania słowami „odczekaj/poczekaj … N minut”, wtedy minutnik pojawi się sam.
- **Zdjęcia i notatki użytkownika** w każdym kroku (IndexedDB i `prog.notes`). W krokach montażu (faza zawiera „montaż”, „składanie”, „założ”, „test”) pojawia się pasek zdjęć zrobionych w demontażu. Nazywaj fazy zgodnie z tą regułą (`isAssembly` w `repair.js`).
- **Ustawienia:** motyw jasny/ciemny/auto, wielkość liter A−/A+ (skaluje karty naprawy), blokada wygaszania ekranu (Wake Lock).
- **Plan „Dzisiaj robię”:** lista części i narzędzi bez powtórzeń z kilku napraw (klucz części: numer OE, narzędzia: nazwa), podpowiedź kolejności, gdy kilka napraw wymaga zdjęcia boczka.
- **Książka serwisowa**, wpis proponowany po montażu (część z karty trafia do wpisu).
- **Szukaj:** indeks kroków, części (także numery OE ze spacjami), narzędzi. Wyniki prowadzą do kroku (`?step=`). Dopasowanie po rdzeniu słowa (polska fleksja).
- **Kopie:** plik v2 (stan, notatki, zdjęcia), migawka lokalna raz na dobę (5 ostatnich), przypomnienie raz w tygodniu o zapisie do Plików, synchronizacja telefon↔komputer przez kody QR (bez zdjęć) lub plik.
- **Testy:** `node --test tests/*.test.mjs` (łączenie stanów, kody QR, plan, szukaj, store, minutnik, kontrast WCAG AA palet), `sh tools/lint.sh`, `python3 tools/smoke.py`.

## 6. Proces
1. Zbierz materiał (sekcja 1), zapisz najważniejsze fakty.
2. Napisz JSON według sekcji 2, przypisz media z sekcji 3.
3. `python3 tools/build.py` (walidacja źródeł, mediów, OE, katalogu) oraz `python3 tools/smoke.py /tmp/shots` (przechodzi garaż, strefę, talię kart, cofanie postępu, rozmiary ekranów); obejrzyj zrzuty.
4. Commit i `git push origin HEAD:main` z `/home/claude/repo`.
5. Na żywo: wyrejestruj service worker, wyczyść cache, odśwież dwa razy i sprawdź (Pages ma cache).
6. Raport do użytkownika po polsku: co zmieniono i czego nie zweryfikowano. Nie pisać „zrobione”, jeśli część zostaje.

## 7. Uwagi stałe
- Interfejs po polsku. **Wygląd: jasny motyw** (kość słoniowa, ciemny tekst, złoty akcent `#8a6317`), bo jest czytelniejszy w garażu; zdjęcia auta i widok 360° zostają w ciemnych ramkach.
- Poduszka powietrzna: zalecamy odkręcić i zawiesić bez odpinania wtyczki. Odpinanie tylko po odłączeniu akumulatora i odczekaniu co najmniej 30 minut.
- Kolejne naprawy robimy po jednej, dopracowanej, a nie wiele szkiców.

## Zasada źródeł i sprzeczności (dopisane 2026-11-01)
- Gdy źródła się różnią (np. TIS a forum), karta opisuje jedną metodę, a drugą i sprzeczność wpisuje do listy `unknown`. Nie wybieramy po cichu.
- Numery części bez drugiego źródła mają `conf: med`; `high` dopiero od dwóch niezależnych źródeł.
- Wyciąg z instrukcji BMW (TIS) bez wartości momentów: momentów nie zgadujemy, wpis w `unknown`.
- Karta bez mediów zostaje „częściowe” bez względu na kompletność tekstu.

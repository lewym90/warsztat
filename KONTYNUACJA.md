# KONTYNUACJA: Warsztat (stan na 2026-11-04)

**Ten plik jest instrukcją startową dla Claude na nowym koncie.** Czytaj go w całości przed jakąkolwiek pracą. Opisuje, czym jest projekt, jak pracować z właścicielem, co jest zrobione, co zostało i jak to robić krok po kroku. Szczegóły techniczne są w `docs/` (odsyłacze niżej). Nic w tym pliku nie jest tajne i nie wolno tu zapisywać haseł, kluczy ani tokenów.

---

## 0. Pierwsze kroki (zrób w tej kolejności)

1. **Powiedz właścicielowi jednym zdaniem**, że czytasz KONTYNUACJA.md i dokumenty w `docs/`, i co zaraz zrobisz.
2. **Przeczytaj:** ten plik, potem `docs/status.md`, `docs/standard-naprawy.md`, `docs/architektura-stref.md`, `docs/modul-diagnostyczny.md`.
3. **Sprawdź, że wszystko działa** (polecenia w sekcji 5): `python3 tools/build.py`, `node --test tests/*.test.mjs`, `bash tools/lint.sh`. Wszystko ma przejść. Test `tools/smoke.py` trwa ok. 4 minut: puść go w tle i czekaj na wynik.
4. **Sprawdź dostęp do przeglądarki.** Właściciel zapowiedział, że da dostęp do przeglądarki w aplikacji desktopowej Claude („Link to this computer”). Większość odłożonej pracy (sekcja 4) tego wymaga. Jeśli narzędzi przeglądarki nie ma, powiedz to wprost i zrób część, którą da się zrobić bez niej (sekcja 4B).
5. **Zapytaj właściciela, od czego zacząć**, tylko jeśli polecenie z jego pierwszej wiadomości tego nie rozstrzyga. Domyślna kolejność: sekcja 4A (praca z przeglądarką), potem 4B.
6. **Nie opowiadaj, co zrobiłeś, zanim to nie jest zrobione i sprawdzone** (zasada właściciela, sekcja 2).

---

## 1. Czym jest projekt

**Warsztat** to prywatna aplikacja PWA po polsku: centrum napraw samochodów właściciela i jego rodziny. Pierwsze auto: **BMW X5 E53 3.0d (M57), 2003**. Instrukcje napraw mają być na tyle dokładne, żeby naprawę wykonał ktoś, kto robi to **pierwszy raz**, wyłącznie z tego, co widzi w aplikacji.

- **Adres aplikacji:** https://lewym90.github.io/warsztat/ (GitHub Pages, wdrożenie ok. 1–2 minuty po wypchnięciu).
- **Repozytorium:** https://github.com/lewym90/warsztat, gałąź `main`. Publikacja: `git push origin HEAD:main`.
- **Technika:** czyste JS (moduły ES), bez bundlera i bez serwera; statyczne pliki. Dane wiedzy w JSON (`data/packs/bmw-e53/`). Service worker generuje `tools/build.py`.
- **Prywatność:** w repozytorium nie ma VIN-ów ani danych osobowych. Dane aut i postępy są w `localStorage` i IndexedDB telefonu właściciela.
- **Właściciel pracuje na iPhonie (Safari, ekran główny).** Ogranicza to możliwości PWA (np. brak dzwonka minutnika w tle na iOS).

### Struktura repozytorium
```
index.html, manifest.webmanifest, sw.js   (sw.js ma sekcję FILES generowaną przez build.py)
css/app.css                               (jeden plik; ciemny motyw domyślny, jasny i auto, zmienne CSS)
js/                                       moduły; js/screens/* to ekrany (garage, car, zone, repair, plan, search, book, sync, add, sys, more, sources)
js/art-door.js                            kotwice (focus) na rysunku drzwi
js/spin.js, art-car.js                    widok 360° auta i kropki stref
js/vendor/                                qrcode, jsqr (nie ruszać, lint je pomija)
data/packs/bmw-e53/                       pack.json (źródła, indeks napraw), catalog.json (strefy, grupy, pozycje), repairs/*.json (karty napraw)
img/                                      klatki 360° (img/spin), zdjęcia drzwi (img/doors), ikony
tests/*.test.mjs                          testy Node (27)
tools/build.py, smoke.py, lint.sh         walidacja i testy
docs/                                     dokumentacja (status, standard, architektura, diagnostyka)
docs/diag/                                szkielet schematu diagnostyki i słownik objawów (jeszcze niepodłączone do aplikacji)
```

---

## 2. Zasady pracy z właścicielem (obowiązują zawsze)

Właściciel jest wymagający i konkretny. Pisze po polsku. Te zasady powtarzał wielokrotnie:

1. **„Od A do Z”.** Nie wolno napisać, że coś zrobione, jeśli jest zrobione częściowo, i nie wolno zostawić czegoś „na później” bez jasnego powiedzenia, co dokładnie zostało i dlaczego. Raport kończący pracę ma mówić precyzyjnie: co jest skończone, co nie i z jakiej konkretnej przyczyny (np. „wymaga przeglądarki”). Żadnych niejasnych „częściowo zrobione”.
2. **Nie zgadujemy.** Momenty dokręcania, numery części i wartości, których nie ma w źródłach, trafiają na listę `unknown` karty. Każdy krok i część ma poziom pewności `conf` (`high`/`med`/`low`) i źródło `src`. `high` dla numeru części dopiero od dwóch niezależnych źródeł.
3. **Status „pełne” tylko dla napraw spełniających cały standard** (`docs/standard-naprawy.md`), czyli także ze zdjęciami lub klipami przy krokach i filmem z transkryptem. Inaczej: `częściowe` albo `szkic`. Liczniki „Gotowe” w aplikacji liczą wyłącznie „pełne”. Tekst kompletny, ale bez mediów, nadal jest „częściowe”.
4. **Sprzeczności źródeł nie rozstrzygamy po cichu.** Karta opisuje jedną metodę, a drugą i sprzeczność wpisujemy do `unknown`.
5. **Żadnych haseł i danych uwierzytelniających** (nie wpisujemy ich nigdzie, nie przechowujemy w plikach). Żadnych programów do pobierania z YouTube. Filmów YouTube nie zapisujemy offline (zasady serwisu).
6. **Źródła i autorzy: z poszanowaniem własności.** Zasada ustalona 2026-11-02: wszystko, co bierzemy z internetu, jest w aplikacji **oznaczone źródłem i autorem**, treść parafrazujemy i tłumaczymy własnymi słowami, zdjęcia **hotlinkujemy** (ładujemy z oryginalnej strony, nie kopiujemy plików do repozytorium) z podpisem źródła. Właściciel uzasadnia to tak: autorzy publikują naprawy po to, żeby z nich korzystać, a aplikacja jest tylko inną formą wyświetlania publicznych danych z podaniem źródeł. Nigdzie nie twierdzimy, że opisy czy zdjęcia są nasze. (Uwaga prawna dla Ciebie: „publiczne” nie znaczy „na licencji do kopiowania”, więc zostajemy przy linkowaniu, parafrazie i podpisach, a nie przy przenoszeniu plików. Aplikacja jest prywatna i rodzinna; gdyby miała być udostępniona szerzej, trzeba to przemyśleć od nowa.)
7. **Autorzy i wątki nie zaśmiecają kart napraw.** Wszystkie źródła i autorzy są **zbiorczo** w ekranie „Źródła” auta (wiersz na dole ekranu auta). Karty napraw pokazują tylko chipy źródeł przy krokach.
8. **Jedno polecenie = praca do końca.** Gdy właściciel mówi „zrób wszystko naraz, bez przerwy”, nie przerywaj pytaniami. Pytaj tylko wtedy, gdy decyzja jest nieodwracalna i niejednoznaczna.
9. **Komunikacja (praktyka, która się sprawdziła):** po polsku, konkretnie, bez wodolejstwa. Na starcie jedno zdanie, co zaraz robisz. Raport końcowy: wynik, co jest gotowe, co wymaga właściciela (np. link przeglądarki), jeden naturalny następny krok.

---

## 3. Stan aplikacji (co jest zrobione)

**Adres:** https://lewym90.github.io/warsztat/. Ostatnie commity: `40fc9e5` (ekran Źródła), `4dfda95` (7 nowych kart Drzwi, opisy katalogu, szkielet diagnostyki).

### 3.0 Szata graficzna WARSZTAT (2026-11-04)
Projekt właściciela: `docs/projekt-graficzny/` (specyfikacja, projekt ekranów, źródło ikony). Styl Dark Luxury: ciemny motyw domyślny (migracja `prefs.skin`), jasny i auto do wyboru. Paleta w tokenach na początku `css/app.css`, warstwa projektowa na końcu pliku. Ekrany: Start (`js/screens/home.js`, trasa `#/`), Garaż przeniesiony na `#/garage`, Naprawy z zakładkami Naprawy/Części/Katalog i Diagnostyka (`js/screens/repairs.js`), lista zakupów z odhaczaniem w planie (`plan.bought`). Dolna nawigacja: Start, Auto, Naprawy, Plan, Więcej. Auto bieżące: `S.currentCar()`. Przycisk „Zalicz krok” tylko przesuwa talię (postęp nadal = pozycja talii). Hero na Starcie to na razie klatka 360° na tle rysowanym w CSS; czeka na grafiki właściciela. Z makiety świadomie NIE przeniesiono: procentów pewności, numerów części i naprawy filtra paliwa (dane poglądowe bez źródeł).

### 3.1 Funkcje aplikacji
- **Garaż, ekran auta** z obrotowym widokiem 360° i kropkami stref (Drzwi, Maska i przód, Wnętrze, Klapa i tył, Koła/hamulce/zawieszenie, Progi/podwozie/napęd) + „Przeglądy i płyny”.
- **Ekran strefy:** grupy i pozycje katalogu, wyszukiwarka, status „Gotowe” / „Wstępna wersja” / „Wkrótce”. Drzwi mają przełącznik lewa/prawa i przód/tył.
- **Ekran naprawy = talia kart** przesuwana palcem: Podsumowanie, Ostrzeżenia, Narzędzia, Części, Filmy, kroki, Po montażu, Źródła. Jeden krok = jedna karta przewijana w pionie. Postęp = pozycja talii.
- **Funkcje robocze:** blokada wygaszania ekranu (Wake Lock), wielkość liter, motyw jasny/ciemny/auto, minutnik w krokach (czas z tekstu „odczekaj N minut”), „Wznów ostatnią naprawę”, postęp na listach, zdjęcia i notatki użytkownika w krokach (zdjęcia z demontażu w krokach montażu), karta bezpieczeństwa, plan „Dzisiaj robię” (jedna lista zakupów i narzędzi), wyszukiwarka globalna z polską fleksją, książka serwisowa z propozycją wpisu po naprawie, kopie (plik ze zdjęciami, migawka dobowa, przypomnienie tygodniowe), synchronizacja przez kody QR lub plik, podpowiedź „Dodaj do ekranu głównego”, zapis offline „na dziś” (24 h).
- **Ekran „Źródła” (2026-11-02):** `#/car/<id>/sources`. Zwinięty wiersz na dole ekranu auta otwiera pełnoekranową listę: źródła pogrupowane (instrukcje BMW, artykuły, fora, filmy, części), tytuł, strona, autorzy cytowanych wypowiedzi (tam, gdzie znani), karty napraw, w których użyto, przycisk „Otwórz oryginał”, wyszukiwarka; osobna sekcja zdjęć, filmów i odnośników z kredytami. Dane liczy `tools/build.py` (`sourceUse`, `mediaCredits` w `pack.json`). Autorów (`authors`) mamy na razie dla 5 źródeł forum: xo-seals (fepat55), xo-glass-clip (squeasel), xo-rear-emerg (J.Belknap), xo-mirror-assy (IFlyX5), xo-motor-init (killcrap, Qsilver7, SlickGT1, Ricky Bobby). Reszta bez nicka (autora nie ustalono).

### 3.2 Baza napraw BMW E53 (14 kart, 46 źródeł)
Pełne (spełniają cały standard):
- `klamka-zewn-przod` (26 kroków, 34 zdjęcia, 28 klipów, 2 filmy)
- `tapicerka-przod` (15 kroków, 24 zdjęcia, 11 klipów)

Częściowe (tekst kompletny, **brak mediów lub ich weryfikacji**):
- `klamka-wewn` (10 kroków), `okno-podnosnik-przod` (14), `silownik-zamka-przod` (17), `tapicerka-tyl` (13), `klamka-zewn-tyl` (12) (z wcześniejszej pracy);
- siedem dodanych 2026-11-02, tylko tekst ze źródeł (TIS, Xoutpost, FCP Euro), bez mediów: `okno-podnosnik-tyl` (11), `okno-silnik` (7), `okno-szyba` (7), `lusterko-wymiana` (7), `lusterko-szklo` (6), `uszczelka-obwodowa` (6), `uszczelka-szyby` (4).

Katalog (`catalog.json`): 260 pozycji w 7 strefach. W Drzwiach 14 z 53 pozycji ma kartę (pole `id`). Pozostałe pozycje to wpisy „Wkrótce” z krótkim opisem objawów w polu `n` (we wszystkich strefach). Pozycje bez karty w Drzwiach: zawias, ogranicznik, regulacja drzwi, siłownik zamka tył, mechanizm zamka, zaczep, styk drzwi otwartych, blokada dziecięca, diagnostyka zamka centralnego, prowadnice szyby, diagnostyka szyb, inicjalizacja szyb, przełącznik szyb, obudowa lusterka, silnik lusterka, podgrzewanie lusterka, kierunkowskaz w lusterku, pamięć lusterka, spinki boczka, głośnik w drzwiach, podłokietnik, kieszeń, lampka progowa, folia osłonowa, poduszka boczna (bezpieczne zdejmowanie), uszczelka słupka, wygłuszenie, odpływy wody, diagnostyka wody, wiązka słupek-drzwi, oświetlenie klamki, czujnik poduszki bocznej, blacharka (4 pozycje), cięgna klamek, osłona wkładki zamka, wkładka kluczyka.

### 3.3 Znane konflikty i niewiadome w istniejących kartach
(Wszystkie są zapisane w polach `unknown` kart. Nie „naprawiaj” ich zgadywaniem.)
- Momenty dokręcania śrub i nakrętek: **żadne dotychczasowe źródło ich nie podaje** (instrukcje BMW odsyłają do osobnego rozdziału).
- Podnośnik tylnych drzwi: TIS pozwala zostawić szybę na dole, FCP Euro opisuje wyjęcie podnośnika przy szybie podpartej u góry.
- Podnośnik przednich drzwi: TIS każe wyjąć szybę przed podnośnikiem, relacje forum opisują dojście przez otwory bez wyjmowania szyby.
- Inicjalizacja szyby po wymianie silnika lub podnośnika: forum sprzeczne (killcrap: nie trzeba, Qsilver7: „normalizacja” przy pierwszym pełnym ruchu, Ricky Bobby: brak funkcji).
- Numery części: podnośnik tylny, silnik podnośnika i lusterko bez numerów w źródłach; numery szkieł lusterka (51167039595 / 51167039596) i śruby klipsa (07147154229), tulei (51338242760) z jednego wątku (`conf: med`). Klips szyby 51338254781: `high` (trzy źródła).
- Cena i numery uszczelki obwodowej (51727025579): z jednej relacji z 2008 r.

### 3.4 Testy (stan na ostatni commit)
27 testów Node przechodzi, eslint czysty, `build.py` bez błędów, `smoke.py` bez błędów aplikacji. W `smoke.py` zostają 4 wpisy `requestfailed` zdjęć z `stevedu.com` (piaskownica chmurowa nie ładuje obcych serwerów); to oczekiwane i filtrowane wśród „znanych”.

---

## 4. Co zostało do zrobienia

### 4A. Wymaga przeglądarki w aplikacji desktopowej Claude
Właściciel ma ją podłączyć („Link to this computer”). Gdy narzędzia przeglądarki (`mcp__remote-devices__Claude_Browser__*`) są dostępne, najpierw wczytaj skill `anthropic-skills:built-in-browser`.

1. **Forum drive2.ru (priorytet wskazany przez właściciela).** Adres: https://www.drive2.ru/cars/bmw/x5/g392/ (kolega właściciela korzysta z niego przy naprawach X5). `WebFetch` i `curl` **nie otwierają** tej strony (serwer zwraca błąd klienta; nie obchodź tego kopiami ani lustrami). Przez przeglądarkę:
   - ustal, której generacji X5 dotyczy wspólnota `g392` (kod nie mówi, czy to E53; **nie mieszaj kroków z innych generacji z kartami E53**), przejrzyj **całą** wspólnotę i dzienniki napraw;
   - przetłumacz wpisy o E53, oceń wartość (nowe kroki, numery części, pułapki, narzędzia, zdjęcia);
   - **zanim cokolwiek dopiszesz do kart, pokaż właścicielowi listę wpisów z oceną, co dodają**;
   - wykorzystaj wg zasady 6 z sekcji 2: parafraza, autor (nick) i link w `sources` (z polem `authors`), zdjęcia hotlinkowane z podpisem. Sprawdź na żywo, czy serwis nie blokuje hotlinkowania; jeśli blokuje, zostaje link do wpisu bez zdjęcia w karcie.
2. **Media do 12 kart „częściowych”**, żeby doprowadzić je do „pełne” (kryteria w `docs/standard-naprawy.md`): wybór filmów wg kryteriów (E53, całość z montażem, dobra jakość), **transkrypty** (włączyć napisy CC, przeskakiwać `video.currentTime` co kilka sekund i czytać `.ytp-caption-segment`; panel musi być widoczny), wycinki klipów `video {id,t,e}` przy krokach, zdjęcia ze źródeł (Pelican Parts, Xoutpost, stevedu.com) z opisem i `credit`/`page`. Pelican Parts nie czyta się przez `WebFetch`, tylko przez panel przeglądarki.
3. **Weryfikacja na żywo, że zdjęcia zewnętrzne się ładują** (`Image.onload`), także tych już dodanych (Pelican Parts, Xoutpost, stevedu.com).
4. **Uzupełnienie autorów w źródłach** (`authors` w `pack.json`) tam, gdzie brakuje nicka: Xoutpost, Pelican Parts, TIS (workshop-manuals.com), FCP Euro itd. Dla nowych źródeł wpisuj autora od razu.
5. **Dalsze wątki z forów** (Xoutpost, Pelican Parts, inne), które odrzuciło `WebFetch`.

### 4B. Da się zrobić bez przeglądarki (`WebSearch`, `WebFetch` tylko dla adresów z wyników wyszukiwania lub podanych przez właściciela)
1. **Pozostałe 39 pozycji Drzwi:** karty tekstowe ze źródeł (TIS na workshop-manuals.com, fora, FCP Euro, ATE/Febi itp.) w standardzie z sekcji 5. Jeśli nie ma wiarygodnego źródła, pozycja zostaje „Wkrótce”, z jasną przyczyną (nie zgaduj).
2. **Pozostałe 6 stref** (Maska i przód 68 pozycji, Wnętrze 50, Klapa i tył 24, Koła/hamulce/zawieszenie 37, Progi/podwozie/napęd 21, Przeglądy 7): karty napraw od najczęstszych usterek, po jednej, w pełnej jakości. Kolejność ustala właściciel (zapytaj, jeśli nie podał).
3. **Drugie źródła** dla numerów części mających jedno źródło i rozstrzyganie konfliktów z listy `unknown` (sekcja 3.3).
4. **Techniczne porządki**, gdy są potrzebne (np. dokumentacja: `docs/status.md` i tabela w `docs/architektura-stref.md` bywają starsze niż kod; aktualizuj je przy każdej zmianie).

### 4C. Wymaga właściciela
- **Test offline na telefonie** (zapis offline 24 h, otwarcie karty bez sieci). Tego nie da się zrobić z chmury.
- **Lista pozostałych aut rodziny** (marka, model, rocznik, silnik). Każde auto wymaga: filmu 360° (81 klatek w `img/spin/`), położenia kropek na klatkach kluczowych (`js/spin.js`), zdjęć drzwi z obu stron (`img/doors/`), katalogu (`catalog.json`), paczki w `data/packs/<id>/`. Aplikacja ma „Zamów opracowanie” (generuje polecenie dla Claude).
- **Kolejność opracowywania napraw** i decyzje o nowych autach.

### 4D. Odłożone na wyraźną prośbę właściciela
**Zaawansowany moduł diagnostyczny** („prawie mechanik w telefonie”: wywiad, hipotezy, testy rozstrzygające, przeliczanie, link do karty naprawy; offline i deterministyczny; model językowy NIE działa w telefonie, służy tylko do przygotowania bazy wiedzy ze źródłami). Decyzja właściciela (2026-11-01): **najpierw cała baza i aplikacja skończone, potem wracamy do modułu.** Pełne ustalenia, etapy (0–3), dane do zebrania i otwarte pytania: `docs/modul-diagnostyczny.md`. Szkielet schematu i słownik objawów: `docs/diag/schemat.json`, `docs/diag/slownik-objawow.json` (nie podłączone do aplikacji). Gdy właściciel wróci do tematu, otwarte pytania: zakres (domyślnie tylko E53), jaki ma skaner OBD, które usterki są priorytetem, dostęp do przeglądarki do forów diagnostycznych. Przykłady użytkownika: „coś szumi, im szybciej jadę, tym bardziej” (wiele układów: łożysko koła, opony, napęd, hamulce, uszczelki) oraz „silnik szarpie i dymi na czarno”.

### 4E. Pomysły z oryginalnej listy 30 punktów
Właściciel wybrał do wykonania punkty 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 20, 26, 27, 28, 29, 30 (wszystkie zrobione, sekcja 3.1), punkt 14 to moduł diagnostyczny (4D). **Nie zrobione:** 5 (czytanie na głos), 18, 19, 21–25. **Treść numerów 18, 19 i 21–25 nie została zapisana w żadnym pliku, którym dysponuję, więc ich nie znam.** Nie zgaduj: jeśli właściciel zapyta o te punkty, poproś go o ich ponowne wymienienie (albo o zdjęcie/tekst starej listy).

---

## 5. Jak pracować technicznie

### Środowisko
```
git clone https://github.com/lewym90/warsztat /home/claude/repo   # jeśli nie ma
cd /home/claude/repo
```
Commit i push: `git add -A && git commit -m "…" && git push origin HEAD:main`. Na końcu komunikatu commita dodaj linie atrybucji wskazane w danej sesji (system podaje je w przypomnieniu o atrybucji). Zawsze zatwierdzaj i wypychaj zmiany przed zakończeniem pracy (hook sprawdza brak niezatwierdzonych zmian).

### Polecenia kontrolne (po każdej zmianie danych lub kodu)
```
python3 tools/build.py                 # waliduje paczkę, odświeża indeks napraw, sourceUse/mediaCredits, sw.js (FILES i wersja)
node --test tests/*.test.mjs           # 27 testów (podaj jawny glob)
bash tools/lint.sh                     # eslint 9 w katalogu tymczasowym, ignoruje js/vendor
python3 tools/smoke.py /tmp/shots      # Playwright (Chromium w piaskownicy), ~4 minuty
```
`smoke.py` puść w tle (`run_in_background`) i czekaj na zakończenie (np. Monitor na `pgrep -f tools/smoke.py`); nie używaj `pkill -f "http.server …"` (zabija powłokę) i nie łącz długich `sleep`. Zrzuty ekranu lądują w podanym katalogu; **obejrzyj je** po zmianach interfejsu. Smoke otwiera każdą kartę napraw i każdą strefę oraz ekran Źródła.

### Walidacja `build.py` sprawdza m.in.
nieznane źródła w krokach, kotwice `focus` pasujące do `view`, numery OE (11 cyfr), `high` bez numeru części, `link`/`related` do istniejących kart, media bez `credit`, wideo bez `id` i czasu, brak karty dla pozycji katalogu z `id`.

### Model danych naprawy (`data/packs/bmw-e53/repairs/<id>.json`)
Wzorzec jakości: `klamka-zewn-przod.json`. Pola karty: `id, title, subtitle, door (front|rear|both), completeness (pełne|częściowe|szkic), difficulty, time [min,max], summary, extras, tools [{name,note,need: must|should|opt}], parts [{name,oe,conf,note,src}], warnings [{lvl: danger|warn|info,t,b,src}], steps, after, unknown, related`.
Krok: `phase, t, view (outer|card|inner|edge), focus [kotwice z js/art-door.js], min, conf, src, b, see, how [], mistakes [], check, tip, tools, warn, danger, link, media`. Fazy nazywaj tak, by montaż rozpoznawał `isAssembly` w `js/screens/repair.js` (faza zawiera „montaż/składanie/założ/test”, bez „demontaż/zdejm/wyjm”). Czas oczekiwania zapisuj słowami „odczekaj N minut”, wtedy pojawia się minutnik.
Źródło w `pack.json → sources`: `{title, url, kind (instrukcja fabryczna|forum|artykuł|wideo|sklep|producent części|ogłoszenia…), authors?: [nicki]}`. Pozycja katalogu (`catalog.json`): `{t, id?, d? (front|rear), n?}`. Pole `n` to krótki opis objawów (wyszukiwany i pokazywany dla „Wkrótce”).
Pełny opis i proces: `docs/standard-naprawy.md`.

### Ograniczenia środowiska chmurowego
- `WebFetch` otwiera tylko adresy, które pojawiły się w rozmowie lub w wynikach `WebSearch`; własnoręcznie zbudowane adresy kończą się błędem `PROVENANCE_REQUIRED`. Serwisy odrzucające `WebFetch` (np. Pelican Parts, drive2.ru) czyta się przez przeglądarkę, nie obchodzi się ich przez `curl`, kopie czy lustra.
- Powłoka (`curl`) zwykle nie sięga stron spoza listy dozwolonych (rejestry pakietów, GitHub). Pip wymaga `--break-system-packages`.
- Zdjęcia z obcych stron nie ładują się w piaskownicy (stąd 4 `requestfailed` w smoke).
- Instrukcje BMW (TIS) w wyciągach na workshop-manuals.com są czytelne, ale **nie zawierają wartości momentów dokręcania**.
- Pamiętaj: pliki w katalogu tymczasowym nie przetrwają zmiany konta; wszystko, co ma przetrwać, musi być w repozytorium.

---

## 6. Dokumenty w repozytorium

| Plik | Co zawiera |
|---|---|
| `docs/status.md` | Stan aplikacji i tabela napraw |
| `docs/standard-naprawy.md` | Standard przygotowania naprawy, kryteria wyboru filmu, proces zbierania materiału, model danych, talia kart, offline, funkcje robocze |
| `docs/architektura-stref.md` | Podział auta na strefy i katalog napraw E53 (260 pozycji) |
| `docs/modul-diagnostyczny.md` | Ustalenia o module diagnostycznym (odłożony) |
| `docs/diag/` | Szkielet schematu diagnostyki i słownik objawów |
| `README.md` | Publikacja na GitHub Pages, nowe auta, prywatność |

Uwaga: ten sam zestaw dokumentów był też kopiowany do Projektu „APLIKACJE” na claude.ai (pliki `claude/warsztat-*.md`). Na nowym koncie Projektu może nie być; **źródłem prawdy jest to repozytorium.**

---

## 7. Gotowy tekst startowy dla nowej sesji

Właściciel wklei na nowym koncie polecenie w rodzaju „odczytaj KONTYNUACJA.md z repozytorium lewym90/warsztat i kontynuuj”. Wtedy:
1. Dołącz repozytorium (`lewym90/warsztat`, z prawem zapisu, bo trzeba wypychać zmiany) i sklonuj je.
2. Przeczytaj ten plik i `docs/`.
3. Uruchom `python3 tools/build.py`, testy i lint (sekcja 5).
4. Sprawdź dostępność przeglądarki (sekcja 4A). Jeśli jest: zacznij od forum drive2.ru i mediów do kart częściowych. Jeśli nie ma: powiedz o tym właścicielowi i zacznij od sekcji 4B.
5. Na koniec każdej porcji pracy: build, testy, commit i push, aktualizacja `docs/status.md` (oraz tego pliku, jeśli zmienił się stan lub plan), krótki raport zgodny z sekcją 2.

**Aktualizuj KONTYNUACJA.md przy każdej znaczącej zmianie stanu**, żeby kolejne konto i kolejna sesja też mogły zacząć bez przeszkód.

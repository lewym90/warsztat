# Warsztat: architektura stref i katalog napraw

Dokument opisuje, jak dzielimy KAŻDE auto na ogólne strefy (kropki na modelu 360°), co w nich jest i jak to rozbudowywać. Katalog dla BMW X5 E53 3.0d: `data/packs/bmw-e53/catalog.json`.

## Zasady

1. **Kropka = strefa, nie część.** Na modelu 360° jest 6 kropek (Drzwi z każdej strony, Maska i przód, Wnętrze, Klapa i tył, Koła/hamulce/zawieszenie, Progi/podwozie/napęd). Szczegół jest dopiero na ekranie strefy.
2. **Strefa zawiera WSZYSTKO, co jej dotyczy, wewnątrz i na zewnątrz.** Drzwi: klamki, zamki, szyby, lusterka, boczek, uszczelki, elektryka, blacharka. Maska: silnik, chłodzenie, paliwo, turbo, światła, zderzak, przednia szyba. Wnętrze: kabina, deska, fotele, klimatyzacja, elektryka kabiny, pedały, podsufitka.
3. **Podział na grupy** (np. „Szyby i podnośniki”) rozwijane na ekranie strefy, z wyszukiwarką. Lista zawiera także naprawy jeszcze nieopracowane (status „Wkrótce”), aby od początku było widać pełny zakres. Pozycja z poradnikiem ma status „Gotowe” i prowadzi do karty.
4. **Lewa i prawa strona.** Kropki na drzwiach lewych i prawych prowadzą do TEJ SAMEJ strefy „Drzwi” (przełącznik: lewa/prawa strona i przód/tył, zdjęcie właściwej strony). Procedury są lustrzane. Różnice: wkładka kluczyka i pamięć lusterka tylko w drzwiach kierowcy, a klapka wlewu paliwa jest przy prawym tylnym błotniku, nie w drzwiach. Jeśli poradnik różni się dla stron (numery części, wiązki), dopisujemy to w karcie, nie dublujemy kart.
5. **Przednia szyba** należy do strefy „Maska i przód”. Kropka „Wnętrze” leży na środku przedniej szyby (patrząc przez nią do kabiny).
6. **Poradniki powstają po jednym**, według `docs/standard-naprawy.md`. Pozycje w katalogu to tylko tytuły: bez twierdzeń technicznych, dopóki nie ma źródeł.
7. **Inne auta rodziny**: ten sam zestaw 6 stref i tych samych grup. Zmieniają się tylko pozycje (np. benzyna zamiast diesla, brak pneumatyki). Do każdego auta potrzebne jest: film z obrotem 360° (81 klatek w `img/spin/`), położenie kropek na klatkach kluczowych (`js/spin.js`), zdjęcia drzwi z obu stron (`img/doors/`), katalog (`catalog.json`).

## Katalog BMW X5 E53 3.0d (M57)

| Strefa | Pozycji | Gotowych |
|---|---|---|
| Drzwi | 53 | 6 |
| Maska i przód | 68 | 0 |
| Wnętrze | 50 | 0 |
| Klapa i tył | 24 | 0 |
| Koła, hamulce i zawieszenie | 37 | 0 |
| Progi, podwozie i napęd | 21 | 0 |
| Przeglądy i płyny | 7 | 0 |
| **Razem** | **260** | **6** |

### Drzwi
Wszystko w drzwiach i na drzwiach: klamki, zamki, szyby, lusterka, tapicerka, uszczelki

- **Klamki i otwieranie** (8): Klamka zewnętrzna i jej mechanizm (przód) [gotowe]; Klamka zewnętrzna i jej mechanizm (tył) [gotowe]; Klamka wewnętrzna [gotowe]; Cięgna i linki klamek; Osłona wkładki zamka (malowana); Zawias drzwi: luz i wymiana; Ogranicznik otwarcia drzwi; Regulacja przylegania drzwi do nadwozia
- **Zamki i zamek centralny** (8): Siłownik zamka (przód) [gotowe]; Siłownik zamka (tył); Mechanizm zamka drzwi; Wkładka kluczyka w drzwiach kierowcy; Zaczep zamka na słupku; Styk otwarcia drzwi (kontrolka „drzwi otwarte”); Blokada dziecięca (tylne drzwi); Zamek centralny nie działa na jednych drzwiach: diagnostyka
- **Szyby i podnośniki** (9): Podnośnik szyby (przód); Podnośnik szyby (tył); Silnik podnośnika szyby; Wymiana szyby w drzwiach; Prowadnice i listwy szyby; Uszczelka szyby (wycieraki zewnętrzne i wewnętrzne); Szyba opada, zacina się lub nie reaguje: diagnostyka; Inicjalizacja szyb po odłączeniu akumulatora; Przełącznik szyb (blok w drzwiach)
- **Lusterka** (7): Lusterko zewnętrzne: wymiana całości; Szkło lusterka; Obudowa lusterka; Silnik regulacji i składania lusterka; Podgrzewanie lusterka; Kierunkowskaz w lusterku; Pamięć ustawień lusterka
- **Tapicerka i wnętrze drzwi** (9): Boczek (tapicerka) drzwi przednich [gotowe]; Boczek (tapicerka) drzwi tylnych [gotowe]; Spinki i mocowania boczka; Głośnik w drzwiach; Podłokietnik i uchwyt; Kieszeń boczka; Lampka progowa w boczku; Folia (pianka) osłonowa wnętrza drzwi; Boczna poduszka powietrzna: bezpieczne zdejmowanie i odkładanie
- **Uszczelki i woda** (5): Uszczelka obwodowa drzwi; Uszczelka słupka; Wygłuszenie drzwi; Odpływy wody z dolnej krawędzi; Woda w drzwiach lub w kabinie: diagnostyka
- **Elektryka drzwi** (3): Wiązka przewodów między słupkiem a drzwiami; Oświetlenie klamki i światło ostrzegawcze w drzwiach; Czujnik uderzeniowy poduszki bocznej: diagnostyka
- **Blacharka i lakier** (4): Wgniecenie lub zarysowanie drzwi; Korozja dolnej krawędzi drzwi; Wymiana poszycia lub całych drzwi; Szczeliny i dopasowanie drzwi

### Maska i przód
Pod maską i z przodu: silnik, chłodzenie, paliwo, turbo, światła, zderzak i przednia szyba

- **Maska i przód nadwozia** (8): Pokrywa silnika (maska): regulacja i wymiana; Zawiasy i podpórki maski; Zamek maski i linka; Błotnik przedni; Zderzak przedni: zdejmowanie i wymiana; Belka zderzaka i pochłaniacz uderzeń; Nerki (grill) i osłony; Pas przedni i wzmocnienie
- **Przednia szyba i wycieraczki** (7): Przednia szyba: wymiana; Uszczelka i listwy przedniej szyby; Pióra i ramiona wycieraczek; Mechanizm i silnik wycieraczek; Dysze i pompka spryskiwaczy; Zbiornik płynu spryskiwaczy; Czujnik deszczu
- **Światła przednie** (9): Reflektor: wymiana; Żarówka reflektora (w tym ksenon); Przetwornica i zapłonnik ksenonu; Regulacja i poziomowanie świateł; Kierunkowskaz przedni i boczny; Halogeny przeciwmgłowe; Pierścienie świetlne; Polerowanie i uszczelnianie kloszy; Spryskiwacze reflektorów
- **Silnik: mechanika** (10): Olej i filtr silnikowy: wymiana; Obudowa filtra oleju i uszczelki; Pokrywa zaworów: uszczelka; Pasek wieloklinowy, napinacz i rolki; Rozrząd łańcuchowy: kontrola; Uszczelniacz wału korbowego; Miska olejowa: uszczelka; Poduszki silnika; Wyciek oleju: gdzie szukać; Chłodnica oleju
- **Paliwo i wtrysk (M57)** (9): Filtr paliwa; Wtryskiwacze; Pompa wysokiego ciśnienia i listwa; Świece żarowe i sterownik; Zawór EGR; Klapy wirowe (swirl flaps); Odpowietrzenie układu paliwowego; Przewody paliwowe i nieszczelności; Silnik kopci, szarpie lub nie pali: diagnostyka
- **Turbo i dolot** (8): Turbosprężarka: diagnostyka; Siłownik i sterowanie turbiny; Intercooler i przewody doładowania; Rury dolotowe i opaski; Przepływomierz powietrza; Filtr powietrza; Pompa podciśnienia i przewody podciśnienia; Czujnik ciśnienia doładowania
- **Chłodzenie** (8): Chłodnica wody; Termostat; Pompa wody; Wentylator wiskotyczny; Zbiornik wyrównawczy; Węże chłodzenia; Płyn chłodzący: wymiana i odpowietrzenie; Przegrzewanie silnika: diagnostyka
- **Elektryka silnika** (5): Alternator; Rozrusznik; Czujniki wałka i wału korbowego; Skrzynka bezpieczników w komorze; Wiązka silnika
- **Klimatyzacja (komora silnika)** (4): Sprężarka klimatyzacji; Skraplacz; Osuszacz; Napełnianie czynnikiem i szczelność

### Wnętrze
Kabina: fotele, deska, kierownica, klimatyzacja, elektryka, tapicerka i pedały

- **Fotele i pasy** (7): Regulacja elektryczna fotela; Podgrzewanie fotela; Tapicerka fotela: naprawa; Pas bezpieczeństwa i napinacz; Zagłówki; Tylna kanapa i oparcia; Czujnik zajęcia fotela i poduszka pasażera
- **Deska rozdzielcza i konsola** (11): Zegary (kokpit): naprawa i wymiana; Wyświetlacz komputera pokładowego; Radio i nawigacja: wymiana; Głośniki i wzmacniacz; Schowek i półki; Gniazdo zasilania i popielniczka; Wnętrze konsoli środkowej i podłokietnik; Dźwignia zmiany biegów: osłona i mocowanie; Dźwignia hamulca ręcznego; Nawiewy i kratki; Skrzypienia i trzaski wnętrza
- **Kierownica i kolumna** (6): Kierownica: wymiana i obszycie; Poduszka kierowcy: bezpieczna obsługa; Taśma zwijana poduszki (clock spring); Przełączniki przy kierownicy; Stacyjka i blokada kolumny; Regulacja kolumny kierownicy
- **Klimatyzacja i nawiew** (8): Dmuchawa; Rezystor lub stopień końcowy dmuchawy; Nagrzewnica; Parownik; Filtr kabinowy; Silniczki klap nawiewu; Panel sterowania klimatyzacji; Zapach i zawilgocenie z nawiewu
- **Elektryka kabiny** (7): Skrzynka bezpieczników w kabinie; Moduł komfortu (zamek centralny, światła); Alarm i immobilizer; Kluczyk i pilot: bateria i obudowa; Kontrolki poduszek powietrznych i ABS; Gniazdo diagnostyczne OBD i odczyt błędów; Oświetlenie wnętrza
- **Tapicerka i wykładziny** (8): Podsufitka; Osłony słupków; Wykładzina i dywaniki; Wygłuszenie podłogi; Lusterko wewnętrzne; Osłony przeciwsłoneczne; Szyberdach: mechanizm, uszczelnienie i odpływy; Woda w kabinie: diagnostyka
- **Pedały** (3): Pedał gazu i czujnik; Pedał hamulca i wyłącznik świateł stop; Gumy i osłony pedałów

### Klapa i tył
Tylna klapa, szyba, światła, zderzak, hak, bagażnik, akumulator i wydech końcowy

- **Klapa i szyba tylna** (8): Tylna klapa: regulacja i dopasowanie; Zamek klapy; Sprężyny gazowe klapy; Otwierana szyba tylna: zamek i siłowniki; Wycieraczka tylna: silnik i ramię; Dysza spryskiwacza tylnego; Uszczelka klapy i woda w bagażniku; Wiązka przewodów w klapie
- **Światła tylne** (5): Lampa tylna: wymiana; Żarówki tylnych świateł; Światło cofania i przeciwmgłowe; Oświetlenie tablicy rejestracyjnej; Trzecie światło stop
- **Zderzak i hak** (4): Zderzak tylny: zdejmowanie i wymiana; Czujniki parkowania; Hak holowniczy i moduł; Gniazdo przyczepy
- **Bagażnik** (5): Akumulator (w bagażniku): wymiana; Koło zapasowe i narzędzia; Boczne tapicerki bagażnika; Roleta, siatki i szyny mocujące; Wygłuszenie i podłoga bagażnika
- **Wydech (koniec układu)** (2): Tłumik końcowy; Końcówki i mocowania wydechu

### Koła, hamulce i zawieszenie
Koła, opony, hamulce, zawieszenie przód i tył, układ kierowniczy

- **Koła i opony** (7): Wymiana koła; Sezonowa wymiana opon; Wyważanie kół; Śruby kół i nakrętki; Łożysko koła (przód); Łożysko koła (tył); Czujnik ABS koła
- **Hamulce** (11): Klocki hamulcowe (przód); Tarcze hamulcowe (przód); Klocki hamulcowe (tył); Tarcze hamulcowe (tył); Zaciski hamulcowe; Płyn hamulcowy: wymiana i odpowietrzenie; Przewody hamulcowe; Czujniki zużycia klocków; Hamulec ręczny: szczęki i linki; Moduł ABS i DSC: diagnostyka; Serwo hamulca
- **Zawieszenie przednie** (8): Amortyzatory przednie; Sprężyny przednie; Wahacze przednie; Tuleje i sworznie wahaczy; Łączniki stabilizatora; Gumy stabilizatora; Górne mocowanie amortyzatora; Zwrotnica
- **Zawieszenie tylne** (6): Amortyzatory tylne; Poduszki pneumatyczne (jeśli auto je ma); Kompresor zawieszenia pneumatycznego (jeśli auto go ma); Wahacze tylne i tuleje; Łączniki stabilizatora tylnego; Poziomowanie i regulacja wysokości
- **Układ kierowniczy** (5): Końcówki drążków i drążki; Przekładnia kierownicza; Pompa wspomagania; Płyn wspomagania i przewody; Geometria kół (zbieżność)

### Progi, podwozie i napęd
Napęd na cztery koła, skrzynia, wydech, zbiornik, progi i korozja

- **Skrzynia i napęd 4x4** (8): Olej w skrzyni automatycznej; Wycieki ze skrzyni biegów; Przekładnia rozdzielcza: olej i łańcuch; Wał napędowy i krzyżaki; Łożysko pośrednie wału; Olej w mostach (dyferencjały); Półosie i przeguby; Poduszki skrzyni biegów
- **Wydech** (4): Układ wydechowy: wymiana elementów; Katalizator; Sondy i czujniki w wydechu; Osłony termiczne i mocowania
- **Paliwo** (3): Zbiornik paliwa i pompa podająca; Przewody paliwowe pod autem; Klapka i wlew paliwa
- **Progi i nadwozie** (6): Progi i stopnie boczne; Korozja progów i podłużnic; Osłony podwozia; Konserwacja antykorozyjna; Punkty podnoszenia auta; Ramy pomocnicze i ich mocowania

### Przeglądy i płyny
Regularna obsługa auta, płyny, diagnostyka błędów

- **Obsługa okresowa** (7): Przegląd olejowy: co i kiedy; Lista płynów i pojemności; Akumulator: kontrola i ładowanie; Odczyt błędów OBD: jak zacząć; Znaczenie kontrolek na zegarach; Przygotowanie do zimy i do lata; Przed zakupem używanego auta: lista kontrolna

## Do zrobienia
- Zdjęcia wnętrza drzwi (boczek, środek) jako część strefy Drzwi, przy opracowywaniu kolejnych napraw.
- Kolejne poradniki: kolejność ustala użytkownik (np. szyby w drzwiach, podnośnik szyby).
- Kropki na modelu są ustawione ręcznie na klatkach kluczowych (co 4. klatkę) i interpolowane.

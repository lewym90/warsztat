# Moduł diagnostyczny „prawie mechanik w telefonie” (punkt 14): ustalenia z 2026-11-01

**Status: ODŁOŻONY.** Wracamy do niego, gdy baza napraw i reszta aplikacji będą skończone (decyzja użytkownika, 2026-11-01). Tu jest wszystko, co ustaliliśmy.

## Cel
Profesjonalne narzędzie diagnostyczne, a nie wyszukiwarka fraz. Użytkownik opisuje objaw („silnik szarpie i dymi na czarno”, „szumi, im szybciej tym bardziej”), aplikacja prowadzi wywiad, podaje możliwe przyczyny, a gdy jest ich kilka, testy rozstrzygające, która jest właściwa. Wynik zawsze brzmi „najbardziej prawdopodobne + jak potwierdzić”, nigdy „to na pewno to”.

## Zasada projektowa: od objawu, nie od układu
Jeden objaw może pochodzić z kilku układów (szum rosnący z prędkością: łożysko koła, opony, napęd i skrzynia rozdzielcza, hamulce, uszczelki drzwi i szyb, wydech). Dlatego baza jest zbudowana wokół objawów i przyczyn ponad układami, a nie wokół listy układów auta.

## Przebieg (4 kroki)
1. **Wywiad:** chipy i pytania doprecyzowujące (kiedy: zimny/ciepły, obciążenie, luz; jaki dźwięk/dym/zapach; kontrolki; kody błędów; ostatnie naprawy; przebieg; zależność od prędkości lub obrotów, od skrętu, od nawierzchni, od hamowania).
2. **Hipotezy:** lista przyczyn z oceną wiarygodności (jakościowo).
3. **Testy rozstrzygające:** od najtańszego i najbardziej „odcinającego”, z narzędziami i oczekiwanym wynikiem.
4. **Przeliczenie:** wynik testu (działa / nie działa / nie wiem) zmienia ranking. Koniec: link do karty naprawy albo „wymaga warsztatu”.

Tekst swobodny zamieniamy na objawy słownikiem synonimów i pytaniami. Silnik wnioskujący w aplikacji jest prosty, deterministyczny i sprawdzalny (offline, statyczny). Model językowy NIE działa w telefonie (brak sieci, ryzyko zmyślania); służy tylko do przygotowania bazy wiedzy, ze źródłami.

## Dane do zebrania (główna praca)
- Przyczyny charakterystyczne dla konkretnego silnika i rocznika (fora, poradniki, biuletyny), z odróżnieniem „typowe dla M57/E53” od „ogólne”.
- Częstość tylko jakościowo („bardzo częste / częste / rzadkie”) z uzasadnieniem. Żadnych wymyślonych procentów.
- Testy z oczekiwanymi wartościami (ciśnienie doładowania, paliwa, napięcia): każda wartość ze źródłem, inaczej trafia na listę „nieznane” (jak momenty dokręcania).
- Co oznacza każdy wynik testu (które przyczyny zostają, które odpadają).
- Tabela kodów błędów (DTC) z uwagami dla E53.
- Kryteria „stop, nie jedź” (hamulce, kierownica, wyciek paliwa, dym w kabinie, zużyte łożysko koła).
- Koszt i trudność przyczyny, powiązanie z istniejącymi naprawami.
- Zapis „co to było naprawdę” w książce serwisowej, żeby z czasem powstały własne statystyki użytkownika.

## Zastrzeżenia (uczciwie)
- Zdalnie nie zawsze da się rozstrzygnąć usterkę. Każda hipoteza ma oznaczenie pewności jak kroki napraw.
- Bez skanera OBD jakość spada. Odczyt na żywo przez Bluetooth nie działa w Safari na iPhonie; na początku kody wpisywane ręcznie.
- Znane słabe punkty E53 (np. napęd na cztery koła) wpisujemy dopiero po potwierdzeniu w źródłach, nie z pamięci.
- Przy układach bezpieczeństwa jedna zła reguła to zła porada: ostrożnie, zawsze z odesłaniem do karty bezpieczeństwa.

## Plan etapów
- **Etap 0:** schemat danych + pilot ponad układami, 5–6 objawów: hałas rosnący z prędkością; szarpanie z czarnym dymem; wibracje kierownicy lub nadwozia; ściąganie auta na bok; trudny rozruch; stuki na nierównościach. Pełne źródła i testy.
- **Etap 1:** silnik wnioskujący w aplikacji (wywiad, ranking, testy, przeliczanie, linki do napraw), zapis wyniku w książce serwisowej.
- **Etap 2:** kolejne objawy i układy (hamulce, zawieszenie, elektryka, klimatyzacja, drzwi i zamki) oraz tabela DTC.
- **Etap 3:** import odczytu ze skanera tam, gdzie platforma na to pozwala.

Pełne pokrycie jednego auta: ok. 60–100 drzewek objawów, każde pracochłonne jak jedna naprawa; robimy po kolei, od najczęstszych usterek.

## Otwarte pytania do użytkownika (na powrót do tematu)
1. Zakres: tylko E53 na początek (domyślnie tak).
2. Jaki skaner OBD posiada (decyduje o głębokości testów).
3. Jakie własne usterki (jego i rodziny) są priorytetem.
4. Dostęp do przeglądarki w aplikacji desktopowej (fora diagnostyczne, transkrypty) znacznie poprawia zbieranie danych.

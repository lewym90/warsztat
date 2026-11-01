// Karta bezpieczeństwa: ogólna lista kontrolna przed pracą (bez wymyślonych liczb; wartości zawsze z instrukcji i źródeł naprawy).
export function safetyItems({ hasAirbag = false } = {}) {
  const always = [
    { t: 'Odłączony akumulator', d: 'Zdejmij klemę minusową i odsuń ją od bieguna, tak aby nie mogła się z nim zetknąć.' },
    ...(hasAirbag ? [{ t: 'Poduszki powietrzne: odczekaj po odłączeniu akumulatora', d: 'Ta naprawa dotyka układu poduszek. Odczekaj czas podany w kroku, dopiero potem odpinaj wtyczki. Pomoże minutnik.' }] : []),
    { t: 'Okulary i rękawice', d: 'Ostre krawędzie blach i klipsów, opadający kurz i rdza. Okulary zawsze przy pracy nad głową.' },
    { t: 'Dobre światło i miejsce na części', d: 'Rozłóż śruby i klipsy w podpisanych miejscach (zdjęcia przed odpięciem bardzo pomagają).' },
    { t: 'Wentylacja i brak źródeł ognia', d: 'Przy płynach, sprayach i czyszczeniu otwórz bramę. Nie pracuj z otwartym ogniem ani iskrami blisko paliwa.' },
    { t: 'Zgaszony silnik, kluczyk poza stacyjką', d: 'Kluczyk trzymaj przy sobie, by nikt nie uruchomił auta ani nie ruszył szyby.' }
  ];
  const lift = [
    { t: 'Równe, twarde podłoże', d: 'Nigdy na miękkiej ziemi, trawie ani pochyłości.' },
    { t: 'Koła zablokowane klinami', d: 'Kliny pod koła, które zostają na ziemi. Hamulec postojowy i bieg lub „P”.' },
    { t: 'Podnośnik tylko podnosi, a auto stoi na podpórkach', d: 'Zawsze użyj kozłów (podpórek) pod punkty nośne z instrukcji auta. Nigdy nie wchodź pod auto trzymane wyłącznie podnośnikiem.' },
    { t: 'Sprawdź stabilność przed wejściem pod auto', d: 'Lekko pchnij nadwozie. Jeśli się rusza, opuść auto i ustaw je od nowa.' },
    { t: 'Rozlane płyny sprzątnij od razu', d: 'Poślizg na oleju lub płynie pod autem to częsty wypadek.' }
  ];
  return { always, lift };
}

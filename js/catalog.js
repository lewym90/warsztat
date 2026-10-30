// Podpowiedzi do kreatora dodawania auta. Można też wpisać dowolne dane.
// Lista NIE oznacza, że opracowanie napraw istnieje — to wiadomo dopiero po dopasowaniu paczki.
export const CATALOG = {
  'BMW': [
    ['X5', 'E53', 1999, 2006], ['X5', 'E70', 2006, 2013], ['X3', 'E83', 2003, 2010],
    ['3', 'E46', 1998, 2006], ['3', 'E90', 2005, 2012], ['5', 'E39', 1995, 2003], ['5', 'E60', 2003, 2010], ['1', 'E87', 2004, 2013]
  ],
  'Opel': [
    ['Vectra', 'C', 2002, 2008], ['Vectra', 'B', 1995, 2002], ['Astra', 'H', 2004, 2014], ['Astra', 'G', 1998, 2009],
    ['Corsa', 'D', 2006, 2014], ['Zafira', 'B', 2005, 2014], ['Insignia', 'A', 2008, 2017]
  ],
  'Volkswagen': [
    ['Golf', 'IV', 1997, 2006], ['Golf', 'V', 2003, 2009], ['Passat', 'B5', 1996, 2005], ['Passat', 'B6', 2005, 2010], ['Polo', '9N', 2001, 2009]
  ],
  'Audi': [['A4', 'B6', 2000, 2005], ['A4', 'B7', 2004, 2008], ['A6', 'C5', 1997, 2005], ['A3', '8P', 2003, 2012]],
  'Skoda': [['Octavia', 'II', 2004, 2013], ['Fabia', 'I', 1999, 2007], ['Superb', 'II', 2008, 2015]],
  'Ford': [['Focus', 'II', 2004, 2011], ['Mondeo', 'III', 2000, 2007], ['Fiesta', 'VI', 2008, 2017]],
  'Mercedes-Benz': [['Klasa C', 'W203', 2000, 2007], ['Klasa E', 'W211', 2002, 2009], ['Vito', 'W639', 2003, 2014]],
  'Toyota': [['Corolla', 'E120', 2001, 2007], ['Avensis', 'T25', 2003, 2008], ['Yaris', 'XP90', 2005, 2011]],
  'Renault': [['Megane', 'II', 2002, 2009], ['Clio', 'III', 2005, 2012], ['Laguna', 'II', 2001, 2007]],
  'Fiat': [['Panda', '169', 2003, 2012], ['Punto', 'Grande', 2005, 2018], ['Ducato', '250', 2006, 2014]]
};
export const FUELS = ['benzyna', 'diesel', 'LPG', 'hybryda', 'elektryczny'];

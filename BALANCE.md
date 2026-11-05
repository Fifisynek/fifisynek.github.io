# Balans SKINLAB v3

Kontrola katalogu: **4 listopada 2026**. Migawka cen Skinport: **3 listopada 2026**. Wszystkie kwoty dotyczą wirtualnej rozgrywki.

## Katalog i wyceny

Katalog obejmuje **42 oficjalne skrzynki, 16 customów i 2 symulacje terminali**, łącznie 60 pozycji. Rynek ma **2126 wariantów skinów** z oddzielnymi fazami Doppler/Gamma Doppler oraz **9305 kombinacji skin–stan**. Po połączeniu faz to 1974 wykończenia. W pulach skrzynek znajduje się 4081 pozycji, ponieważ część przedmiotów występuje w kilku kolekcjach.

Każdy dostępny stan ma własną cenę w centach. Cena i zakres float identycznego wariantu są wspólne w całym katalogu. Niedostępne zużycie nie jest oferowane. Vanilla ma stan NW „Bez zużycia”. Cztery brakujące notowania są jawnie oznaczone w `estimatedWears` i `META.fallbackWears`: MP5-SD Lab Rats FN/MW/FT i Negev Mjölnir WW. Źródła, daty i odnośniki: `catalog.js`, `assets/pricing-snapshot.json`, `CREDITS.md`.

Drop otrzymuje równomierny rozrzut wartości ±4%. Dozwolony StatTrak ma 10% szansy i premię ×1,3. Skórki bez obsługi StatTrak, rękawice i Zeus x27 go nie otrzymują. Sprzedaż wypłaca 90% wartości, zaokrąglone w dół do centa osobno za każdy egzemplarz.

Skrzynka i klucz są osobnymi zakupami. Oficjalne klucze kosztują $2,49. Tańsze customy mają odpowiednio tańsze klucze; całkowity koszt jest pokazany przed zakupem. Cena skrzynki może zawierać jawną dopłatę balansującą. To cena do rozgrywki, nie deklaracja bieżącego kursu rynkowego.

## Losowanie i wartość oczekiwana

Oficjalne skrzynki używają wag kolorów **79,92% / 15,98% / 3,20% / 0,64% / 0,26%**. W obrębie koloru wszystkie pozycje, w tym oddzielne fazy, mają równe szanse. To reguła symulatora; dokładne szanse poszczególnych faz Valve nie są odtwarzane.

Customy i symulacje terminali mają wagi każdego przedmiotu, sumujące się do **1 000 000**. Ta sama tabela służy do losowania i wyświetlania szans. Mogą zawierać wyłącznie jeden kolor, noże albo rękawice. Ich cenę wyznacza wartość całej puli, więc gwarantowany nóż ma odpowiednio wysoki koszt. Terminale odtwarzają kolekcje we wspólnej mechanice skrzynka + klucz, bez rzeczywistego procesu ofert.

Obliczenie analityczne uwzględnia wagi, udział zakresów float w zużyciach, ceny stanów, obsługę StatTrak i jego premię, rozrzut ceny i prowizję. Test całkuje wypłatę dla zaokrąglonych cen w centach, zamiast dodawać nadmierny stały margines istotny przy otwarciu za $0,25. Cena celuje w około **64% zwrotu**; kontrola wymaga **nie więcej niż 65%** dla każdej skrzynki.

| Grupa | Liczba | Koszt skrzynki i klucza | Oczekiwany zwrot netto, w przybliżeniu |
| --- | ---: | ---: | ---: |
| Oficjalne skrzynki | 42 | $2,59–$117,64 | 22–64% |
| Customy | 16 | $0,25–$1184,00 | do 64% |
| Symulacje terminali | 2 | $2,50 | 30–60% |

Kosztowne kolekcje samych noży i rękawic są celami na późniejszy etap. Pozostają tanie customy i oficjalne skrzynki, którymi można realizować kampanię.

Próba kontrolna losuje **5000 dropów na każdą z 60 skrzynek**, łącznie **300 000**, z ziarnem `0x534b494e`. Podglądy nie zmieniają stanu ani XP. Drogie odmiany gem powodują dużą zmienność: ograniczona próba może zwrócić więcej niż koszt otwarć. Test porównuje wynik z konserwatywną granicą uwzględniającą drugi moment rozkładu. O ujemnej wartości oczekiwanej rozstrzyga osobna kontrola analityczna wszystkich wag i cen.

## Upgrader

Wkład to od 1 do 5 różnych, niezablokowanych egzemplarzy. Cel musi mieć prawidłowe zużycie i kosztować co najmniej **105% sumy wkładu**:

```
szansa = min(0,75; wartość wkładu / wartość celu × 0,90)
```

Wkład $10 i cel $20 dają 45%. Oczekiwana wartość otrzymanego skina nie przekracza **90% wkładu**, a po późniejszej sprzedaży i prowizji około **81%**. Limit 75% może ten zwrot dodatkowo obniżyć. Nie ma szansy gwarantowanej ani minimalnej szansy zaokrąglającej bardzo rzadkie próby w górę.

Wkład jest zużywany po sukcesie i po porażce. Sukces daje jeden cel po dokładnie podanej cenie, bez losowej premii i StatTrak, z float w prawidłowym zakresie wybranego stanu. Porażka nie zwraca wkładu.

Upgrader zapisuje odkrycia, ale **nie przyznaje XP** i nie zwiększa liczników otwarć ani odwiedzonych skrzynek. Zapobiega to zdobywaniu poziomów przez serię ulepszeń skinów wartych kilka centów. Wynik zapisuje się przed animacją, a próba ponownie sprawdza zasoby, także po zmianach w drugiej karcie.

## XP, albumy i otwarcia zbiorcze

Otwarcie 1/2/3/5 skrzynek jest jedną transakcją. Najpierw sprawdzane są wszystkie zasoby i miejsce na wszystkie wyniki, dopiero potem losowane niezależne dropy i zapisywana cała zmiana. Brak jednego klucza nie zużywa pozostałych. Pominięcie animacji nie zmienia nagród.

Każda transakcja sprawdza integralność wspólnego zapisu przed użyciem jego środków. Cały stan ma sumę kontrolną i zweryfikowaną kopię; podmiana pojedynczego pola nie przechodzi do ekonomii. Podczas pierwszej migracji wcześniejszego, niechronionego zapisu saldo można odtworzyć z kwoty początkowej oraz poprawnych, nieprzepełnionych liczników wpływów i wydatków. Kontrola po stronie klienta utrudnia proste edycje pamięci, ale nie gwarantuje ochrony przed osobą modyfikującą kod i wszystkie dane lokalne. Pełny antycheat wymaga serwera.

Otwarcie kosztujące co najmniej $2,49 daje 25 XP i 10 XP za nowe odkrycie. Dla tańszych skrzynek stosuje się:

```
skala = min(1; całkowity koszt otwarcia / 249 centów)
XP otwarcia = max(1; floor(25 × skala))
XP odkrycia = max(1; floor(10 × skala))
```

Budget Run za $0,25 daje zatem **2 XP za otwarcie i 1 XP za nowe odkrycie**, a pięć takich samych dropów w partii daje 11 XP. Tanie skrzynki zwiększają wybór, ale nie pozwalają kupować pełnego XP dziesięć razy taniej. Każde odkrycie płaci tylko raz, także w partii; zużycie i StatTrak nie są odrębnymi odkryciami, fazy są. Praca, bonus, zakupy i sprzedaż nie dają XP.

Oficjalny album nie wymaga złotych dropów. **Custom wymaga całej swojej puli**, także złotych przedmiotów. Skrzynka samych noży nie ma pustego, automatycznie ukończonego albumu. Nagroda albumu wynosi jednorazowo $5 i 200 XP. Odkrycia pozostają po sprzedaży i ulepszaniu.

Praca daje $0,10–$0,18 raz na sekundę, najwyżej $10,80 na minutę przy utrzymanej serii. Bonus dzienny wynosi $2,50. Kampania ma 18 jednorazowych nagród, a finał wymaga poziomu 20, 500 otwarć, 180 odkryć i odwiedzenia 18 skrzynek. Noże nie są wymagane.

## Pełne przejście kontrolne

Test z ziarnem `0x43415245` rozgrywa 500 otwarć bez dopisywania gotówki, przedmiotów, XP i nagród do stanu. Wybiera najmniej odwiedzaną odblokowaną skrzynkę o koszcie poniżej $20, sprzedaje dropy, zarabia brakujące środki zwykłą pracą i odbiera dostępne misje. Korzysta ze startowych $100 oraz jednego bonusu dziennego.

Wynik v3 po skalowaniu XP: **poziom 20, 60 odblokowanych skrzynek, 49 odwiedzonych kolekcji, 313 odkryć i wszystkie 18 misji ukończonych**. Wymagał **7916 akcji pracy**, czyli około **132 minut** pracy raz na sekundę, oprócz animacji i przeglądania. To jeden powtarzalny przebieg, nie obietnica czasu dla wszystkich. Bonusy dzienne, wybór skrzynek i zachowywanie skinów wpływają na tempo.

## Powtarzalna kontrola

```powershell
node --test tests/*.test.cjs
```

Testy obejmują pełne oficjalne pule względem niezależnej migawki manifestu, granice wag customów, możliwe zużycia, spójne ceny, analityczną ekonomię wszystkich skrzynek, próbę 300 000 dropów, pełną kampanię, rzeczywisty zapis v2, zasoby offline, atomowe partie, upgrader, ograniczenia XP i ochronę przed podwójnym wydaniem zasobów w dwóch kartach. Kontroler interfejsu jest dodatkowo wykonywany w Node: zdarzenia zakupów → partii → ekwipunku → wygranej i przegranej upgradera sprawdzają rzeczywiste zmiany zapisu. Układ strony i animacje wymagają osobnej kontroli w przeglądarce.

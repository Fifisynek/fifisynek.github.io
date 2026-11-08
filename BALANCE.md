# Balans SKINLAB v5.1

Manifesty i migawka Skinport: **5 listopada 2026**. Pobrano ceny o **19:06:49 UTC**. Wszystkie kwoty dotyczą wirtualnej rozgrywki; działają offline i nie zmieniają się automatycznie.

## Katalog i ceny

**126 pul** obejmuje 42 oficjalne skrzynki, 32 customy, 50 symulacji kolekcji oraz 2 symulacje terminali. Wszystkie **2126 pozycji katalogowych** są dostępne w otwieraniu. Po połączeniu faz pozostają 1974 wykończenia. Katalog oferuje **18 202 wyceniane kombinacje wykończenia, fazy, zużycia i edycji**: 9305 zwykłych, 5280 StatTrak i 3617 Souvenir. Seedów nie liczymy jako osobnych skinów.

Wycena identycznej fazy, edycji i zużycia jest wspólna dla wszystkich skrzynek. Najpierw wybierana jest najniższa oferta Skinport, jeżeli źródło podaje dostępne sztuki. Przy braku ofert używana jest cena referencyjna źródła. Braki mają jawny znacznik szacunku: 4 zwykłe wyceny, 70 StatTrak i 1257 Souvenir. Souvenir bez żadnego rzeczywistego notowania danej pozycji jest wyłączony zamiast tworzenia całej edycji z mnożnika. Pełna lista wyjątków jest w META.fallbackWears oraz w assets/pricing-snapshot.json.

Nowy drop ma **dokładną cenę z tabeli wybranego wariantu**, bez rozrzutu ±4%. StatTrak ma 10% szansy dla obsługujących go skinów oraz własną cenę, zamiast wspólnego mnożnika ×1,3. Otwarcie nie losuje Souvenir; tę edycję można wybrać jako cel upgradera. Sprzedaż wypłaca 90% zapisanej wartości, zaokrąglone w dół do centa dla każdego egzemplarza. Wartości przedmiotów z zapisów v2/v3 są zachowywane; nie przeliczamy ich na aktualną migawkę.

Każda skrzynka jest gotowa do otwarcia bez dodatkowych zasobów. Jej cena to pełny dotychczasowy koszt skrzynki i klucza, dlatego usunięcie osobnego zakupu nie zmienia kosztu otwarcia ani zwrotu oczekiwanego. Koszt skrzynki może zawierać jawną dopłatę balansującą. Ceny pojemników to koszt rozgrywki, nie deklaracja kursu rynkowego.

## Losowanie i wartość oczekiwana

Oficjalne skrzynki stosują **79,92% / 15,98% / 3,20% / 0,64% / 0,26%** dla kolejnych rzadkości, potem równy wybór wariantu w danym kolorze. Fazy są oddzielnymi wariantami; ich dokładnych szans w CS2 nie odtwarzamy. Customy, kolekcje i terminale korzystają z jawnych wag poszczególnych przedmiotów o sumie 1 000 000. Ta sama tabela służy do losowania i prezentacji procentów.

Obliczenie analityczne uwzględnia wagi, udział zakresów float w stanach, dokładne ceny zwykłe i StatTrak, szansę StatTrak oraz prowizję i zaokrąglenie sprzedaży każdego skina. Cena celuje w około 64% zwrotu; każdy pojemnik musi pozostać poniżej **65% oczekiwanego zwrotu netto**. Zaokrąglenie kosztu w centach ma zauważalny wpływ na bardzo tanie kolekcje.

| Grupa | Liczba | Pełny koszt pojemnika | Zwrot netto z metadanych, przybliżony |
| --- | ---: | ---: | ---: |
| Oficjalne skrzynki | 42 | $2.64–$98.52 | 23.3–64.0% |
| Autorskie skrzynki | 32 | $0.23–$2006.44 | 60.9–64.0% |
| Symulacje kolekcji | 50 | $0.07–$84.32 | 55.6–64.7% |
| Symulacje terminali | 2 | $2.50–$2.50 | 29.6–55.6% |

Pule samych noży i gemów kosztują odpowiednio więcej. Pojedynczy drogi drop może dać zysk, ale wielokrotne otwieranie i natychmiastowa sprzedaż nie tworzą dodatniej wartości oczekiwanej. Próba kontrolna losuje po **5000 dropów z każdej ze 126 pul**, razem **630 000**. Zmienność drogich gemów oceniana jest granicą uwzględniającą drugi moment rozkładu, obok osobnej dokładnej kontroli analitycznej.

## Patterny

Malowane przedmioty otrzymują paint seed 0–999, dopiero po pozostałych losowaniach wyniku. Seed 1000 można odczytać lub obejrzeć w atlasie, ale nie wylosować ze zwykłego otwarcia. Vanilla nie ma seeda. Starszy zapis bez seeda zachowuje wartość i oznaczenie nieznanego wzoru; aktualizacja nie losuje go ponownie.

Fade i pokrycie kolorem pochodzą z przypiętych wersji otwartych danych społeczności. Są zależne od modelu i seeda. Pokrycie Case Hardened/Heat Treated identyfikowane jest po dokładnych defIndex i paintIndex. Te wskaźniki są przybliżonymi metrykami społeczności; nie są oficjalnymi stopniami Valve. Obraz przedstawia wykończenie katalogowe, a nie render 3D konkretnego seeda.

**Nie doliczamy premii za seed**, nie tworzymy własnych cen Blue Gem ani mnożników od procenta Fade. Skinport dostarcza cenę fazy, zużycia i edycji; nie jest źródłem konkretnej premii za rzadki pattern. Seed, zużycie i edycja nie dają osobnego odkrycia ani dodatkowego XP. Fazy pozostają osobnymi odkryciami.

## Upgrader

Wkład obejmuje 1–5 różnych, dostępnych skinów. Ulubione i przedmioty z gabloty są chronione. Cel ma określony stan i edycję oraz cenę co najmniej 105% sumy wkładu:

    szansa = min(0,75; wartość wkładu / cena celu × 0,90)

Wkład $10 i cel $20 dają 45%. Wartość oczekiwana nagrody nie przekracza 90% wkładu, a po prowizji około 81%. Limit 75% może ten zwrot dodatkowo zmniejszyć. Nie ma gwarantowanej ani minimalnej szansy podnoszącej bardzo małe prawdopodobieństwa.

Wkład jest zużywany przy sukcesie i porażce. Sukces daje dokładnie wybrany wariant i cenę, z float w dozwolonym przecięciu zakresów oraz nowym seedem, jeżeli przedmiot ma malowanie. Upgrader zapisuje odkrycia, lecz **nie daje XP** i nie zwiększa liczników otwarć ani odwiedzonych skrzynek. Wynik i zużycie są zapisywane przed animacją, a zasoby ponownie sprawdzane przed transakcją.

## Kariera i pozostałe nagrody

Otwarcie 1/2/3/5 pojemników to jedna atomowa transakcja: wszystkie zasoby i miejsca są sprawdzane przed losowaniem. Brak odpowiedniej liczby skrzynek lub miejsca odrzuca całą partię. Pominięcie animacji nie zmienia nagród. Animacja zwykła trwa 4,8 s, szybka 1,5 s.

Otwarcie za co najmniej $2,49 daje 25 XP i 10 XP za nowe odkrycie. Dla tańszego kosztu stosowana jest skala min(1; koszt / 249 centów), a XP jest zaokrąglane w dół z minimum 1. Budget Run za $0.23 daje 2 XP za otwarcie i 1 XP za nowe odkrycie. Praca, bonus, zakupy, sprzedaż i podglądy nie dają XP.

Kampania ma 18 nagród. Finał wymaga poziomu 20, 500 otwarć, 180 odkryć i 18 odwiedzonych pul; nóż nie jest wymagany. Oficjalny album wymaga wszystkich zwykłych skinów, custom i symulacja kolekcji całej puli. Nagroda albumu wynosi jednorazowo $5 i 200 XP. Odkrycia pozostają po sprzedaży i użyciu w upgraderze.

Praca daje $0,10–$0,18 z sekundą odstępu, a bonus dzienny $2,50. Cztery tygodniowe cele przyznają razem 170 XP i zasoby do pięciu otwarć: Dreams & Nightmares, Revolution, dwa Budget Run i Gallery, gotowych do otwarcia, łącznie $9.52 według tej migawki. Nagrody są jednorazowe w danym lokalnym tygodniu rozpoczynającym się w poniedziałek. Upgrader nie zalicza celów tygodnia. Motywy gabloty pozostają odblokowane, a cofnięcie zegara nie odtwarza odebranych nagród.

Historia ma limit 200 zdarzeń. Łączne koszty, wartości i rekordy są poza limitem; pozostają też po sprzedaży przedmiotów. Wyświetlany bilans dropów po hipotetycznej prowizji minus koszt nie dopisuje pieniędzy do portfela. Gablota i eksport PNG również nie zmieniają ekonomii.

## Zapis i weryfikacja

Suma kontrolna stanu oraz zweryfikowana kopia wykrywają proste podmiany danych. Kontrola odbywa się przy wczytywaniu, synchronizacji kart i przed transakcją. Migracja dawnego niechronionego zapisu sprawdza saldo z kwoty początkowej i prawidłowych liczników wpływów oraz wydatków. To zabezpieczenie lokalne; pełny antycheat wymaga zaufanego serwera. Szczegóły odzyskiwania danych są w README.

Identyfikatory i kolejność wszystkich wcześniejszych 60 pul są zachowane. Nowe pola seeda, edycji i pochodzenia ceny rozszerzają format v3 bez resetu. Test pełnej kampanii rozgrywa 500 otwarć, sprzedaje dropy, zarabia przez zwykłą pracę i odbiera misje bez dopisywania zasobów do stanu.

Aktualizacja 5.1 zachowuje format stanu v3 i oznacza nową ekonomię jako economyVersion=2. Wszystkie posiadane wcześniej skrzynki otwierają się bez dopłaty. Dawne klucze są usuwane i jednorazowo zwracane w gotówce po 100% nominalnej dawnej ceny, także gdy były nagrodą. Zwrot trafia do salda i stats.earned, dzięki czemu kontrola salda nadal uwzględnia wszystkie wpływy. Zapis zachowuje puste keys tylko dla zgodności; nie jest to zasób rozgrywki. Znacznik migracji zapobiega ponownemu zwrotowi po przeładowaniu i synchronizacji kart. Koszty wcześniejszych otwarć pozostają zapisane w historii.

Pełne przejście kontrolne z ziarnem 0x43415245 osiągnęło poziom 20 po 500 otwarciach: 126 odblokowanych pul, 94 odwiedzone pule, 372 odkrycia i wszystkie 18 misji. Wykonano 3359 zwykłych akcji pracy, czyli około 56 minut przy sekundowym odstępie, oprócz animacji i przeglądania. To pojedynczy powtarzalny przebieg, nie obietnica czasu dla każdego gracza.

Kontrole uruchamia polecenie:

    node --test tests/*.test.cjs

Obejmują zgodność oficjalnych pul z migawką manifestu, wszystkie wcześniejsze indeksy, cenę dokładnej fazy i edycji, migrację i integralność zapisu, seedy, rzeczywiste tabele patternów, zasoby offline, analityczny balans wszystkich pojemników, próbę 630 000 dropów oraz pełną kampanię. Kontroler i eksport PNG są wykonywane w Node z zastąpionym układem, animacją i płótnem. Te testy nie zastępują wizualnej kontroli wyglądu i płynności w przeglądarce.

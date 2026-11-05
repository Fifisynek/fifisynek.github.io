# SKINLAB — Case Opener Simulator v5

Przeglądarkowy symulator skrzynek CS2 z atlasem skinów i patternów, kampanią, upgraderem, własną gablotą i wyzwaniami tygodniowymi. Gra działa lokalnie, bez konta Steam i bez instalowania bibliotek. Wszystkie pieniądze i przedmioty są wirtualne.

## Uruchomienie

Otwórz `index.html` w przeglądarce. Zachowaj cały folder projektu: grafiki, skrypty i fonty są lokalne, więc gra działa również bez internetu.

Do zapisywania gabloty jako obrazka PNG zalecany jest serwer lokalny opisany poniżej. Część przeglądarek blokuje eksport obrazów z grafikami po otwarciu gry bezpośrednio jako pliku. Gra wyświetli wtedy instrukcję zamiast pobierać uszkodzony obrazek.

Jeżeli przeglądarka ogranicza zapis plików otwieranych dwuklikiem, uruchom w folderze projektu:

```powershell
node serve.cjs
```

Otwórz [http://127.0.0.1:4173](http://127.0.0.1:4173). Serwer wymaga Node.js; zatrzymasz go skrótem `Ctrl+C`. Uruchamiaj tylko jeden serwer na tym porcie.

Alternatywa z Pythonem:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

## Katalog

W wersji 5 jest **126 pul do otwierania**:

- **42 oficjalne skrzynki na broń**: wszystkie pozycje typu Case z manifestu CSGO-API pobranego 5 listopada 2026, z pełnymi pulami zwykłych i specjalnych przedmiotów.
- **32 autorskie skrzynki SKINLAB**: między innymi Hardened Forge, Fade Studio, Marble Vault, Tiger Temple, osobne Doppler P1–P4 i Gamma P1–P4 oraz Ruby Reserve, Sapphire Club, Emerald Room i Pearl Archive.
- **50 symulacji kolekcji**: między innymi Dust, Aztec, Vertigo, Nuke, Office, Assault, Cobblestone i kolekcje operacji. W tej grze otwierasz je za pojemnik i pasujący klucz; jest to mechanika symulatora, nie odwzorowanie sposobu zdobywania tych kolekcji w CS2.
- **2 symulacje terminali**: Genesis Terminal i Dead Hand Terminal. Mają własne tabele losowania i korzystają z pojemnika oraz klucza; nie odtwarzają ofert rzeczywistych terminali Valve.

Baza obejmuje **2126 rzeczywistych pozycji katalogowych**, w tym osobne fazy Doppler/Gamma Doppler, noże i rękawice. Wszystkie można teraz zdobyć przez otwieranie. To **1974 wykończenia po połączeniu faz**, **9305 kombinacji zwykły skin–stan** oraz **18 202 dostępne kombinacje wykończenia, fazy, stanu i edycji** po uwzględnieniu wycen StatTrak i Souvenir. Numerów seed nie liczymy jako kolejnych skinów. Zakres nie obejmuje naklejek, agentów ani wszystkich rodzajów pojemników kosmetycznych.

## Otwieranie i ekwipunek

1. Kup skrzynkę oraz **osobno pasujący klucz**. Ekwipunek pokazuje zakładki wszystkich przedmiotów, skinów, skrzynek i kluczy, wraz z ich ilościami.
2. Wybierz **1, 2, 3 lub 5 otwarć**. Każdy wynik jest niezależny. Potrzebujesz tylu skrzynek i pasujących kluczy, ile wynosi wybrana liczba.
3. Obejrzyj przewijające się taśmy z zaznaczonym punktem zatrzymania. Możesz włączyć szybkie otwieranie albo pominąć trwającą animację; nie losuje to ponownie nagrody. Zwykła animacja trwa 4,8 sekundy, szybka 1,5 sekundy.
4. Zachowaj drop albo sprzedaj go za **90% wyświetlanej wartości**. Prowizja wynosi 10%; wypłata jest zaokrąglana w dół do centa osobno dla każdego przedmiotu.
5. Oznacz ulubione skiny gwiazdką, aby chronić je przed sprzedażą i użyciem w upgraderze.

Skiny umieszczone w gablocie również są chronione. Sprzedaż zbiorcza je pomija, a upgrader nie pokazuje ich jako dostępnego wkładu. Najpierw usuń przedmiot z gabloty; ręcznie ustawiona gwiazdka nadal obowiązuje.

Brak części zasobów albo miejsca w ekwipunku odrzuca całe otwarcie zbiorcze. Gra nie zużywa wtedy części kluczy. Wszystkie wyniki i zużycie zasobów zapisują się przed animacją.

Każdy skin ma właściwy zakres float i dozwolone stany: **Factory New, Minimal Wear, Field-Tested, Well-Worn albo Battle-Scarred**. Nie każdy skin istnieje we wszystkich stanach. Noże Vanilla mają oznaczenie **Bez zużycia**, bez udawania stanu FN. Zużycie, float, faza, edycja i seed są zachowywane w zapisie. Ekwipunek ma filtr stanu; wyszukiwarka znajduje też fazę, StatTrak, Souvenir i numer seeda.

## Patterny i atlas skinów

Wejdź w **Ekwipunek → Atlas skinów i patternów** lub użyj odnośnika na stronie głównej. Atlas ma filtry broni, rzadkości, fazy, rodziny wzoru, edycji i zużycia oraz sortowanie cen. Kliknięcie grafiki skina w ekwipunku lub puli otwiera inspektor.

Nowe malowane przedmioty otrzymują **paint seed od 0 do 999**, niezależnie od fazy i zużycia. Inspektor pozwala porównywać dane dla seedów 0–1000 w katalogu; nie zmienia to posiadanego egzemplarza. Seed 1000 jest obsługiwany przy odczycie, ale nie jest losowany przez zwykłe otwarcie. Vanilla nie otrzymuje seeda.

Dla wspieranych modeli dostępne są obliczone społecznościowo **procenty Fade, Amber Fade i Acid Fade** oraz przybliżone **pokrycie kolorem Case Hardened i Heat Treated**. Tabele zawierają 34 014 wpisów Fade i 25 004 wpisy pokrycia. Dane zależą od konkretnego modelu, paint indexu i seeda; dla nieobsługiwanego wariantu nie pokazujemy wymyślonego wskaźnika. Pokrycie w inspektorze dotyczy strony widocznej podczas gry. To metryki społeczności, nie oficjalne oceny Valve.

**Grafika przedstawia katalogowe wykończenie i fazę, nie render 3D dokładnego seeda.** Inspektor pokazuje źródło metryk, aktualizację ceny, liczbę ofert w migawce i porównanie faz. Nie nadaje arbitralnych tytułów Blue Gem ani dopłat za seed. Starsze przedmioty bez zapisanego seeda pozostają oznaczone jako nieznane.

## Upgrader

Wybierz **od 1 do 5 niezablokowanych skinów**, następnie docelowy skin, jego dostępny stan i edycję: zwykłą, StatTrak lub Souvenir. Wariant bez obsługiwanej wyceny nie jest oferowany. Panel przed próbą pokazuje wartość wkładu, wartość celu i szansę powodzenia.

Obie listy mają sortowanie **od najtańszych lub od najdroższych**. Wkład można też sortować od najnowszych. Kolejność obowiązuje we wszystkich stronach wyników i zachowuje zaznaczone skiny.

- Cel musi być wart co najmniej **105% sumy wkładu**.
- Szansa wynosi `min(75%, wartość wkładu / wartość celu × 90%)`.
- Wkład $10 i cel $20 dają **45% szansy**.
- **Wybrane skiny są zużywane zarówno po sukcesie, jak i po porażce.** Sukces daje jeden egzemplarz wybranego celu, dokładnie w wybranym stanie i po podanej cenie. Porażka nie zwraca wkładu.
- Nagroda otrzymuje dokładnie wybraną edycję i cenę, bez losowego modyfikatora. Float jest losowany we wspólnej części zakresu skina i wybranego stanu, a seed niezależnie.

Upgrader zapisuje nowe odkrycia w albumie, ale **nie przyznaje XP** i nie zwiększa licznika otwarć ani odwiedzonych skrzynek. Dzięki temu ulepszanie tanich skinów nie służy do omijania poziomów. Wynik zapisuje się przed animacją; ponowne kliknięcie albo druga karta nie mogą drugi raz zużyć tego samego egzemplarza.

## Gablota

Wejdź przez **Ekwipunek → Moja gablota** lub skrót na stronie głównej. Dziewięć miejsc mieści AK-47, M4A4/M4A1-S, AWP, USP-S/P2000, Glock-18, Desert Eagle, nóż, rękawice i jeden dowolny wyróżniony skin. Każdy egzemplarz zajmuje jedno miejsce; wybranie go gdzie indziej przenosi go między miejscami.

Nadaj kolekcji nazwę do 40 znaków. Motyw Carbon jest dostępny od początku, a Aurora, Ice i Gold odblokowuje się przez zadania tygodniowe. Nazwa, motyw i zestaw zapisują się automatycznie. Umieszczenie skina w gablocie nie kosztuje pieniędzy i nie daje XP.

Przycisk **Zapisz jako PNG** tworzy osobny obrazek 1600 × 1320 px z wybraną nazwą, dziewięcioma miejscami, grafikami skinów, zużyciem, floatem i wartością zestawu. Podczas eksportu zestaw jest utrwalany jako migawka, więc dalsze zmiany w grze nie zmieniają pobieranego obrazka. Eksport nie publikuje go w internecie.

## Wyzwania tygodniowe

Otwórz **Kariera → Tydzień**. Cztery cele obejmują liczbę otwarć, różne skrzynki, pierwsze odkrycia nowych wariantów oraz różnorodność pistoletów lub stanów zużycia. Wymagania zmieniają się co tydzień; wszystkie wskazane skrzynki nagród są dostępne na pierwszym poziomie.

Tydzień trwa od lokalnego poniedziałku o 00:00 do następnego poniedziałku. Liczą się nowe otwarcia z tego okresu, również każde otwarcie w serii. Upgrader, kupowanie i sprzedaż nie nabijają celów tygodniowych. Nagrodę odbiera się raz, przed zmianą tygodnia; odebranie w drugiej karcie jej nie powiela. Cofnięcie zegara nie otwiera ponownie starszego tygodnia w zachowanym zapisie.

Pełen tydzień daje po jednym zestawie skrzynka + klucz Dreams & Nightmares, Revolution i Gallery oraz dwa zestawy Budget Run. Misje przyznają odpowiednio 30, 40, 40 i 60 XP. Ostatnia odblokowuje rotujący motyw gabloty, który zostaje na stałe. Nagrody nie dodają bezpośrednio gotówki. Kolejny tydzień rozpoczyna postęp nowych zadań od zera.

## Historia i rekordy

Otwórz **Kariera → Historia** albo skrót w ekwipunku. Dziennik zachowuje **200 ostatnich zdarzeń**: pojedyncze wyniki skrzynek oraz udane i nieudane próby upgradera. Możesz szukać po nazwie, filtrować typ i rzadkość, sortować według wartości i przechodzić między stronami. Sprzedaż lub zużycie skina nie usuwa jego historycznego wpisu.

Trwałe rekordy pokazują najdroższy drop ze skrzynki, najrzadszy konkretny wariant według szansy jego wylosowania, najniższy float i udane ulepszenie przy najniższej szansie. Szansa wariantu nie uwzględnia dodatkowo jego zużycia ani StatTrak. Rekordy pozostają po usunięciu starszych zdarzeń z dziennika.

Bilans otwarć to **suma wartości dropów po prowizji sprzedaży minus koszt otwartych skrzynek i kluczy**. To miara wyników symulacji, a nie zmiana portfela czy suma faktycznych sprzedaży. Koszt jest zapisywany w chwili otwarcia. Historia, bilans i nowe rekordy zaczynają się od tej aktualizacji: wcześniejszych, niezapisanych wyników nie da się odtworzyć. Dotychczasowy ekwipunek, saldo, statystyki i kariera pozostają zachowane.

## Cel gry

Zaczynasz ze **$100** i pierwszym poziomem kolekcjonera. Standardowe otwarcie daje **25 XP**, a pierwsze odkrycie dodatkowo **10 XP**. **Otwarcia tańsze niż $2,49 dają proporcjonalnie mniej XP**. Budget Run za $0,25 daje 2 XP i 1 XP za nowe odkrycie. Wartość XP jest podana przy skrzynce. Kolejny stan lub StatTrak nie daje ponownie nagrody odkrycia; odrębna faza Doppler jest odrębnym odkryciem.

Kampania ma **18 jednorazowych zadań w sześciu rozdziałach**, z nagrodami w gotówce i XP. Następny rozdział otwiera się po odebraniu nagród poprzedniego. Poziomy odblokowują dalsze skrzynki i customy.

Finał wymaga **20. poziomu, 500 otwarć, 180 odkryć i odwiedzenia 18 różnych skrzynek**. Nie wymaga trafienia noża. Po zakończeniu można dalej kompletować albumy i kolekcjonować egzemplarze.

Oficjalny album wymaga wszystkich zwykłych skinów; noże i rękawice są dodatkowymi odkryciami. **Autorski album wymaga wszystkich przedmiotów swojej puli**, także złotych, jeśli je zawiera. Odkrycia pozostają po sprzedaży i zużyciu skina. Nagrody albumów odbiera się tylko raz.

Praca daje **$0,10–$0,18 na akcję**, z sekundą odstępu i premią za serię. Bonus dzienny wynosi **$2,50**, raz na lokalny dzień kalendarzowy. Kupowanie, sprzedaż, praca i bonus nie dają XP.

## Szanse i ceny

Standardowe szanse koloru dla oficjalnych skrzynek:

| Rzadkość | Szansa |
| --- | ---: |
| Mil-Spec / niebieski | 79,92% |
| Restricted / fioletowy | 15,98% |
| Classified / różowy | 3,20% |
| Covert / czerwony | 0,64% |
| Special Rare / złoty | 0,26% |

Suma wynosi 100%. W obrębie koloru symulator wybiera równomiernie spośród pozycji jego puli, w tym oddzielnych faz. To reguły symulacji; nie deklarujemy dokładnego odtworzenia szans każdej fazy w CS2. **Customy, symulacje kolekcji i terminali korzystają z własnych wag przedmiotów**, widocznych przy zawartości. Powyższa tabela nie dotyczy ich pul. Losowania są niezależne, bez zwiększania szansy po serii porażek.

Ceny pochodzą z publicznego [API Skinport](https://docs.skinport.com/items), pobranego **5 listopada 2026 o 19:06:49 UTC**, oddzielnie dla dokładnej fazy, zużycia i edycji. „Oferta min.” oznacza najniższą dostępną ofertę w migawce; przy braku ofert stosowana jest cena referencyjna źródła. Braki są jawnie oznaczone jako „Szacunek”: 4 wyceny zwykłe, 70 StatTrak i 1257 Souvenir. Edycje Souvenir bez żadnego rzeczywistego notowania są wyłączone zamiast wyceniania ich sztucznym mnożnikiem.

**Nowe dropy nie mają rozrzutu ±4% ani wspólnej premii StatTrak ×1,3.** Korzystają z konkretnej wyceny faza–stan–edycja. Dopłata za seed nie jest doliczana. Identyczny wariant ma tę samą cenę we wszystkich pulach. Gra działa offline i korzysta ze stałej migawki; ceny nie aktualizują się podczas rozgrywki. Dokładne źródła i lista wyjątków znajdują się w katalogu i pliku assets/pricing-snapshot.json.

Otwarcia i upgrader mają ujemną wartość oczekiwaną. Pojedynczy drogi drop może dać zysk, ale wielokrotna odsprzedaż nie tworzy stałej pętli zarabiania. Custom samych noży ma odpowiednio wysoki koszt. Szczegóły i kontrola ekonomii: `BALANCE.md`.

## Zapis i aktualizacja

Gotówka, klucze, skrzynki, skiny, albumy, ulubione, kariera, statystyki i ostatni wynik upgradera zapisują się automatycznie w `localStorage`. Stare zapisy wersji 1 i 2 są wykrywane automatycznie. **Wersja 2 zachowuje ceny i identyfikatory posiadanych egzemplarzy, zasoby, XP i odebrane nagrody**. Wersja 1 otrzymuje ceny nowej ekonomii i odzyskuje odkrycia z zachowanych przedmiotów.

Wersja 4 dodała do zapisu gablotę, odblokowane motywy, tydzień, historię i rekordy. Wcześniejsze zapisy formatu 3 są rozszerzane automatycznie. Wersja 5 dodaje seed, edycję i metadane pochodzenia ceny. Zachowuje wartości posiadanych egzemplarzy z zapisów v2/v3 oraz identyfikatory wszystkich wcześniejszych 60 pul. Nie dopisuje seedów do starych przedmiotów. Nie trzeba usuwać danych ani zaczynać kampanii od nowa.

Zapis jest teraz sprawdzany za pomocą sumy kontrolnej całego stanu, a drugi klucz przechowuje zweryfikowaną kopię. Ochrona włącza się przy uruchomieniu gry, również przed pierwszym zakupem. Prosta podmiana `balance`, XP, ceny przedmiotu lub liczby kluczy powoduje odrzucenie zmienionych danych i odzyskanie ostatniego poprawnego zapisu. Kontrola działa podczas wczytywania, synchronizacji kart i przed każdą transakcją. Usunięcie samej sumy kontrolnej nie otwiera ponownie migracji starego zapisu, jeśli istnieje chroniona kopia.

Przy pierwszej aktualizacji niechronionego zapisu gra sprawdza saldo względem `$100 + łączne wpływy − łączne wydatki`, o ile historyczne liczniki są poprawne i nie osiągnęły limitu. Pozwala to naprawić wcześniej podmienioną kwotę bez usuwania ekwipunku i kariery. Nie jest to pełny audyt dawnych transakcji. Gdy obie kopie są uszkodzone i nie ma poprawnego stanu w otwartej karcie, gra wyświetla ostrzeżenie i rozpoczyna nową sesję; przy samym wczytaniu nie nadpisuje uszkodzonych kopii.

**To lokalne wykrywanie prostych podmian i uszkodzeń, nie pełny system antycheat.** Suma kontrolna nie jest podpisem serwera ani tajnym kluczem. Osoba kontrolująca kod i wszystkie dane swojej przeglądarki może obejść zabezpieczenie. Pełna ochrona salda i rozgrywki wymaga zaufanego serwera, który przechowuje stan i wykonuje transakcje.

Zapis należy do konkretnej przeglądarki i adresu. Plik otwierany dwuklikiem, `localhost` i `127.0.0.1` mogą mieć osobne zapisy. Usunięcie danych witryny, tryb prywatny lub reset mogą usunąć postęp. Gra informuje o niedostępnym zapisie. Nie ma konta ani synchronizacji z serwerem.

## Pliki i testy

- `index.html`, `style.css`, `script.js` — interfejs, responsywność, dźwięki i animacje.
- `game.js` — stan, ekonomia, losowanie, otwarcia zbiorcze, upgrader i kariera.
- `save-guard.js` — kontrola integralności, wersje zapisu i odzyskiwanie zweryfikowanej kopii.
- `catalog.js` — znormalizowany katalog pul, skinów i osobnych cen stanów, faz oraz edycji.
- `patterns.js`, `pattern-data.js` — interpretacja seedów i lokalne tabele metryk wzorów.
- `skin-view.js` — atlas oraz inspektor cen, faz i patternów.
- `licenses/` — zachowane licencje i pochodzenie danych patternów.
- `career-view.js`, `opening-view.js`, `inventory-view.js`, `upgrader-view.js` — widoki kariery, otwierania, ekwipunku i upgradera.
- `collection-view.js` — widoki gabloty, tygodnia i historii.
- `showcase-export.js` — eksport kolekcji do PNG bez zewnętrznych bibliotek.
- `image-map.js`, `assets/` — lokalne grafiki, fonty i migawka cen.
- `CREDITS.md`, `BALANCE.md` — źródła danych i zasady ekonomii.
- `serve.cjs` — opcjonalny serwer lokalny bez zależności.
- `tests/` — kontrole logiki, balansu, migracji i zasobów offline.

W folderze projektu uruchom:

```powershell
node --test tests/*.test.cjs
```

Testy sprawdzają pełne pule 42 oficjalnych skrzynek względem niezależnej migawki manifestu, granice losowania customów, zakresy zużycia, ceny, zbiorcze otwarcia, upgrader, migracje, dwie karty, ograniczenia XP i pełne przejście kampanii. Nie potrzeba menedżera pakietów ani etapu budowania aplikacji.

Testy kontrolera wykonują rzeczywiste zdarzenia zakupów, otwierania, filtrów i upgradera w środowisku Node z zastąpionymi animacjami. Weryfikują powiązanie widoków z zapisem gry; nie zastępują sprawdzenia wyglądu i płynności w przeglądarce.

Testy ochrony zapisu wykonują również podmianę salda w formie komendy z konsoli, przeładowanie, odczyt przed zakupem, zmiany innych pól, odzyskiwanie kopii, brak miejsca na zapis i zgodność z wieloma kartami. Sortowanie upgradera jest sprawdzane razem z paginacją.

Regresje sprawdzają również dopasowanie i ochronę dziewięciu miejsc gabloty, eksport obrazka, jednokrotne nagrody tygodniowe, zmianę tygodnia i cofnięcie zegara, historię 200 wyników oraz rekordy zachowywane po sprzedaży. Kontrole eksportu wykonują logikę rysowania i pobierania w Node; nie zastępują wizualnego sprawdzenia pliku w przeglądarce.

Testy v5 kontrolują również wszystkie 60 wcześniejszych indeksów pul, dokładne ceny faz i edycji, seedy 0/999/1000, realne dane Fade i pokrycia, odczyt starych przedmiotów oraz atlas i podgląd patternu bez zmian zapisu.

Projekt fanowski, niezwiązany z Valve. CS2, Steam, nazwy i grafiki przedmiotów należą do ich właścicieli.

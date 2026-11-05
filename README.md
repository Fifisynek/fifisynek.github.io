# SKINLAB — Case Opener Simulator v3

Przeglądarkowy symulator skrzynek CS2 z kolekcjonowaniem skinów, kampanią i upgraderem. Gra działa lokalnie, bez konta Steam i bez instalowania bibliotek. Wszystkie pieniądze i przedmioty są wirtualne.

## Uruchomienie

Otwórz `index.html` w przeglądarce. Zachowaj cały folder projektu: grafiki, skrypty i fonty są lokalne, więc gra działa również bez internetu.

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

W wersji 3 jest **60 skrzynek i kolekcji do otwierania**:

- **42 oficjalne skrzynki na broń**: wszystkie pozycje typu `Case` z manifestu CSGO-API sprawdzonego 4 listopada 2026, w tym Gallery, Fever, Kilowatt, wszystkie serie Chroma, Gamma, Spectrum i klasyczne skrzynki operacji. Każda ma pełną pulę zwykłych i specjalnych przedmiotów z manifestu.
- **16 autorskich skrzynek SKINLAB**: między innymi Budget Run, Blue Circuit, Purple Pulse, Pink Rush, AK-47 Vault, M4 Arsenal, Sniper Nest, Doppler Lab, Glove Atelier i Knife Archive. Mają własne, jawne szanse dla konkretnych przedmiotów.
- **2 symulacje kolekcji terminali**: Genesis Terminal i Dead Hand Terminal. Korzystają z mechaniki skrzynki i pasującego klucza oraz własnych tabel losowania. Nie odtwarzają ofert ani procesu wyboru rzeczywistych terminali Valve.

Pełny katalog skinów zawiera **2126 pozycji**, w tym oddzielne fazy Doppler/Gamma Doppler, noże, rękawice i skiny spoza skrzynek, dostępne także jako cele upgradera. To **1974 wykończenia po połączeniu faz** i **9305 kombinacji skin–stan**, bez liczenia dodatkowych egzemplarzy StatTrak. Wyszukiwanie i filtry pomagają poruszać się po katalogu. Zakres nie obejmuje naklejek, agentów, pakietów pamiątkowych i innych pojemników niebędących skrzynkami na broń.

## Otwieranie i ekwipunek

1. Kup skrzynkę oraz **osobno pasujący klucz**. Ekwipunek pokazuje zakładki wszystkich przedmiotów, skinów, skrzynek i kluczy, wraz z ich ilościami.
2. Wybierz **1, 2, 3 lub 5 otwarć**. Każdy wynik jest niezależny. Potrzebujesz tylu skrzynek i pasujących kluczy, ile wynosi wybrana liczba.
3. Obejrzyj przewijające się taśmy z zaznaczonym punktem zatrzymania. Możesz włączyć szybkie otwieranie albo pominąć trwającą animację; nie losuje to ponownie nagrody.
4. Zachowaj drop albo sprzedaj go za **90% wyświetlanej wartości**. Prowizja wynosi 10%; wypłata jest zaokrąglana w dół do centa osobno dla każdego przedmiotu.
5. Oznacz ulubione skiny gwiazdką, aby chronić je przed sprzedażą i użyciem w upgraderze.

Brak części zasobów albo miejsca w ekwipunku odrzuca całe otwarcie zbiorcze. Gra nie zużywa wtedy części kluczy. Wszystkie wyniki i zużycie zasobów zapisują się przed animacją.

Każdy skin ma właściwy zakres float i dozwolone stany: **Factory New, Minimal Wear, Field-Tested, Well-Worn albo Battle-Scarred**. Nie każdy skin istnieje we wszystkich stanach. Noże Vanilla mają oznaczenie **Bez zużycia**, bez udawania stanu FN. Zużycie, float, faza i StatTrak są zachowywane w zapisie. Ekwipunek ma również filtr stanu.

## Upgrader

Wybierz **od 1 do 5 niezablokowanych skinów**, następnie docelowy skin i jego dostępny stan. Panel przed próbą pokazuje wartość wkładu, wartość celu i szansę powodzenia.

Obie listy mają sortowanie **od najtańszych lub od najdroższych**. Wkład można też sortować od najnowszych. Kolejność obowiązuje we wszystkich stronach wyników i zachowuje zaznaczone skiny.

- Cel musi być wart co najmniej **105% sumy wkładu**.
- Szansa wynosi `min(75%, wartość wkładu / wartość celu × 90%)`.
- Wkład $10 i cel $20 dają **45% szansy**.
- **Wybrane skiny są zużywane zarówno po sukcesie, jak i po porażce.** Sukces daje jeden egzemplarz wybranego celu, dokładnie w wybranym stanie i po podanej cenie. Porażka nie zwraca wkładu.
- Nagroda nie otrzymuje StatTrak ani losowego modyfikatora ceny. Float jest losowany we wspólnej części zakresu skina i wybranego stanu.

Upgrader zapisuje nowe odkrycia w albumie, ale **nie przyznaje XP** i nie zwiększa licznika otwarć ani odwiedzonych skrzynek. Dzięki temu ulepszanie tanich skinów nie służy do omijania poziomów. Wynik zapisuje się przed animacją; ponowne kliknięcie albo druga karta nie mogą drugi raz zużyć tego samego egzemplarza.

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

Suma wynosi 100%. W obrębie koloru symulator wybiera równomiernie spośród pozycji jego puli, w tym oddzielnych faz. To reguły symulacji; nie deklarujemy dokładnego odtworzenia szans każdej fazy w CS2. **Customy i symulacje terminali korzystają z własnych wag przedmiotów**, widocznych przy zawartości. Powyższa tabela nie dotyczy ich pul. Losowania są niezależne, bez zwiększania szansy po serii porażek.

Ceny bazują na stałej migawce Skinport z **3 listopada 2026**, oddzielnie dla stanów i faz. Cztery brakujące notowania są oznaczonymi szacunkami: MP5-SD Lab Rats FN/MW/FT i Negev Mjölnir WW. To wartości do rozgrywki, nie aktualne oferty. Drop ma dodatkowy rozrzut wartości ±4%, a dozwolony StatTrak stosuje premię ×1,3. Identyczny wariant ma wspólną wycenę niezależnie od skrzynki.

Otwarcia i upgrader mają ujemną wartość oczekiwaną. Pojedynczy drogi drop może dać zysk, ale wielokrotna odsprzedaż nie tworzy stałej pętli zarabiania. Custom samych noży ma odpowiednio wysoki koszt. Szczegóły i kontrola ekonomii: `BALANCE.md`.

## Zapis i aktualizacja

Gotówka, klucze, skrzynki, skiny, albumy, ulubione, kariera, statystyki i ostatni wynik upgradera zapisują się automatycznie w `localStorage`. Stare zapisy wersji 1 i 2 są wykrywane automatycznie. **Wersja 2 zachowuje ceny i identyfikatory posiadanych egzemplarzy, zasoby, XP i odebrane nagrody**. Wersja 1 otrzymuje ceny nowej ekonomii i odzyskuje odkrycia z zachowanych przedmiotów.

Zapis jest teraz sprawdzany za pomocą sumy kontrolnej całego stanu, a drugi klucz przechowuje zweryfikowaną kopię. Ochrona włącza się przy uruchomieniu gry, również przed pierwszym zakupem. Prosta podmiana `balance`, XP, ceny przedmiotu lub liczby kluczy powoduje odrzucenie zmienionych danych i odzyskanie ostatniego poprawnego zapisu. Kontrola działa podczas wczytywania, synchronizacji kart i przed każdą transakcją. Usunięcie samej sumy kontrolnej nie otwiera ponownie migracji starego zapisu, jeśli istnieje chroniona kopia.

Przy pierwszej aktualizacji niechronionego zapisu gra sprawdza saldo względem `$100 + łączne wpływy − łączne wydatki`, o ile historyczne liczniki są poprawne i nie osiągnęły limitu. Pozwala to naprawić wcześniej podmienioną kwotę bez usuwania ekwipunku i kariery. Nie jest to pełny audyt dawnych transakcji. Gdy obie kopie są uszkodzone i nie ma poprawnego stanu w otwartej karcie, gra wyświetla ostrzeżenie i rozpoczyna nową sesję; przy samym wczytaniu nie nadpisuje uszkodzonych kopii.

**To lokalne wykrywanie prostych podmian i uszkodzeń, nie pełny system antycheat.** Suma kontrolna nie jest podpisem serwera ani tajnym kluczem. Osoba kontrolująca kod i wszystkie dane swojej przeglądarki może obejść zabezpieczenie. Pełna ochrona salda i rozgrywki wymaga zaufanego serwera, który przechowuje stan i wykonuje transakcje.

Zapis należy do konkretnej przeglądarki i adresu. Plik otwierany dwuklikiem, `localhost` i `127.0.0.1` mogą mieć osobne zapisy. Usunięcie danych witryny, tryb prywatny lub reset mogą usunąć postęp. Gra informuje o niedostępnym zapisie. Nie ma konta ani synchronizacji z serwerem.

## Pliki i testy

- `index.html`, `style.css`, `script.js` — interfejs, responsywność, dźwięki i animacje.
- `game.js` — stan, ekonomia, losowanie, otwarcia zbiorcze, upgrader i kariera.
- `save-guard.js` — kontrola integralności, wersje zapisu i odzyskiwanie zweryfikowanej kopii.
- `catalog.js` — skrzynki, skiny, ceny stanów i jawne tabele dropów.
- `career-view.js`, `opening-view.js`, `inventory-view.js`, `upgrader-view.js` — widoki kariery, otwierania, ekwipunku i upgradera.
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

Projekt fanowski, niezwiązany z Valve. CS2, Steam, nazwy i grafiki przedmiotów należą do ich właścicieli.

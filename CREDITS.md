# Źródła grafik

## Fonty

Barlow i Barlow Condensed autorstwa Jeremy'ego Tribby'ego / The Barlow Project Authors pochodzą z [Google Fonts](https://fonts.google.com/specimen/Barlow) i są udostępniane na licencji SIL Open Font License 1.1. Lokalne pliki WOFF2 obejmują Latin i Latin Extended, w tym polskie znaki. Kopie pełnych licencji oraz adresy źródeł znajdują się w `assets/fonts/`.

## Grafiki gry

Grafiki skrzynek, klucza, broni, noży i rękawic pochodzą z publicznych renderów przedmiotów Counter-Strike, udostępnianych przez serwery Valve/Steam (`community.akamai.steamstatic.com`). Nazwy, identyfikatory i adresy grafik pobrano z projektu [ByMykel/CSGO-API](https://github.com/ByMykel/CSGO-API), z manifestów [crates.json](https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json), [skins.json](https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json) i [keys.json](https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/keys.json).

Katalog wersji 5 obejmuje **126 otwieranych pul**: wszystkie 42 tradycyjne skrzynki na broń z manifestu CSGO-API, 2 kolekcje terminali, 32 autorskie skrzynki tematyczne i 50 symulacji pozostałych kolekcji broni, m.in. Cobblestone, Gods and Monsters, Rising Sun, Control, Havoc, Anubis oraz mapy z różnych lat. Kolekcje map i tematyczne pule SKINLAB są wyraźnie oznaczonymi symulacjami. Nie udają dodatkowych oficjalnych skrzynek Valve. Manifesty [crates.json](https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json), [skins.json](https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json) i [collections.json](https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/collections.json) pobrano i zweryfikowano 5 listopada 2026.

W źródłowym katalogu nadal jest **2126 identyfikatorów skinów i faz**, czyli 1974 różne nazwy wykończeń plus warianty faz. Nie zwiększano tej liczby przez tworzenie fikcyjnych nazw, kopiowanie stanów zużycia ani liczenie seedów jako odrębnych oficjalnych skinów. Wszystkie 2126 pozycji można teraz wylosować w co najmniej jednej z pul. Trzy archiwalne wykończenia nieobecne w pozostałych pulach dopisano do Spectrum Mix. Aktualna liczba pozycji z powtórzeniami między pulami jest zapisana w polu META.casePoolEntries katalogu.

Oficjalne skrzynki zachowują pełne pule broni i przedmiotów specjalnych, w tym Vanilla i wszystkie fazy Doppler. Zakresy float, faktycznie dostępne stany, identyfikator modelu broni, paint index i identyfikator malowania pochodzą z CSGO-API. Vanilla ma stan „Bez zużycia”. Doppler Phase 1–4, Ruby, Sapphire, Black Pearl oraz Gamma Doppler Phase 1–4 i Emerald są osobnymi identyfikatorami, grafikami i wariantami wyceny.

Pule Genesis Terminal i Dead Hand Terminal są **symulacjami kolekcji terminalu**: stosują uproszczone otwieranie za skrzynkę i pasujący klucz. Prawdziwe terminale w CS2 przedstawiają oferty przedmiotów. Nie zaliczamy ich do 42 tradycyjnych skrzynek. Istnienie kolekcji potwierdzają komunikaty Valve: [Genesis — 16 września 2025](https://store.steampowered.com/news/posts/?appids=730&enddate=1758150954&feed=steam_community_announcements) i [The Dead Hand — 11 marca 2026](https://www.counter-strike.net/newsentry/518615049848225858).

Grafiki 32 autorskich skrzynek oraz oprawy 50 kolekcji są oryginalnymi, lokalnymi ilustracjami SVG generowanymi przez builder. Logotypy kolekcji pochodzą z publicznego [repozytorium obrazów Counter-Strike](https://github.com/ByMykel/counter-strike-image-tracker), wskazanego przez manifest collections.json, i zachowują oryginalny format PNG lub SVG. Dokładna faza skina ma własną lokalną grafikę. Nowe rendery mają 256 × 192 piksele; wcześniejsze większe obrazy zachowano.

Wszystkie obrazy potrzebne do gry są lokalne. Lista publicznych adresów i plików znajduje się w [assets/sources.json](assets/sources.json). Katalog przechowuje pełne dane kanonicznego skina jeden raz; pule odtwarzają z nich obiekty podczas ładowania. Pełna informacja cenowa jest dostępna po sourceId w ALL_SKINS. Plik tools/catalog-v4-order.json zachowuje dokładną kolejność wszystkich przedmiotów w 60 dotychczasowych pulach, a tools/catalog-v5-order.json utrwala pozycje rozszerzonego katalogu. Nowe pozycje są dopisywane po zapisanych, dzięki czemu istniejące przedmioty zachowują tożsamość.

Narzędzia tools/build-catalog.mjs oraz tools/download-assets.mjs służą wyłącznie deweloperowi. Parametr --refresh buildera pobiera publiczne źródła jeden raz i zapisuje datę oraz hash. Jeśli odświeżenie się nie uda, używa poprzedniej pamięci podręcznej z jej oryginalną datą i informacją o błędzie; nie oznacza starych cen nową datą. Zwykłe odtworzenie katalogu z pamięci podręcznej ma status cached, co nie zmienia zachowanego fetchedAt. Runtime nie wykonuje zapytań do tych usług.

Counter-Strike, CS2, CS:GO, Steam oraz powiązane nazwy i grafiki są własnością Valve Corporation i odpowiednich twórców. To niezależny, fanowski symulator, bez powiązania z Valve, Steam ani rzeczywistym rynkiem przedmiotów.

## Migawka cen i balans

Migawkę [publicznego API Skinport](https://api.skinport.com/v1/items?app_id=730&currency=USD) pobrano **5 listopada 2026 o 20:06:49 czasu Europe/Warsaw, tj. 19:06:49 UTC**. Zawiera 37 229 wierszy rynku w USD. Zastosowano zasady z [dokumentacji Skinport — Items](https://docs.skinport.com/items): klucz wyceny to dokładna para market_hash_name + version, gdzie version wskazuje fazę Doppler. Nagłówek Accept-Encoding: br jest wymagany, endpoint nie wymaga klucza API i ma limit 8 zapytań na 5 minut. Migawka jest pobierana raz na odświeżenie.

Dla każdego stanu i edycji używana jest najniższa oferta min_price, gdy quantity > 0 i cena jest poprawna. Gdy aktywnej oferty nie ma, stosowana jest suggested_price z wyraźnym opisem ceny referencyjnej, a nie bieżącej oferty. Gdy brak obu danych, cena jest oznaczonym szacunkiem, opartym na innym stanie tego samego wariantu lub porównywalnych przedmiotach. W katalogu zapisano **13 645 cen z ofert**, **3226 cen referencyjnych** oraz **1331 szacunków**: 4 zwykłe stany, 70 StatTrak i 1257 Souvenir. Wszystkie szacunki są wyszczególnione w META.fallbackWears i priceDetails. Cztery zwykłe wyjątki to trzy stany MP5-SD | Lab Rats oraz Well-Worn Negev | Mjölnir.

Edycje zwykła, StatTrak i Souvenir mają osobne mapy cen. Poprawny prefiks noża to np. ★ StatTrak™ Karambit, a faza nadal stanowi osobną część klucza. Nie stosuje się wspólnej ceny dla Phase 1–4 ani wymuszonej różnicy, jeśli rzeczywiste dane dla dwóch wariantów są równe. Nie dodaje się losowego rozrzutu ceny ani stałej premii StatTrak do wariantów mających rzeczywiste notowania. Manifestowy znacznik Souvenir nie oznacza automatycznie dostępności wyceny: 681 wykończeń bez jakiegokolwiek dokładnego wiersza Souvenir ma tę edycję wyłączoną, zamiast kompletu wymyślonych wartości. Dostępne są wyceny 775 wykończeń Souvenir, a brakujące pojedyncze stany pozostają jawnymi szacunkami.

Przykład z dostarczonej migawki: zwykły Karambit | Doppler Factory New ma najniższe oferty **Phase 1: $1240.82, Phase 2: $1649.99, Phase 3: $1088.48, Phase 4: $1223.26**. Każdy z tych wariantów ma odrębne ceny StatTrak i Minimal Wear. Cena referencyjna wariantu bez ofert może być niższa od oferty innego wariantu; gra nie poprawia tych relacji arbitralnym mnożnikiem.

To **stała migawka do symulacji**, nie kurs aktualizowany w trakcie gry ani oferta sprzedaży konkretnego przedmiotu. Pochodzenie, metoda, liczba ofert, czas updated_at i adres strony przedmiotu są zachowane w priceDetails. Pełne użyte odniesienia znajdują się w [assets/pricing-snapshot.json](assets/pricing-snapshot.json), a adresy źródeł, daty pobrania i hashe SHA-256 w META.sourceHashes. Duże pliki tools/*-source.json są pamięcią podręczną deweloperską i nie są wymagane do gry.

Zwykły klucz oraz klucz symulacji terminalu kosztuje $2.49. Klucze autorskich skrzynek i kolekcji stanowią około 20% zbalansowanego kosztu otwarcia, maksymalnie $2.49. Natychmiastowa sprzedaż pobiera 10% prowizji. Koszt oficjalnej skrzynki zaczyna się od jej ceny z migawki; w razie potrzeby doliczana jest jawna premia balansująca. Każda pula ma cenę wyliczoną z własnych szans, zakresów float oraz rzeczywistych cen zwykłych i 10% StatTrak dropów, tak aby oczekiwana wartość sprzedaży netto nie przekraczała około 64% kosztu otwarcia. Prezentacyjne zaokrąglenia centów mogą nieznacznie zmienić wyświetlany procent, szczególnie w bardzo tanich kolekcjach.

Oficjalne skrzynki stosują szanse rzadkości 79.92% / 15.98% / 3.20% / 0.64% / 0.26% oraz równy wybór wariantu danego koloru. Nie jest to odtworzenie dokładnej szansy każdego gema w CS2. Autorskie skrzynki, kolekcje i terminale mają własne jawne tabele dropTable o sumie 1 000 000. Nie przedstawiamy tych wag jako oficjalnych prawdopodobieństw Valve.

## Paint seed, Fade i pokrycie kolorem

Dane wzorów są lokalne i pochodzą z otwartych źródeł przypiętych do konkretnych commitów. Procent Fade, Amber Fade i Acid Fade pochodzi z [chescos/csgo-fade-percentage-calculator](https://github.com/chescos/csgo-fade-percentage-calculator/tree/fd02dd14bb1d8d9ea39c15f5472a0745867369b2), na licencji MIT. Pokrycie kolorem obu stron Case Hardened i Heat Treated pochodzi z [tabel CSFloat Extension](https://github.com/csfloat/extension/blob/daf021b2231cefd1a28646cfd8892bb8747c1c66/data/bluegem.json), na licencji MIT. Mapę faz i kontrolne porównanie danych dostarcza [kizilovv/cs2-pattern-data](https://github.com/kizilovv/cs2-pattern-data/tree/3f0c7c85ffbaa2a240b2a0392fd9419c4f9d079e), również MIT, z zachowaniem dodatkowej noty o pochodzeniu danych.

Kopie wymaganych licencji znajdują się w [licenses/pattern-fade-license.txt](licenses/pattern-fade-license.txt) i [licenses/pattern-blue-coverage-license.txt](licenses/pattern-blue-coverage-license.txt); adresy źródeł i hashe zapisano w [licenses/pattern-data-sources.txt](licenses/pattern-data-sources.txt) oraz metadanych pattern-data.js. Zestaw obejmuje 34 014 pozycji Fade i 25 004 pozycje pokrycia kolorem, a pomiary pokrycia porównano ze źródłem kontrolnym.

Są to **metryki społecznościowe**, nie oficjalne klasy Valve. Fade jest wyliczoną normalizacją rotacji wzoru; pokrycie niebieskim, fioletowym i złotym wynika z analizy obrazów i rozróżnia stronę główną oraz odwrotną. Metadane modelu i paint index są dopasowywane do surowych identyfikatorów liczbowych. Gdy dany wzór lub seed nie ma danych, gra pokazuje brak danych zamiast wymyślonego procentu, poziomu Blue Gem czy Fire & Ice. Etykieta wizualnego wariantu nie oznacza dopłaty rynkowej.

Wyświetlane rendery są poglądowymi grafikami wykończenia/fazy. Gra **nie renderuje modelu 3D z pełnym odwzorowaniem UV konkretnego seeda**. Dokładne parametry wzoru odczytuje się w inspekcji. Publiczna migawka Skinport rozróżnia fazę, stan i edycję, lecz nie zawiera osobnej ceny każdego paint seeda; dlatego gra nie dolicza zmyślonej premii za seed ani procent Fade. Starsze egzemplarze bez zachowanego seeda pozostają oznaczone jako seed nieznany.

## Licencja manifestów CSGO-API

MIT License

Copyright (c) 2023 ByMykel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

# Źródła grafik

## Fonty

Barlow i Barlow Condensed autorstwa Jeremy'ego Tribby'ego / The Barlow Project Authors pochodzą z [Google Fonts](https://fonts.google.com/specimen/Barlow) i są udostępniane na licencji SIL Open Font License 1.1. Lokalne pliki WOFF2 obejmują Latin i Latin Extended, w tym polskie znaki. Kopie pełnych licencji oraz adresy źródeł znajdują się w `assets/fonts/`.

## Grafiki gry

Grafiki skrzynek, klucza, broni, noży i rękawic pochodzą z publicznych renderów przedmiotów Counter-Strike, udostępnianych przez serwery Valve/Steam (`community.akamai.steamstatic.com`). Nazwy, identyfikatory i adresy grafik pobrano z projektu [ByMykel/CSGO-API](https://github.com/ByMykel/CSGO-API), z manifestów [crates.json](https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json), [skins.json](https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json) i [keys.json](https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/keys.json).

Katalog wersji 3 obejmuje wszystkie 42 tradycyjne skrzynki na broń z manifestu CSGO-API, 2 kolekcje terminali i 16 autorskich skrzynek tematycznych SKINLAB. Manifesty zweryfikowano ponownie 4 listopada 2026. Oficjalne skrzynki mają pełne pule broni i przedmiotów specjalnych, łącznie z nożami Vanilla oraz fazami Doppler. Globalny katalog obejmuje wszystkie 2126 identyfikatorów skinów z manifestu: 1974 różne nazwy wykończeń oraz dodatkowe warianty faz. Katalog jest dostępny także jako zbiór celów Upgradera; 60 pul otwierania zawiera razem 4081 pozycji, z powtórzeniami między skrzynkami. Zakresy float, faktycznie dostępne stany, możliwość StatTrak i przypisanie do oficjalnych skrzynek pochodzą z CSGO-API. Vanilla ma stan „Bez zużycia”, a nie sztucznie przypisane Factory New.

Pule Genesis Terminal i Dead Hand Terminal są wyraźnie oznaczonymi **symulacjami kolekcji terminalu**. W tej grze stosują uproszczone otwieranie za skrzynkę i pasujący klucz. Prawdziwe terminale w CS2 działają inaczej: przedstawiają oferty przedmiotów. Nie zaliczamy ich do 42 tradycyjnych skrzynek. Istnienie kolekcji i źródła skinów potwierdzają komunikaty Valve: [Genesis — 16 września 2025](https://store.steampowered.com/news/posts/?appids=730&enddate=1758150954&feed=steam_community_announcements) i [The Dead Hand — 11 marca 2026](https://www.counter-strike.net/newsentry/518615049848225858).

Grafiki 16 autorskich skrzynek są oryginalnymi, lokalnymi ilustracjami SVG generowanymi przez builder. Każdy motyw ma odrębny symbol, nazwę i rzeczywistą tematyczną pulę skinów. Nowe rendery przedmiotów mają rozmiar 256 × 192 piksele; istniejące większe rendery zachowano. Katalog grafik zawiera dokładne mapowanie identyfikatorów, więc fazy Doppler nie korzystają z jednej wspólnej grafiki.

Każda grafika jest zapisana lokalnie. Pełna lista renderów Valve i publicznych adresów źródłowych znajduje się w [assets/sources.json](assets/sources.json). Do gry nie są potrzebne żadne zewnętrzne usługi. Narzędzie `tools/download-assets.mjs` służy wyłącznie do opcjonalnego ponownego pobrania grafik przez dewelopera. Narzędzie `tools/build-catalog.mjs` odtwarza katalog z publicznych manifestów i migawki cen oraz oryginalne ilustracje SVG; parametr `--refresh` pobiera nowe źródła. `tools/catalog-v2-order.json` zachowuje dokładną kolejność wszystkich przedmiotów w 24 wcześniejszych skrzynkach, aby utrzymać identyfikatory zapisu. Nowe przedmioty są dopisywane po starych.

Counter-Strike, CS2, CS:GO, Steam oraz powiązane nazwy i grafiki są własnością Valve Corporation i odpowiednich twórców. To niezależny, fanowski symulator, bez powiązania z Valve, Steam ani rzeczywistym rynkiem przedmiotów.

## Migawka cen i balans

Wartości skinów i skrzynek bazują na publicznym polu `suggested_price` w USD z [API Skinport — Items](https://docs.skinport.com/items), pobranym 3 listopada 2026 z [publicznego endpointu](https://api.skinport.com/v1/items?app_id=730&currency=USD). Każdy dostępny stan zużycia ma osobną wartość. Fazy Doppler, Emerald, Ruby, Sapphire i Black Pearl mają osobne wyceny z pola `version`. Cztery brakujące notowania są jawnymi szacunkami symulacji: Factory New, Minimal Wear i Field-Tested zwykłego MP5-SD | Lab Rats oraz Well-Worn Negev | Mjölnir. Szacunki opierają się na najbliższym znanym stanie albo medianie przedmiotów tej samej broni i rzadkości. Pełna lista `fallbackWears` i pole `estimatedWears` skina wskazują te wyjątki. Nie mają one udawać bieżących ofert rynkowych.

To **stała migawka do symulacji**, a nie bieżący kurs ani oferta sprzedaży. Gra działa offline i nie aktualizuje wycen. StatTrak ma umowną premię gry 30%, a końcowa wartość przedmiotu ma niewielki losowy rozrzut. Zwykły klucz i klucz symulacji terminalu kosztują $2.49. Klucze autorskich skrzynek są dopasowane do kosztu ich puli: 20% zbalansowanego kosztu otwarcia, maksymalnie $2.49. Dzięki temu Budget Run kosztuje łącznie $0.25, a tanie skiny nie wymagają klucza droższego od całej puli. Natychmiastowa sprzedaż pobiera 10% prowizji. Koszt oficjalnej skrzynki zachowuje cenę z migawki, chyba że potrzebna jest jawna premia balansująca, ograniczająca oczekiwaną wartość sprzedaży do 64% kosztu otwarcia. Po rozszerzeniu pełnych pul, w tym drogich faz, część skrzynek ma taką premię. Zaokrąglenia pojedynczych centów w opisowych metadanych mogą przesunąć wyświetlany procent o około 0.1 punktu procentowego.

Oficjalne skrzynki stosują szanse rzadkości 79.92% / 15.98% / 3.20% / 0.64% / 0.26%, a następnie równomiernie wybierają wariant z danego koloru. Nie odwzorowuje to dokładnej rzadkości każdej konkretnej fazy ani geometrii wzoru w prawdziwym CS2. Autorskie skrzynki i symulacje terminali stosują osobną, jawną tabelę wag `dropTable` o sumie 1 000 000; ich procenty nie są przedstawiane jako oficjalne szanse Valve. Każda pula ma koszt obliczony z jej własnych wag, prawidłowych zakresów float, cen stanów, premii StatTrak i prowizji sprzedaży.

Użyte ceny, linki do odpowiadających im stron przedmiotów i znaczniki aktualizacji zapisano w [assets/pricing-snapshot.json](assets/pricing-snapshot.json). Hash SHA-256 każdego źródłowego manifestu znajduje się w metadanych katalogu i migawki. Surowe, duże pliki `tools/*-source.json` są wyłącznie pamięcią podręczną narzędzi deweloperskich; nie są potrzebne do gry.

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

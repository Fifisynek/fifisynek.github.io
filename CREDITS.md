# Źródła grafik

## Fonty

Barlow i Barlow Condensed autorstwa Jeremy'ego Tribby'ego / The Barlow Project Authors pochodzą z [Google Fonts](https://fonts.google.com/specimen/Barlow) i są udostępniane na licencji SIL Open Font License 1.1. Lokalne pliki WOFF2 obejmują Latin i Latin Extended, w tym polskie znaki. Kopie pełnych licencji oraz adresy źródeł znajdują się w `assets/fonts/`.

## Grafiki gry

Grafiki skrzynek, klucza, broni, noży i rękawic pochodzą z publicznych renderów przedmiotów Counter-Strike, udostępnianych przez serwery Valve/Steam (`community.akamai.steamstatic.com`). Nazwy, identyfikatory i adresy grafik pobrano z projektu [ByMykel/CSGO-API](https://github.com/ByMykel/CSGO-API), z manifestów [crates.json](https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json), [skins.json](https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json) i [keys.json](https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/keys.json).

Katalog wersji 2 obejmuje 24 autentyczne skrzynki, pełne pule 384 zwykłych skinów tych skrzynek oraz wybrane prawdziwe przedmioty specjalne z ich puli. Łącznie zawiera 666 różnych skinów i 672 pozycje w pulach skrzynek; powtarzające się przedmioty mają wspólną wycenę i grafikę. Każda skrzynka zawiera 12 różnych przedmiotów specjalnych. Zakresy float i przypisanie skinów do skrzynek pochodzą z manifestów CSGO-API. Wspólne nazwy Doppler przedstawiają zwykłe fazy, bez dodatkowego losowania drogich odmian gem.

Każda grafika jest zapisana lokalnie. Pełna lista plików i publicznych adresów źródłowych znajduje się w [assets/sources.json](assets/sources.json). Do gry nie są potrzebne żadne zewnętrzne usługi. Narzędzie `tools/download-assets.mjs` służy wyłącznie do opcjonalnego ponownego pobrania grafik przez dewelopera. Narzędzie `tools/build-catalog.mjs` odtwarza katalog z publicznych manifestów i migawki cen; parametr `--refresh` pobiera nową migawkę. Skrypt wykorzystuje zachowaną w `tools/catalog-legacy.json` kolejność pierwszych czterech skrzynek, aby utrzymać identyfikatory zapisanych przedmiotów.

Counter-Strike, CS2, CS:GO, Steam oraz powiązane nazwy i grafiki są własnością Valve Corporation i odpowiednich twórców. To niezależny, fanowski symulator, bez powiązania z Valve, Steam ani rzeczywistym rynkiem przedmiotów.

## Migawka cen i balans

Wartości skinów i skrzynek bazują na publicznym polu `suggested_price` w USD z [API Skinport — Items](https://docs.skinport.com/items), pobranym 3 listopada 2026 z [publicznego endpointu](https://api.skinport.com/v1/items?app_id=730&currency=USD). Każdy dostępny stan zużycia ma osobną wartość; nie stosowano jednego mnożnika rzadkości ani domyślnych cen przypisanych wszystkim przedmiotom danego koloru. Dla nazw Doppler z wieloma fazami zastosowano najtańszą sugerowaną cenę zwykłej fazy, z wyłączeniem Emerald, Ruby, Sapphire i Black Pearl. Wszystkie użyte wyceny stanów miały dane źródłowe; nie wymagały wartości zastępczych.

To **stała migawka do symulacji**, a nie bieżący kurs ani oferta sprzedaży. Gra działa offline i nie aktualizuje wycen. StatTrak ma umowną premię gry 30%, a końcowa wartość przedmiotu ma niewielki losowy rozrzut. Klucz kosztuje symulacyjne $2.49, a natychmiastowa sprzedaż pobiera 10% prowizji. Koszt skrzynki zachowuje jej względną rzadkość rynkową; stara CS:GO Weapon Case jest znacznie droższa od nowych skrzynek. Builder przewiduje jawną premię balansującą cenę skrzynki, jeśli byłaby potrzebna do ograniczenia oczekiwanego zwrotu do 64%; w dostarczonej migawce nie była potrzebna dla żadnej skrzynki. Oczekiwany zwrot netto przy równomiernym losowaniu float wynosi około 26–51% kosztu otwarcia, zależnie od skrzynki.

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

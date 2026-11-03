# Balans SKINLAB v2

Kontrola katalogu z 3 listopada 2026 r. Kwoty i nagrody dotyczą wyłącznie wirtualnej rozgrywki.

## Co wymagało naprawy

W poprzedniej wersji CS:GO Weapon Case kosztowała wraz z kluczem $27,48, a średnia oczekiwana wypłata ze sprzedaży dropu wynosiła około $54,93: **199,9% kosztu otwarcia**. Wielokrotne otwieranie mogło więc systematycznie tworzyć pieniądze. Dreams & Nightmares zwracała średnio 93,7%. Praca dawała $0,75–$1,50 co 0,75 sekundy, czyli do $120 na minutę; bonus dzienny wynosił $25.

## Nowe zasady

- Wyceny opierają się na lokalnej migawce publicznych cen Skinport `suggested_price`, osobno dla każdego dostępnego stanu. Nie są bieżącą ofertą rynkową. Źródła oraz data znajdują się w `catalog.js`, `assets/pricing-snapshot.json` i `CREDITS.md`.
- Ten sam skin ma tę samą bazę cen i zakres float niezależnie od skrzynki. Egzemplarz otrzymuje niewielkie odchylenie wyceny ±4%. StatTrak jest modyfikatorem rozgrywki ×1,3, a nie osobną pobraną ofertą.
- Sprzedaż wypłaca 90% wartości przedmiotu z zaokrągleniem w dół do centa. Skrzynka i klucz są osobnymi zakupami; koszt w tabeli obejmuje oba.
- Koszt skrzynki jest co najmniej ceną jej migawki rynkowej. Mechanizm dopłaty balansującej uniemożliwia przekroczenie około 64% oczekiwanego zwrotu. W obecnym katalogu ceny rynkowe wystarczają bez dopłat.
- Praca daje $0,10–$0,18 co sekundę, czyli najwyżej $10,80 na minutę po rozbudowaniu serii. Codzienny bonus wynosi $2,50.
- XP dają otwarcia, pierwsze odkrycia oraz jednorazowe nagrody. Praca, bonus dzienny i sprzedaż nie dają XP. Zadania i albumy wypłacają nagrodę tylko raz.
- Zakupy wymagają poziomów 1, 4, 8, 12 albo 18. Poziom 20 wymaga 10 925 XP. Pełna kampania wymaga również 500 otwarć, 180 unikalnych wykończeń i odwiedzenia 18 kolekcji.

## Wyniki ekonomii

Wartość oczekiwana uwzględnia szanse rzadkości, równy wybór skina wewnątrz rzadkości, równomierny float w dozwolonym zakresie, odpowiednie ceny stanów, 10% szansy StatTrak i prowizję. Kolumna analityczna pomija różnicę poniżej jednego centa z zaokrągleń. Test automatyczny dolicza zachowawczy górny margines zaokrąglenia.

Próba kontrolna losuje **20 000 dropów dla każdej z 24 skrzynek**, łącznie 480 000. Używa ziarna `0x534b494e` i generatora LCG. Podglądy nie zmieniają stanu gry. Rzadkie, drogie dropy powodują zauważalne różnice między pojedynczą próbą a wartością oczekiwaną; pojedynczy gracz również może uzyskać zysk lub stratę odmienną od średniej.

| Skrzynka | Poziom | Skrzynka + klucz | Oczekiwana sprzedaż | Zwrot analityczny | Zwrot w próbie |
| --- | ---: | ---: | ---: | ---: | ---: |
| Dreams & Nightmares | 1 | $3.51 | $1.54 | 43.8% | 42.5% |
| Revolution | 1 | $2.66 | $0.87 | 32.7% | 38.2% |
| Fracture | 1 | $2.93 | $0.89 | 30.4% | 28.1% |
| Snakebite | 1 | $2.83 | $1.18 | 41.6% | 42.0% |
| Recoil | 1 | $2.72 | $0.86 | 31.8% | 30.6% |
| Kilowatt | 4 | $2.59 | $0.68 | 26.3% | 25.2% |
| Prisma | 4 | $3.78 | $1.91 | 50.5% | 48.6% |
| Prisma 2 | 4 | $3.66 | $1.46 | 39.9% | 39.2% |
| Danger Zone | 4 | $3.74 | $1.41 | 37.7% | 33.9% |
| Horizon | 4 | $4.17 | $2.12 | 50.8% | 55.5% |
| Clutch | 4 | $2.97 | $0.81 | 27.1% | 27.8% |
| Spectrum | 8 | $6.34 | $2.82 | 44.4% | 48.7% |
| Spectrum 2 | 8 | $5.69 | $2.19 | 38.5% | 36.1% |
| Gamma | 8 | $5.61 | $2.58 | 45.9% | 53.2% |
| Gamma 2 | 8 | $6.07 | $2.42 | 39.8% | 37.6% |
| Chroma | 8 | $7.37 | $3.26 | 44.2% | 47.0% |
| Chroma 2 | 8 | $6.55 | $2.73 | 41.7% | 39.1% |
| Chroma 3 | 8 | $6.24 | $2.51 | 40.3% | 40.0% |
| Operation Breakout | 12 | $10.81 | $4.40 | 40.7% | 36.9% |
| Operation Phoenix | 12 | $6.24 | $2.72 | 43.6% | 41.8% |
| Huntsman | 12 | $10.55 | $4.12 | 39.0% | 36.5% |
| Falchion | 12 | $4.22 | $1.69 | 40.1% | 39.9% |
| Shadow | 12 | $4.26 | $1.74 | 40.9% | 42.0% |
| CS:GO Weapon Case | 18 | $117.64 | $30.36 | 25.8% | 26.1% |

Oczekiwany zwrot wynosi obecnie **25,8–50,8%**, więc żadna skrzynka nie tworzy pętli stałego zysku przez samą odsprzedaż.

## Sprawdzenie całej kampanii

Test z ziarnem `0x43415245` rozgrywa 500 otwarć bez dopisywania gotówki, przedmiotów, XP ani nagród do stanu. Wybiera najmniej odwiedzaną odblokowaną kolekcję, pomijając kosztowne otwarcia powyżej $20, sprzedaje dropy, zarabia brakujące środki przez zwykłą pracę i odbiera dostępne misje. Korzysta z początkowych $100 oraz jednego bonusu dziennego.

Wynik: **20. poziom, 24 odblokowane skrzynki, 23 odwiedzone kolekcje, 222 odkrycia i wszystkie 18 zadań ukończonych**. Test potrzebował 8280 akcji pracy, czyli około **138 minut** przy ciągłej pracy raz na sekundę, plus czas przeglądania i animacji. Jest to konkretny przebieg kontrolny, a nie gwarancja czasu dla każdego gracza. Kolejne bonusy dzienne, szczęśliwe dropy i nagrody za albumy mogą skrócić potrzebną pracę; zachowywanie wartościowych skinów zamiast sprzedaży może ją wydłużyć. Nie trzeba otwierać drogiej Weapon Case, aby ukończyć kampanię.

## Powtarzalna kontrola

```powershell
node --test tests/*.test.cjs
```

Testy obejmują ceny wspólnych skinów, margines analityczny każdej skrzynki, próbę 480 000 dropów, przejście pełnej kampanii, migrację starego zapisu, trwałość odkryć, blokady sprzedaży i jednorazowe nagrody także w dwóch kartach. Zmiana katalogu lub zasad ekonomii powinna przejść te same kontrole.

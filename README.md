# SKINLAB — Case Opener Simulator

Przeglądarkowy symulator skrzynek CS2 z kampanią kolekcjonera, odblokowywaniem skrzynek i trwałym albumem odkrytych skinów. Wszystkie kwoty są wirtualne. Ceny są zapisanym punktem odniesienia dla ekonomii gry, a nie bieżącą ofertą kupna lub sprzedaży. Gra nie łączy się z kontem Steam i nie pozwala wypłacać pieniędzy.

## Uruchomienie lokalne

**Najprościej:** otwórz `index.html` w przeglądarce. Zachowaj cały folder projektu. Skrypty, grafiki i fonty są lokalne, więc po rozpakowaniu gra działa również bez internetu. Nie potrzeba instalowania bibliotek ani budowania aplikacji.

**Alternatywa — serwer lokalny:** jeżeli przeglądarka ogranicza zapis plików otwieranych dwuklikiem, uruchom w folderze projektu:

```powershell
node serve.cjs
```

Otwórz [http://127.0.0.1:4173](http://127.0.0.1:4173). Serwer wymaga Node.js i działa wyłącznie na Twoim komputerze. Zatrzymasz go skrótem `Ctrl+C` w terminalu.

Zamiast Node.js możesz użyć Pythona:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Uruchom tylko jeden serwer na wybranym porcie.

## Cel gry i postęp

Zaczynasz ze **$100**, pierwszym poziomem kolekcjonera i dostępem do początkowych skrzynek. Twoim celem jest realizacja kampanii, odblokowanie katalogu i uzupełnianie albumów kolekcji.

- **Otwieranie daje 25 XP**, a odkrycie nowego skina dodatkowo **10 XP**. Odkrycie liczy się raz dla danego skina; inny stan zużycia lub StatTrak nie tworzy kolejnego odkrycia.
- Kolejne poziomy odblokowują nowe grupy skrzynek. Katalog pokazuje wymagany poziom również dla zablokowanych pozycji.
- **Kampania ma 18 jednorazowych zadań w sześciu rozdziałach** z nagrodami w gotówce i XP. Po wykonaniu zadania odbierz jego nagrodę w panelu postępu. Następny rozdział otwiera się po odebraniu trzech nagród z poprzedniego.
- Każda skrzynka ma osobny album. **Komplet zwykłych skinów** odblokowuje jednorazową nagrodę za kolekcję. Noże i rękawice są dodatkowymi odkryciami, więc nie trzeba zdobywać wyjątkowo rzadkiego przedmiotu, aby ukończyć album.
- Odkrycia pozostają w albumie po sprzedaży przedmiotu. Możesz więc sprzedawać duplikaty i zachowywać ulubione egzemplarze.
- Kupowanie, sprzedawanie, praca i bonus dzienny nie dają XP. Obracanie tym samym przedmiotem nie przyspiesza odblokowań.

Finałowy cel wymaga **20. poziomu, 500 otwarć, 180 odkrytych skinów i otwarcia 18 różnych skrzynek**. Po ukończeniu kampanii można dalej kompletować albumy, szukać rzadkich egzemplarzy i budować kolekcję.

## Skrzynki, klucze i ekonomia

W katalogu są **24 skrzynki i 666 unikalnych skinów** z pełnymi pulami zwykłych skinów oraz wyborem noży lub rękawic, w tym Dreams & Nightmares, Kilowatt, Revolution i klasyczne skrzynki CS:GO. Filtry pomagają znaleźć skrzynkę według nazwy, ceny i dostępności.

1. Kup wybraną skrzynkę oraz **osobno pasujący klucz**. Klucz do innej skrzynki nie zadziała.
2. Otwórz skrzynkę. Oba przedmioty zostaną zużyte, a drop trafi do ekwipunku i albumu odkryć.
3. Zachowaj skin albo sprzedaj go za **90% jego wyświetlanej wartości**. Prowizja wynosi 10%, a wypłata jest zaokrąglana w dół do centa dla każdego przedmiotu.
4. Zabezpiecz ulubiony egzemplarz przed sprzedażą. Blokada obowiązuje również przy sprzedaży zbiorczej.

Ceny różnią się między skinami i stanami zużycia. Ten sam skin w tym samym stanie ma spójną wycenę niezależnie od skrzynki. Cena otwarcia uwzględnia koszt skrzynki, klucza oraz balans ekonomii. Otwieranie i natychmiastowa sprzedaż mają ujemny oczekiwany wynik; pojedynczy wartościowy drop może jednak przynieść zysk. Szczegóły pomiaru opisuje `BALANCE.md`.

Na dalszą grę zarabiasz w panelu pracy: **$0,10–$0,18 za akcję**, z odstępem jednej sekundy i krótką serią kolejnych prac. Bonus dzienny wynosi **$2,50** i można odebrać go raz na lokalny dzień kalendarzowy. Nagrody z kampanii i kolekcji są jednorazowe, dlatego nie tworzą nieskończonej pętli zarabiania.

## Szanse losowania

| Rzadkość | Szansa |
| --- | ---: |
| Mil-Spec / niebieski | 79,92% |
| Restricted / fioletowy | 15,98% |
| Classified / różowy | 3,20% |
| Covert / czerwony | 0,64% |
| Special Rare / złoty | 0,26% |

Szanse sumują się do 100%. Losowania są niezależne: wcześniejsze wyniki nie zwiększają szansy na rzadki przedmiot. W obrębie rzadkości skiny z danej skrzynki są wybierane równomiernie. Stan i float mieszczą się w zakresie przypisanym do skina. Rękawice i Zeus x27 nie otrzymują StatTrak.

## Zapis i aktualizacja poprzedniej wersji

Gotówka, zakupione skrzynki i klucze, ekwipunek, albumy, XP, odebrane nagrody, ustawienia i statystyki zapisują się automatycznie w `localStorage`. Drop jest zapisany przed końcem animacji, więc odświeżenie strony podczas otwierania nie odbiera nagrody.

Poprzedni zapis jest wykrywany automatycznie. Poprawna gotówka, przedmioty i zakupione zasoby są zachowywane; wycena skinów zostaje dostosowana do nowej ekonomii. Migracja nie wymaga resetowania gry. Zakupione wcześniej skrzynki pozostają dostępne również wtedy, gdy wymagają teraz wyższego poziomu. Przy uszkodzonych danych poprawne części zapisu są zachowywane w miarę możliwości, a interfejs wyświetla ostrzeżenie.

Zapis należy do konkretnej przeglądarki i adresu strony. Plik otwarty dwuklikiem, `localhost` oraz `127.0.0.1` mogą korzystać z osobnych zapisów. Tryb prywatny, usunięcie danych witryny i reset gry usuwają postęp. Nie ma konta, synchronizacji ani zapisu na serwerze. Gdy przeglądarka blokuje zapis, gra informuje o tym w interfejsie.

## Pliki projektu

- `index.html` — struktura strony i widoki.
- `style.css` — wygląd, responsywność i animacje.
- `script.js` — interfejs, roller i dźwięki.
- `catalog.js` — katalog skrzynek, skinów i wycen.
- `career-view.js` — widoki kampanii i albumu kolekcji.
- `game.js` — ekonomia, losowanie, kampania, kolekcje oraz trwały stan gry.
- `image-map.js` i `assets/` — lokalne grafiki oraz fonty.
- `CREDITS.md` — źródła grafik, danych i informacje o prawach do materiałów.
- `BALANCE.md` — założenia i wyniki kontroli ekonomii.
- `serve.cjs` — opcjonalny serwer bez zewnętrznych zależności.
- `tests/` — testy logiki, ekonomii, migracji i lokalnych zasobów.

## Testy

W folderze projektu uruchom:

```powershell
node --test tests/*.test.cjs
```

Testy wymagają Node.js. Gra korzysta z czystego HTML, CSS i JavaScript; nie jest wymagany menedżer pakietów.

Projekt fanowski, niezwiązany z Valve. Nazwy CS2, skrzynek i skinów należą do ich właścicieli.


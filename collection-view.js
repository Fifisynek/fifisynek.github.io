/* Personal showcase, weekly goals and recorded play. All mutations live in game.js. */
window.CollectionView = (() => {
  'use strict';

  const themes = [
    { id: 'carbon', name: 'Carbon', note: 'Ciemny, kolekcjonerski klasyk.' },
    { id: 'aurora', name: 'Aurora', note: 'Fiolet i zieleń zorzy polarnej.' },
    { id: 'ice', name: 'Ice', note: 'Chłodna, błękitna ekspozycja.' },
    { id: 'gold', name: 'Gold', note: 'Złota oprawa dla Twojej kolekcji.' }
  ];
  const themeById = id => themes.find(theme => theme.id === id) || themes[0];
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const date = (value, full = false) => {
    const at = number(value);
    if (!at) return '—';
    return new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', day: '2-digit', month: 'short', ...(full ? { year: 'numeric' } : {}), hour: '2-digit', minute: '2-digit' }).format(new Date(at));
  };
  const dateOnly = value => number(value) ? new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(number(value))) : 'tej aktualizacji';
  const floatLabel = item => item?.noWear || item?.wearCode === 'NW' ? 'Bez zużycia' : Number.isFinite(item?.float) ? item.float.toFixed(6) : '—';
  const rarityColor = (ctx, item) => ctx.rarities[item?.rarity]?.color || '#78889c';
  function pagination(ctx, page, pages, action, extra = '') {
    if (pages <= 1) return '';
    return `<div class="inventory-pagination collection-pagination">${ctx.button(`${ctx.icon('back')} Poprzednia`, action, `data-page="${page - 1}" ${extra} ${page === 1 ? 'disabled' : ''}`, 'small outline')}<span>Strona ${page} z ${pages}</span>${ctx.button(`Następna ${ctx.icon('arrow')}`, action, `data-page="${page + 1}" ${extra} ${page === pages ? 'disabled' : ''}`, 'small outline')}</div>`;
  }
  function art(ctx, item, cls = '') {
    return ctx.image(ctx.skinImage(item), `${item.weapon} | ${ctx.itemName(item)}`, cls);
  }
  function itemFacts(ctx, item) {
    return `<span>${ctx.escape(item.wear || item.wearCode || '—')}</span>${item.stattrak ? '<span class="collection-stattrak">StatTrak™</span>' : item.souvenir ? '<span class="collection-stattrak">Souvenir</span>' : ''}<span>${floatLabel(item)}</span>${ctx.patternTags?.(item) || ''}`;
  }

  function showcase(ctx) {
    const { game, escape, icon, money, button } = ctx;
    const display = game.getShowcase();
    const theme = themeById(display.theme);
    const unlocked = new Set((display.unlockedThemes || ['carbon']).map(value => typeof value === 'string' ? value : value.id));
    unlocked.add('carbon');
    return `<div class="view-heading collection-heading"><div><p class="eyebrow"><span class="dash"></span> TWOJA KOLEKCJA. TWÓJ PODPIS.</p><h1>Moja gablota</h1><p>Wybierz ulubione skiny i ułóż własny loadout. Zachowaj go jako obraz i pochwal się kolekcją.</p></div><div class="collection-heading-actions"><a class="button small outline" href="#inventory">${icon('grid')} Ekwipunek</a>${button(`${icon('download')} Zapisz jako PNG`, 'showcase-export', `id="showcase-export" ${number(display.filled) ? '' : 'disabled'}`, 'small')}</div></div>
      <section class="showcase-editor" aria-label="Ustawienia gabloty"><label class="showcase-title-field" for="showcase-title"><span class="micro-label">NAZWA TWOJEJ KOLEKCJI</span><span><input id="showcase-title" maxlength="40" type="text" value="${escape(display.title || 'Moja kolekcja')}" placeholder="Nadaj kolekcji własną nazwę" autocomplete="off">${button('Zapisz nazwę', 'showcase-title', '', 'small outline')}</span></label><div class="showcase-theme-picker"><span class="micro-label">OPRAWA GABLOTY</span><div class="showcase-themes" role="group" aria-label="Motyw gabloty">${themes.map(value => {
        const available = unlocked.has(value.id);
        return `<button class="showcase-theme theme-${value.id} ${theme.id === value.id ? 'active' : ''}" data-action="showcase-theme" data-theme="${value.id}" aria-pressed="${theme.id === value.id}" aria-label="${escape(value.name)}${available ? '' : ' — nagroda za misję tygodniową'}" title="${escape(available ? value.note : 'Odblokuj motyw, odbierając nagrodę za tygodniową misję różnorodności.')}" ${available ? '' : 'disabled'}><span class="theme-swatch"></span>${value.name}${!available ? icon('lock') : theme.id === value.id ? icon('check') : ''}</button>`;
      }).join('')}</div></div></section>
      <section id="showcase-board" class="showcase-board showcase-${theme.id}" data-theme="${theme.id}" aria-label="Gablota kolekcjonera"><div class="showcase-board-heading"><div><span class="micro-label">SKINLAB / PRIVATE COLLECTION</span><h2>${escape(display.title || 'Moja kolekcja')}</h2><p>${number(display.filled)} / ${number(display.totalSlots) || 9} miejsc w gablocie <span>·</span> Motyw ${theme.name}</p></div><div class="showcase-worth"><small>WARTOŚĆ EKSPOZYCJI</small><strong>${money(number(display.totalValue))}</strong><span>Wirtualna kolekcja · CS2</span></div></div><div class="showcase-grid">${display.slots.map((slot, index) => {
        const item = slot.item;
        return `<article class="showcase-slot ${item ? 'filled' : 'vacant'} ${slot.id === 'featured' ? 'featured-slot' : ''}" style="--rarity:${rarityColor(ctx, item)}"><div class="showcase-slot-heading"><span>${String(index + 1).padStart(2, '0')} <b>${escape(slot.label)}</b></span>${item ? `<button class="showcase-remove" data-action="showcase-remove" data-slot="${escape(slot.id)}" aria-label="Usuń ${escape(slot.label)} z gabloty" title="Usuń z gabloty">${icon('close')}</button>` : icon(slot.id === 'featured' ? 'star' : slot.id === 'knife' ? 'star' : 'grid')}</div>${item ? `<button class="showcase-skin" data-action="showcase-pick" data-slot="${escape(slot.id)}" aria-label="Zmień ${escape(slot.label)} w gablocie"><div class="showcase-item-art">${art(ctx, item)}</div><span class="showcase-weapon">${escape(item.weapon)}</span><h3>${escape(ctx.itemName(item))}</h3><div class="showcase-facts">${itemFacts(ctx, item)}</div><div class="showcase-item-bottom"><strong>${money(item.value)}</strong><span>Zmień ${icon('arrow')}</span></div></button>` : `<button class="showcase-empty" data-action="showcase-pick" data-slot="${escape(slot.id)}" aria-label="Wybierz ${escape(slot.label)} do gabloty"><span class="showcase-empty-plus">${icon('plus')}</span><strong>Twoje miejsce na ${escape(slot.label)}</strong><small>Wybierz skin z ekwipunku</small></button>`}</article>`;
      }).join('')}</div><div class="showcase-signature"><span>${icon('shield')} SKINLAB COLLECTION</span><span>Wirtualne przedmioty. Prawdziwy gust.</span><b>${String(number(display.filled)).padStart(2, '0')} / ${number(display.totalSlots) || 9}</b></div></section><div class="info-banner showcase-hint">${icon('info')}<span>Przedmioty w gablocie są chronione przed sprzedażą i upgraderem. Usuń skin z gabloty, aby go użyć. Możesz eksponować także ręcznie chronione skiny.</span></div>`;
  }

  function picker(ctx, options = {}) {
    const { game, escape, icon, money, button } = ctx;
    const display = game.getShowcase();
    const slot = display.slots.find(value => value.id === options.slotId);
    if (!slot) return `<div class="collection-picker-modal"><h2 id="modal-title">Wybierz miejsce w gablocie</h2><p>To miejsce nie jest dostępne.</p>${button('Zamknij', 'close-modal', '', 'secondary')}</div>`;
    const query = String(options.query || '').trim().toLowerCase();
    const sort = ['value_desc', 'value_asc', 'newest'].includes(options.sort) ? options.sort : 'value_desc';
    const items = game.getShowcaseCandidates(slot.id).filter(item => !query || `${item.weapon} ${ctx.itemName(item)} ${item.wear} ${item.stattrak ? 'stattrak' : ''}`.toLowerCase().includes(query));
    items.sort((a, b) => (sort === 'newest' ? number(b.createdAt) - number(a.createdAt) : sort === 'value_asc' ? a.value - b.value : b.value - a.value) || a.id.localeCompare(b.id));
    const pages = Math.max(1, Math.ceil(items.length / 18));
    const page = Math.max(1, Math.min(number(options.page) || 1, pages));
    return `<div class="collection-picker-modal"><div class="section-head"><div><p class="eyebrow">DOBIERZ SWÓJ LOADOUT</p><h2 id="modal-title">${escape(slot.label)} w Twojej gablocie</h2><p class="section-subtitle">${items.length} pasujących skinów. Chronione przedmioty też możesz eksponować.</p></div><button class="icon-button" data-action="close-modal" aria-label="Zamknij wybór skina">${icon('close')}</button></div><div class="showcase-picker-filters"><label class="search-field">${icon('search')}<input id="showcase-search" type="search" aria-label="Szukaj skina do gabloty" placeholder="Znajdź skin w ekwipunku…" value="${escape(options.query || '')}"></label><select id="showcase-sort" class="filter-select" aria-label="Sortuj skiny do gabloty">${[['value_desc', 'Najdroższe'], ['value_asc', 'Najtańsze'], ['newest', 'Najnowsze']].map(([id, label]) => `<option value="${id}" ${sort === id ? 'selected' : ''}>${label}</option>`).join('')}</select></div><div class="showcase-picker-grid">${items.length ? items.slice((page - 1) * 18, page * 18).map(item => {
      const current = slot.item?.id === item.id;
      const equipped = game.isItemEquipped(item.id);
      return `<button class="showcase-pick-card ${current ? 'selected' : ''}" data-action="showcase-equip" data-slot="${escape(slot.id)}" data-id="${escape(item.id)}" aria-pressed="${current}" style="--rarity:${rarityColor(ctx, item)}"><span class="showcase-pick-state">${current ? `${icon('check')} W tym miejscu` : equipped ? `${icon('grid')} Już w gablocie` : item.locked ? `${icon('lock')} Chroniony` : `${icon('plus')} Wybierz`}</span>${art(ctx, item)}<small>${escape(item.weapon)}</small><h3>${escape(ctx.itemName(item))}</h3><span class="showcase-pick-wear">${escape(item.wear || item.wearCode)}${item.stattrak ? ' · StatTrak™' : ''}</span><span class="showcase-pick-bottom"><strong>${money(item.value)}</strong><span>${floatLabel(item)}</span></span></button>`;
    }).join('') : `<div class="empty-state">${icon('grid')}<h3>${query ? 'Brak pasujących skinów' : 'To miejsce czeka na pierwszy skin'}</h3><p>${query ? 'Zmień wyszukiwanie, aby zobaczyć pozostałe przedmioty.' : `Zdobądź przedmiot pasujący do miejsca ${escape(slot.label)}, a pojawi się tutaj.`}</p>${button('Wróć do gabloty', 'close-modal', '', 'small secondary')}</div>`}</div>${pagination(ctx, page, pages, 'showcase-picker-page', `data-slot="${escape(slot.id)}"`)}</div>`;
  }

  function rewardHtml(ctx, reward = {}) {
    const rewards = [];
    for (const [caseId, count] of Object.entries(reward.cases || {})) {
      const box = ctx.cases.find(value => value.id === caseId);
      if (count > 0) rewards.push(`<span>${ctx.icon('box')}<b>${number(count)}×</b> ${ctx.escape(box?.name || caseId)}</span>`);
    }
    if (reward.xp) rewards.push(`<span class="weekly-xp">${ctx.icon('bolt')}<b>+${number(reward.xp)} XP</b></span>`);
    if (reward.cosmetic) {
      const cosmetic = typeof reward.cosmetic === 'string' ? reward.cosmetic : reward.cosmetic.theme || reward.cosmetic.id || reward.cosmetic.label;
      const label = themes.find(theme => theme.id === cosmetic)?.name || (typeof reward.cosmetic === 'object' ? reward.cosmetic.label || reward.cosmetic.name : reward.cosmetic);
      rewards.push(`<span class="weekly-cosmetic">${ctx.icon('star')} Motyw gabloty <b>${ctx.escape(label || 'Specjalny')}</b></span>`);
    }
    return rewards.join('');
  }
  function countdown(endsAt) {
    const minutes = Math.max(0, Math.ceil((number(endsAt) - Date.now()) / 60000));
    const days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60), rest = minutes % 60;
    return days ? `${days} dni ${hours} godz.` : hours ? `${hours} godz. ${rest} min` : `${rest} min`;
  }
  function weekly(ctx) {
    const { game, escape, icon, button } = ctx;
    const week = game.getWeekly();
    const claimed = number(week.claimedCount), total = number(week.total) || week.missions.length;
    return `<section class="weekly-section"><div class="weekly-hero"><div><p class="eyebrow"><span class="dash"></span> NOWY TYDZIEŃ. NOWE CELE.</p><h2>Małe misje. Większa kolekcja.</h2><p>Otwieraj, odkrywaj i poznawaj kolejne skrzynki. Zgarniaj skrzynki gotowe do otwarcia, XP oraz nowe motywy swojej gabloty.</p><span class="weekly-cycle">${icon('check')} ${claimed} / ${total} nagród odebranych <span>·</span> Nowe zadania w każdy poniedziałek</span></div><div class="weekly-deadline"><span>${icon('gift')}</span><small>DO NASTĘPNEGO TYGODNIA</small><strong id="weekly-countdown" data-ends-at="${number(week.endsAt)}">${countdown(week.endsAt)}</strong><p>Do ${escape(date(week.endsAt, true))}</p></div></div><div class="weekly-mission-grid">${week.missions.map((mission, index) => {
      const current = Math.min(number(mission.current), Math.max(1, number(mission.target)));
      const target = Math.max(1, number(mission.target));
      const ready = mission.completed && !mission.claimed;
      return `<article class="weekly-mission ${mission.claimed ? 'claimed' : ready ? 'ready' : ''}"><div class="weekly-mission-top"><span class="weekly-mission-number">${String(index + 1).padStart(2, '0')}</span><span class="micro-label">${mission.claimed ? `${icon('check')} ODEBRANO` : ready ? `${icon('gift')} NAGRODA CZEKA` : 'W TOKU'}</span></div><h3>${escape(mission.title)}</h3><p>${escape(mission.description)}</p><div class="weekly-progress-label"><span>Twój postęp</span><strong>${current} <small>/ ${target}</small></strong></div><div class="progress-track" role="progressbar" aria-label="${escape(mission.title)}" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${current}"><span style="width:${current / target * 100}%"></span></div><div class="weekly-reward"><span class="micro-label">TWOJA NAGRODA</span><div>${rewardHtml(ctx, mission.reward)}</div></div>${button(mission.claimed ? `${icon('check')} Nagroda odebrana` : ready ? `${icon('gift')} Odbierz nagrodę` : 'Zrealizuj cel, aby odebrać', 'claim-weekly', `data-id="${escape(mission.id)}" ${ready ? '' : 'disabled'}`, `wide small ${ready ? '' : 'outline'}`)}</article>`;
    }).join('')}</div><div class="info-banner weekly-hint">${icon('info')}<span>Misje liczą postęp z bieżącego tygodnia. Każdą nagrodę odbierzesz raz, przed poniedziałkową zmianą zadań. Zdobyte motywy gabloty zostają z Tobą na stałe.</span></div></section>`;
  }

  function historyItem(ctx, entry) {
    if (entry.item) return entry.item;
    const target = ctx.skins.find(skin => skin.id === entry.targetSkinId);
    return target ? { ...target, wearCode: entry.wearCode, wear: window.CaseGame.WEARS.find(wear => wear.code === entry.wearCode)?.label || entry.wearCode } : null;
  }
  function recordCard(ctx, { label, glyph, record, value, hint }) {
    const item = record?.item;
    return `<article class="play-record" style="--rarity:${rarityColor(ctx, item)}"><span class="micro-label">${ctx.icon(glyph)} ${label}</span>${item ? `<div class="play-record-art">${art(ctx, item)}</div><small>${ctx.escape(item.weapon)}</small><h3>${ctx.escape(ctx.itemName(item))}</h3><strong>${value}</strong><p>${hint}</p><span class="record-wear">${ctx.escape(item.wear || item.wearCode || '—')}</span>` : `<div class="play-record-empty">${ctx.icon(glyph)}<strong>Przed Tobą</strong><p>${hint}</p></div>`}</article>`;
  }
  function history(ctx, options = {}) {
    const { game, escape, icon, money } = ctx;
    const records = game.getRecords();
    const source = game.getHistory();
    const query = String(options.query || '').trim().toLowerCase();
    const type = ['opening', 'upgrade'].includes(options.type) ? options.type : 'all';
    const rarity = ctx.rarities[options.rarity] ? options.rarity : 'all';
    const sort = options.sort === 'value_desc' ? 'value_desc' : 'newest';
    const entryValue = entry => entry.type === 'upgrade' && !entry.won ? 0 : number(entry.item?.value);
    const entries = source.filter(entry => {
      const item = historyItem(ctx, entry);
      const box = ctx.cases.find(value => value.id === entry.caseId);
      return (type === 'all' || entry.type === type) && (rarity === 'all' || item?.rarity === rarity) && (!query || `${item?.weapon || ''} ${item ? ctx.itemName(item) : ''} ${item?.wear || ''} ${box?.name || ''} ${entry.type === 'upgrade' ? 'upgrader ulepszanie' : 'otwarcie skrzynki'}`.toLowerCase().includes(query));
    });
    entries.sort((a, b) => (sort === 'value_desc' ? entryValue(b) - entryValue(a) : number(b.at) - number(a.at)) || String(b.id).localeCompare(String(a.id)));
    const pages = Math.max(1, Math.ceil(entries.length / 15)), page = Math.max(1, Math.min(number(options.page) || 1, pages));
    const best = records.bestOpening, rarest = records.rarestDrop, bestFloat = records.bestFloat, upgrade = records.bestUpgrade;
    const recordCards = [
      { label: 'NAJDROŻSZE OTWARCIE', glyph: 'star', record: best, value: best?.item ? money(best.item.value) : '', hint: best?.item ? `${escape(ctx.cases.find(box => box.id === best.caseId)?.name || 'Drop ze skrzynki')} · ${escape(date(best.at))}` : 'Twój najcenniejszy drop pojawi się tutaj.' },
      { label: 'NAJRZADSZY DROP', glyph: 'trophy', record: rarest, value: rarest?.item ? ctx.percent(number(rarest.chance)) : '', hint: rarest?.item ? `Szansa na konkretny wariant · ${money(rarest.item.value)}` : 'Każda skrzynka ma szansę rozpocząć tę historię.' },
      { label: 'NAJLEPSZY FLOAT', glyph: 'bolt', record: bestFloat, value: bestFloat?.item ? floatLabel(bestFloat.item) : '', hint: bestFloat?.item ? `Najmniejsze zużycie zdobytego skina · ${escape(date(bestFloat.at))}` : 'Szukaj skinów z jak najniższym floatem.' },
      { label: 'NAJLEPSZY UPGRADE', glyph: 'upgrade', record: upgrade, value: upgrade?.item ? `${number(upgrade.multiplier).toLocaleString('pl-PL', { maximumFractionDigits: 2 })}×` : '', hint: upgrade?.item ? `Wygrana przy szansie ${ctx.percent(number(upgrade.chance))} · ${money(upgrade.item.value)}` : 'Pierwsza wygrana w upgraderze czeka na Ciebie.' }
    ];
    return `<section class="play-history"><div class="section-head history-section-heading"><div><p class="eyebrow">KAŻDY DROP MA SWOJĄ HISTORIĘ</p><h2>Twoje rekordy</h2><p class="section-subtitle">Osobiste osiągnięcia i bilans otwarć od ${escape(dateOnly(records.since))}.</p></div><span class="history-tracking-label">${icon('shield')} Zapis na tym urządzeniu</span></div><div class="play-record-grid">${recordCards.map(value => recordCard(ctx, value)).join('')}</div><div class="opening-balance-panel"><div><span class="micro-label">BILANS OTWIERANIA</span><strong class="${number(records.balance) >= 0 ? 'positive' : 'negative'}">${number(records.balance) > 0 ? '+' : ''}${money(number(records.balance))}</strong><p>Wartość dropów po prowizji sprzedaży minus koszt otwartych skrzynek.</p></div><dl><div><dt>Otwarte skrzynki</dt><dd>${number(records.opens).toLocaleString('pl-PL')}</dd></div><div><dt>Koszt otwarć</dt><dd>${money(number(records.openingCost))}</dd></div><div><dt>Wartość dropów</dt><dd>${money(number(records.dropValue))}</dd></div><div><dt>Po prowizji sprzedaży</dt><dd>${money(number(records.netDropValue))}</dd></div></dl></div><div class="section-head history-list-heading"><div><h2>Dziennik gry <small>${entries.length} zdarzeń</small></h2><p class="section-subtitle">Ostatnie 200 zdarzeń. Rekordy i bilans obejmują cały zapis od wprowadzenia historii.</p></div></div><div class="history-filters"><label class="search-field">${icon('search')}<input id="history-search" type="search" placeholder="Znajdź skin lub skrzynkę…" aria-label="Szukaj w historii gry" value="${escape(options.query || '')}"></label><select id="history-type" class="filter-select" aria-label="Typ zdarzeń w historii"><option value="all" ${type === 'all' ? 'selected' : ''}>Wszystkie zdarzenia</option><option value="opening" ${type === 'opening' ? 'selected' : ''}>Otwieranie skrzynek</option><option value="upgrade" ${type === 'upgrade' ? 'selected' : ''}>Upgrader</option></select><select id="history-rarity" class="filter-select" aria-label="Rzadkość przedmiotu w historii"><option value="all">Wszystkie rzadkości</option>${Object.values(ctx.rarities).map(value => `<option value="${escape(value.id)}" ${rarity === value.id ? 'selected' : ''}>${escape(value.label)}</option>`).join('')}</select><select id="history-sort" class="filter-select" aria-label="Sortuj historię"><option value="newest" ${sort === 'newest' ? 'selected' : ''}>Najnowsze</option><option value="value_desc" ${sort === 'value_desc' ? 'selected' : ''}>Najwyższa wartość dropu</option></select></div><div id="history-results" class="history-entries">${entries.length ? entries.slice((page - 1) * 15, page * 15).map(entry => {
      const item = historyItem(ctx, entry), isUpgrade = entry.type === 'upgrade', lost = isUpgrade && !entry.won;
      const box = ctx.cases.find(value => value.id === entry.caseId);
      const title = isUpgrade ? lost ? 'Próba ulepszenia · przegrana' : 'Udane ulepszenie' : `Otwarcie · ${box?.name || 'Skrzynka'}`;
      return `<article class="history-entry ${isUpgrade ? lost ? 'upgrade-lost' : 'upgrade-won' : 'opening-entry'}" style="--rarity:${rarityColor(ctx, item)}"><div class="history-item-art">${item ? art(ctx, item) : icon(isUpgrade ? 'upgrade' : 'box')}</div><div class="history-item-copy"><span class="history-entry-type">${icon(isUpgrade ? 'upgrade' : 'box')}${escape(title)}${entry.quantity > 1 ? `<em>${isUpgrade ? `Wkład: ${number(entry.quantity)} ${number(entry.quantity) < 5 ? 'skiny' : 'skinów'}` : `Seria ×${number(entry.quantity)}`}</em>` : ''}</span><h3>${item ? `${escape(item.weapon)} <span>| ${escape(ctx.itemName(item))}</span>` : 'Przedmiot niedostępny'}</h3><div class="history-item-facts">${item ? itemFacts(ctx, item) : ''}${entry.chance != null ? `<span>Szansa ${ctx.percent(number(entry.chance))}</span>` : ''}${isUpgrade && entry.multiplier ? `<span>Cel ${number(entry.multiplier).toLocaleString('pl-PL', { maximumFractionDigits: 2 })}×</span>` : ''}</div><time datetime="${new Date(number(entry.at)).toISOString()}">${escape(date(entry.at, true))}</time></div><div class="history-item-value"><span class="${lost ? 'negative' : isUpgrade ? 'positive' : ''}">${lost ? 'Wkład zużyty' : isUpgrade ? 'Wygrany skin' : 'Wartość dropu'}</span><strong class="${lost ? 'negative' : ''}">${lost ? `−${money(number(entry.inputValue))}` : money(number(entry.item?.value))}</strong><small>${isUpgrade ? `Wkład ${money(number(entry.inputValue))}${entry.targetValue ? ` · Cel ${money(number(entry.targetValue))}` : ''}` : `Koszt ${money(number(entry.cost))}`}</small></div></article>`;
    }).join('') : `<div class="empty-state history-empty">${icon('book')}<h3>${source.length ? 'Brak pasujących zdarzeń' : 'Twoja historia zaczyna się teraz'}</h3><p>${source.length ? 'Zmień filtry lub wyszukiwane słowa.' : 'Otwórz skrzynkę lub wykonaj upgrade. Wcześniejszy stan gry zachowujesz, a dziennik i rekordy zbierają nowe zdarzenia od tej aktualizacji.'}</p>${source.length ? '' : `<a class="button small secondary" href="#cases">Wybierz skrzynkę ${icon('arrow')}</a>`}</div>`}</div>${pagination(ctx, page, pages, 'history-page')}<p class="history-footnote">Bilans opisuje symulowaną wartość dropów. Nie jest stanem konta ani sumą faktycznie sprzedanych skinów.</p></section>`;
  }

  return { showcase, picker, weekly, history };
})();

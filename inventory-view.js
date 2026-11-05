/* Skins and grouped resources share one inventory; game.js owns the quantities. */
window.InventoryView = (() => {
  'use strict';
  function filteredSkins(ctx, filter) {
    if (filter.tab === 'cases' || filter.tab === 'keys') return [];
    const query = filter.query.trim().toLowerCase();
    const list = ctx.state.inventory.filter(item => (!filter.favorites || item.locked || ctx.game.isItemEquipped(item.id)) && (filter.rarity === 'all' || item.rarity === filter.rarity) && (filter.wear === 'all' || item.wearCode === filter.wear) && (!query || `${item.weapon} ${ctx.itemName(item)} ${item.wear} ${item.stattrak ? 'stattrak' : item.souvenir ? 'souvenir' : ''} ${Number.isInteger(item.paintSeed) ? `seed ${item.paintSeed} pattern ${item.paintSeed}` : ''}`.toLowerCase().includes(query)));
    const sorts = {
      newest: (a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id),
      value_desc: (a, b) => b.value - a.value,
      value_asc: (a, b) => a.value - b.value,
      rarity: (a, b) => ctx.rarities[b.rarity].rank - ctx.rarities[a.rarity].rank || b.value - a.value,
      name: (a, b) => `${a.weapon} ${ctx.itemName(a)}`.localeCompare(`${b.weapon} ${ctx.itemName(b)}`, 'pl')
    };
    return list.sort(sorts[filter.sort] || sorts.newest);
  }

  function resourceCard(ctx, entry) {
    const { icon, escape, money, caseImage, image, assets } = ctx;
    const key = entry.kind === 'key';
    const color = entry.box.accent || '#b79b64';
    return `<article class="resource-card" style="--rarity:${color}"><span class="resource-type">${icon(key ? 'key' : 'box')}${key ? 'PASUJĄCY KLUCZ' : 'SKRZYNKA'}</span><span class="resource-quantity">×${entry.count}</span><div class="resource-art">${key ? image(assets.keys?.[entry.box.id] || assets.key, `Klucz ${entry.box.name}`) : caseImage(entry.box.id)}</div><h3>${escape(entry.box.name)}</h3><p>${key ? 'Pasuje wyłącznie do tej kolekcji.' : `${entry.box.skins.length} wykończeń w puli.`}</p><div class="resource-unit-price">${money(key ? entry.box.keyPrice : entry.box.price)} / szt.</div><a class="button small secondary wide" href="#case/${entry.box.id}">${key ? 'Użyj klucza' : 'Otwórz skrzynkę'} ${icon('arrow')}</a></article>`;
  }

  function grid(ctx, filter) {
    const { state, cases, money, button, icon, skinCard, plural } = ctx;
    const skins = filteredSkins(ctx, filter);
    const sellable = skins.filter(item => !item.locked && !ctx.game.isItemEquipped(item.id));
    const query = filter.query.trim().toLowerCase();
    let resources = [];
    if (!filter.favorites && filter.rarity === 'all' && filter.wear === 'all') {
      for (const box of cases) {
        if ((filter.tab === 'all' || filter.tab === 'keys') && state.keys[box.id] && `klucz ${box.name}`.toLowerCase().includes(query)) resources.push({ kind: 'key', box, count: state.keys[box.id], value: box.keyPrice * state.keys[box.id] });
        if ((filter.tab === 'all' || filter.tab === 'cases') && state.cases[box.id] && `skrzynka ${box.name}`.toLowerCase().includes(query)) resources.push({ kind: 'case', box, count: state.cases[box.id], value: box.price * state.cases[box.id] });
      }
    }
    const entries = [...resources, ...skins.map(item => ({ kind: 'skin', item, value: item.value }))];
    if (filter.sort === 'value_desc') entries.sort((a, b) => b.value - a.value);
    if (filter.sort === 'value_asc') entries.sort((a, b) => a.value - b.value);
    const pages = Math.max(1, Math.ceil(entries.length / 20));
    const page = Math.max(1, Math.min(filter.page, pages));
    const resultLabel = entries.length ? `${entries.length} ${plural(entries.length, 'pozycja', 'pozycje', 'pozycji')} · ${sellable.length} skinów do sprzedaży za ${money(sellable.reduce((sum, item) => sum + ctx.game.saleValue(item.value), 0))}` : '';
    return {
      page, sellableCount: sellable.length, label: resultLabel,
      html: entries.length ? entries.slice((page - 1) * 20, page * 20).map(entry => entry.kind === 'skin' ? skinCard(entry.item, true) : resourceCard(ctx, entry)).join('') : `<div class="empty-state">${icon(filter.tab === 'keys' ? 'key' : filter.tab === 'cases' ? 'box' : 'grid')}<h2>Brak pasujących przedmiotów</h2><p>${filter.query || filter.favorites || filter.rarity !== 'all' || filter.wear !== 'all' ? 'Zmień wyszukiwanie lub wyczyść filtry.' : filter.tab === 'keys' ? 'Kup klucz w sklepie. Tutaj zobaczysz jego typ oraz liczbę sztuk.' : filter.tab === 'cases' ? 'Kup wybraną skrzynkę i pasujący klucz w sklepie.' : 'Kup skrzynkę i klucz. Po otwarciu skin trafi w to samo miejsce.'}</p>${filter.query || filter.favorites || filter.rarity !== 'all' || filter.wear !== 'all' ? button('Wyczyść filtry', 'clear-filters', '', 'secondary') : '<a class="button" href="#shop">Przejdź do sklepu ' + icon('arrow') + '</a>'}</div>`,
      pagination: pages > 1 ? `<div class="inventory-pagination">${button(`${icon('back')} Poprzednia`, 'inventory-page', `data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}`, 'small outline')}<span>Strona ${page} z ${pages}</span>${button(`Następna ${icon('arrow')}`, 'inventory-page', `data-page="${page + 1}" ${page === pages ? 'disabled' : ''}`, 'small outline')}</div>` : ''
    };
  }

  function render(ctx, filter) {
    const { game, state, icon, escape, money, button, feePercent, rarities } = ctx;
    const resources = game.getResources();
    const total = state.inventory.reduce((sum, item) => sum + item.value, 0);
    const net = state.inventory.filter(item => !item.locked && !game.isItemEquipped(item.id)).reduce((sum, item) => sum + game.saleValue(item.value), 0);
    const allCount = state.inventory.length + resources.totalCases + resources.totalKeys;
    const resourceOnly = filter.tab === 'keys' || filter.tab === 'cases';
    return `<div class="view-heading"><p class="eyebrow"><span class="dash"></span> WSZYSTKO, CZEGO POTRZEBUJE KOLEKCJONER</p><h1>Twój ekwipunek</h1><div class="collection-links"><a class="button small outline" href="#skins">${icon("book")} Atlas skinów i patternów</a><a class="button small secondary" href="#showcase">${icon("star")} Moja gablota</a><a class="button small outline" href="#career/history">${icon("clock")} Historia i rekordy</a></div><p>Skiny, skrzynki i klucze w jednym miejscu. Chronione przedmioty zachowasz także przy zbiorczej sprzedaży.</p></div><div class="inventory-stats"><div class="inventory-stat"><small>Wartość skinów</small><b>${money(total)}</b></div><div class="inventory-stat"><small>Sprzedaż niechronionych · prowizja ${feePercent}%</small><b class="green-text">${money(net)}</b></div><div class="inventory-stat inventory-stock"><small>Twoje zapasy</small><div><span>${icon('box')}<b>${resources.totalCases}</b><em>skrzynek</em></span><span>${icon('key')}<b>${resources.totalKeys}</b><em>kluczy</em></span></div></div></div><div class="inventory-tabs segmented" aria-label="Typ przedmiotów w ekwipunku">${[['all', 'Wszystko', allCount], ['skins', 'Skiny', state.inventory.length], ['cases', 'Skrzynki', resources.totalCases], ['keys', 'Klucze', resources.totalKeys]].map(([id, title, count]) => `<button class="${filter.tab === id ? 'active' : ''}" data-action="inventory-tab" data-tab="${id}" aria-pressed="${filter.tab === id}">${title}<span>${count}</span></button>`).join('')}</div><div class="inventory-toolbar"><label class="search-field">${icon('search')}<input id="inventory-search" type="search" placeholder="Znajdź skin, skrzynkę lub klucz…" aria-label="Szukaj w ekwipunku" value="${escape(filter.query)}"></label><select id="rarity-filter" class="filter-select" aria-label="Filtruj według rzadkości" ${resourceOnly ? 'disabled' : ''}><option value="all">Wszystkie rzadkości</option>${Object.values(rarities).map(r => `<option value="${r.id}" ${filter.rarity === r.id ? 'selected' : ''}>${r.label}</option>`).join('')}</select><select id="wear-filter" class="filter-select" aria-label="Filtruj według zużycia" ${resourceOnly ? 'disabled' : ''}><option value="all">Wszystkie stany</option>${window.CaseGame.WEARS.map(w => `<option value="${w.code}" ${filter.wear === w.code ? 'selected' : ''}>${w.code} · ${w.label}</option>`).join('')}</select><select id="inventory-sort" class="filter-select" aria-label="Sortuj ekwipunek">${[['newest', 'Najnowsze'], ['value_desc', 'Najdroższe'], ['value_asc', 'Najtańsze'], ['rarity', 'Najrzadsze'], ['name', 'Nazwa A–Z']].map(([value, label]) => `<option value="${value}" ${filter.sort === value ? 'selected' : ''}>${label}</option>`).join('')}</select><button class="button small outline ${filter.favorites ? 'selected' : ''}" data-action="favorites-filter" aria-pressed="${filter.favorites}" aria-label="Pokaż tylko chronione przedmioty" ${resourceOnly ? 'disabled' : ''}>${icon('star')}</button>${button('Sprzedaj skiny', 'sell-filtered', 'id="sell-filtered"', 'small outline')}</div><p class="filter-results" id="inventory-results"></p><div class="content-grid inventory-grid" id="inventory-grid"></div><div id="inventory-pagination"></div>`;
  }
  return { render, grid, filteredSkins };
})();

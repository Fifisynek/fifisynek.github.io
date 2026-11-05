/* Skin atlas and read-only inspection. Prices and pattern facts come from the game catalog. */
window.SkinView = (() => {
  'use strict';
  const EDITIONS = { regular: 'Zwykły', stattrak: 'StatTrak™', souvenir: 'Souvenir' };
  const TYPES = { all: 'Wszystkie bronie', knife: 'Noże', gloves: 'Rękawice', rifle: 'Karabiny', sniper: 'Snajperki', pistol: 'Pistolety', smg: 'PM-y', shotgun: 'Strzelby', machinegun: 'Karabiny maszynowe', taser: 'Zeus x27' };
  const PHASES = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Ruby', 'Sapphire', 'Black Pearl', 'Emerald'];
  const variantCounts = new WeakMap();
  const wearList = () => window.CaseGame.WEARS;
  function quote(ctx, skin, wear, edition) {
    if (!skin) return null;
    if (ctx.game.getSkinPrice) return ctx.game.getSkinPrice(skin.id, wear, edition);
    if ((edition === 'stattrak' && !skin.stattrak) || (edition === 'souvenir' && !skin.souvenir)) return null;
    const value = ctx.game.getSkinValue(skin.id, wear, edition === 'stattrak');
    return value == null ? null : { value, method: 'legacy', estimated: true, source: 'Skinport' };
  }
  function date(value) {
    if (!value) return 'Data niedostępna';
    const parsed = typeof value === 'number' ? new Date(value < 1e12 ? value * 1000 : value) : new Date(value);
    return Number.isNaN(parsed.valueOf()) ? 'Data niedostępna' : parsed.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function priceLabel(price) {
    if (price?.estimated || price?.method === 'estimated' || price?.method === 'legacy') return 'Szacunek';
    return price?.method === 'min_price' ? 'Oferta min.' : 'Cena referencyjna';
  }
  function family(skin) { return skin.patternFamily || skin.patternName || 'none'; }
  function familyLabel(value) {
    const normalized = String(value || '').toLowerCase().replace(/[ _-]/g, '');
    return ({ casehardened: 'Case Hardened', fade: 'Fade', marblefade: 'Marble Fade', doppler: 'Doppler', gammadoppler: 'Gamma Doppler', slaughter: 'Slaughter', crimsonweb: 'Crimson Web', tigertooth: 'Tiger Tooth', heattreated: 'Heat Treated', other: 'Wzór malowania', vanilla: 'Bez malowania', none: 'Bez malowania' })[normalized] || value;
  }
  function skinType(skin) {
    if (skin.art) return skin.art;
    if (/Gloves|Wraps/.test(skin.weapon)) return 'gloves';
    if (/★/.test(skin.weapon)) return 'knife';
    if (/AWP|SSG|SCAR|G3SG/.test(skin.weapon)) return 'sniper';
    if (/AK-|M4|AUG|SG |FAMAS|Galil/.test(skin.weapon)) return 'rifle';
    if (/Nova|MAG|XM|Sawed/.test(skin.weapon)) return 'shotgun';
    if (/MAC|MP|PP-|P90/.test(skin.weapon)) return 'smg';
    if (/Negev|M249/.test(skin.weapon)) return 'machinegun';
    if (skin.weapon === 'Zeus x27') return 'taser';
    return 'pistol';
  }
  function percentage(value) {
    return Number.isFinite(value) ? value.toLocaleString('pl-PL', { maximumFractionDigits: 2 }) + '%' : null;
  }
  function pattern(ctx, itemOrId, seed) {
    if (!ctx.game.getPatternInfo) return null;
    return seed === undefined ? ctx.game.getPatternInfo(itemOrId) : ctx.game.getPatternInfo(itemOrId, seed);
  }
  function canonical(ctx, item) {
    return ctx.skins.find(skin => skin.id === (item.catalogId || item.sourceId || item.skinId || item.id)) || item;
  }
  function patternTags(ctx, item) {
    const source = canonical(ctx, item);
    const info = pattern(ctx, item);
    const seed = source.noWear ? null : info?.seed ?? item.paintSeed ?? item.patternSeed ?? null;
    const tags = [];
    if (source.phase || item.phase) tags.push(`<span class="pattern-tag phase">${ctx.escape(source.phase || item.phase)}</span>`);
    if (Number.isInteger(seed)) tags.push(`<span class="pattern-tag seed">SEED ${seed}</span>`);
    if (Number.isFinite(info?.fadePercent)) tags.push(`<span class="pattern-tag fade">FADE ${percentage(info.fadePercent)}</span>`);
    if (Number.isFinite(info?.bluePercent)) tags.push(`<span class="pattern-tag blue">BLUE ${percentage(info.bluePercent)}</span>`);
    return tags.length ? `<span class="pattern-tags">${tags.join('')}</span>` : '';
  }
  function select(ctx, id, label, values, selected) {
    return `<label class="atlas-select"><span>${label}</span><select id="${id}" class="filter-select" aria-label="${label}">${Object.entries(values).map(([value, text]) => `<option value="${ctx.escape(value)}" ${value === selected ? 'selected' : ''}>${ctx.escape(text)}</option>`).join('')}</select></label>`;
  }
  function pagination(ctx, page, pages) {
    return pages > 1 ? `<div class="inventory-pagination atlas-pagination">${ctx.button('←', 'atlas-page', `data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}`, 'small outline')}<span>Strona ${page} z ${pages}</span>${ctx.button('→', 'atlas-page', `data-page="${page + 1}" ${page === pages ? 'disabled' : ''}`, 'small outline')}</div>` : '';
  }
  function atlas(ctx, options = {}) {
    const opts = { query: '', type: 'all', rarity: 'all', phase: 'all', pattern: 'all', edition: 'regular', wear: 'MW', sort: 'value_asc', page: 1, ...options };
    const { skins, escape, money, image, skinImage, itemName, icon, rarities } = ctx;
    const families = Object.fromEntries(['all', ...new Set(skins.map(family).filter(value => value && value !== 'none'))].map(value => [value, value === 'all' ? 'Wszystkie wzory' : familyLabel(value)]));
    const search = opts.query.trim().toLocaleLowerCase('pl-PL');
    const found = skins.filter(skin => (opts.type === 'all' || skinType(skin) === opts.type) && (opts.rarity === 'all' || skin.rarity === opts.rarity) && (opts.phase === 'all' || skin.phase === opts.phase) && (opts.pattern === 'all' || family(skin) === opts.pattern) && `${skin.weapon} ${itemName(skin)} ${(skin.collectionNames || []).join(' ')}`.toLocaleLowerCase('pl-PL').includes(search))
      .map(skin => ({ skin, price: quote(ctx, skin, opts.wear, opts.edition) })).filter(entry => entry.price && Number.isFinite(entry.price.value));
    found.sort((a, b) => (opts.sort === 'value_desc' ? b.price.value - a.price.value : opts.sort === 'name' ? `${a.skin.weapon} ${itemName(a.skin)}`.localeCompare(`${b.skin.weapon} ${itemName(b.skin)}`, 'pl') : opts.sort === 'rarity' ? (rarities[b.skin.rarity]?.rank || 0) - (rarities[a.skin.rarity]?.rank || 0) : a.price.value - b.price.value) || a.skin.id.localeCompare(b.skin.id));
    const pages = Math.max(1, Math.ceil(found.length / 36));
    const page = Math.max(1, Math.min(Number(opts.page) || 1, pages));
    let variants = variantCounts.get(skins);
    if (variants == null) {
      variants = skins.reduce((sum, skin) => sum + Object.keys(EDITIONS).reduce((editions, edition) => editions + wearList().filter(wear => quote(ctx, skin, wear.code, edition)).length, 0), 0);
      variantCounts.set(skins, variants);
    }
    const meta = ctx.catalogMeta || window.CaseCatalog?.META || {};
    return `<div class="view-heading atlas-heading"><div><p class="eyebrow"><span class="dash"></span> WYBIERZ SWOJĄ NASTĘPNĄ PEREŁKĘ</p><h1>Atlas skinów</h1><p>Przeglądaj wykończenia, fazy, stany i konkretne edycje. Każdy szczegół ma znaczenie.</p></div><a class="button secondary small" href="#upgrader">${icon('upgrade')} Przejdź do upgradera</a></div>
      <section class="atlas-intro"><div><strong>${skins.length.toLocaleString('pl-PL')}</strong><span>wykończeń i faz</span></div><div><strong>${variants.toLocaleString('pl-PL')}</strong><span>kombinacji stanu i edycji</span></div><div class="atlas-intro-note"><span class="atlas-live-dot"></span><p>Ceny w USD · migawka danych ${escape(date(meta.priceSnapshotDate || meta.catalogDate))}<br><span>Fazy mają osobne notowania. Dopłaty za seed nie są doliczane.</span></p></div></section>
      <section class="atlas-filter-panel" aria-label="Filtry atlasu"><label class="search-field atlas-search">${icon('search')}<input id="atlas-search" type="search" value="${escape(opts.query)}" placeholder="Karambit, Doppler, Dragon Lore…" aria-label="Szukaj skina w atlasie"></label><div class="atlas-filter-grid">${select(ctx, 'atlas-type', 'Typ broni', TYPES, opts.type)}${select(ctx, 'atlas-rarity', 'Rzadkość', { all: 'Wszystkie rzadkości', ...Object.fromEntries(Object.values(rarities).map(rarity => [rarity.id, rarity.label])) }, opts.rarity)}${select(ctx, 'atlas-phase', 'Faza', { all: 'Wszystkie fazy', ...Object.fromEntries(PHASES.map(phase => [phase, phase])) }, opts.phase)}${select(ctx, 'atlas-pattern', 'Rodzina wzoru', families, opts.pattern)}${select(ctx, 'atlas-edition', 'Edycja', EDITIONS, opts.edition)}${select(ctx, 'atlas-wear', 'Stan zużycia', Object.fromEntries(wearList().map(wear => [wear.code, `${wear.code} · ${wear.label}`])), opts.wear)}${select(ctx, 'atlas-sort', 'Sortowanie', { value_asc: 'Cena rosnąco', value_desc: 'Cena malejąco', name: 'Nazwa A–Z', rarity: 'Rzadkość' }, opts.sort)}</div><p class="atlas-filter-note">Wyświetlane są tylko skiny dostępne w wybranym stanie i edycji. Filtry służą do podglądu katalogu; nie zmieniają szans ani wyniku otwierania.</p></section>
      <div class="section-head atlas-results-heading"><h2>${found.length.toLocaleString('pl-PL')} wyników <small>${escape(EDITIONS[opts.edition])} · ${escape(opts.wear)}</small></h2><span>Kliknij skin, aby obejrzeć szczegóły</span></div>
      <div class="atlas-grid">${found.length ? found.slice((page - 1) * 36, page * 36).map(({ skin, price }) => `<button class="atlas-card" data-action="inspect-skin" data-skin="${escape(skin.id)}" data-wear="${escape(opts.wear)}" data-edition="${escape(opts.edition)}" style="--rarity:${rarities[skin.rarity]?.color || '#8e949f'}" aria-label="Szczegóły ${escape(skin.weapon + ' ' + itemName(skin))}"><span class="atlas-card-top"><span>${escape(rarities[skin.rarity]?.label || '')}</span><em>${escape(opts.wear)}</em></span><div class="atlas-card-art">${image(skinImage(skin), '')}</div><span class="atlas-card-weapon">${escape(skin.weapon)}</span><h3>${escape(itemName(skin))}</h3><div class="atlas-card-tags">${skin.phase ? `<span class="pattern-tag phase">${escape(skin.phase)}</span>` : family(skin) !== 'none' ? `<span class="pattern-tag">${escape(familyLabel(family(skin)))}</span>` : '<span class="atlas-fixed-finish">Wykończenie kolekcjonerskie</span>'}</div><div class="atlas-card-price"><strong>${money(price.value)}</strong><span class="price-method ${price.estimated ? 'estimated' : ''}">${priceLabel(price)}</span></div></button>`).join('') : `<div class="empty-state atlas-empty">${icon('search')}<h2>Brak pasujących skinów</h2><p>Zmień stan lub edycję. Wiele noży Doppler występuje wyłącznie jako Factory New i Minimal Wear.</p><a class="button secondary small" href="#cases">Przeglądaj skrzynki ${icon('arrow')}</a></div>`}</div>${pagination(ctx, page, pages)}
      <p class="atlas-source-note">Notowania bazowe: Skinport. „Oferta min.” oznacza najtańszą dostępną ofertę w zapisanej migawce, „Cena referencyjna” — cenę sugerowaną przez źródło, a „Szacunek” — zastępstwo brakującego notowania. Ceny są odczytywane z lokalnego katalogu.</p>`;
  }
  function inspect(ctx, options = {}) {
    const { escape, money, image, skinImage, itemName, icon, rarities } = ctx;
    const owned = options.itemId ? ctx.state.inventory.find(item => item.id === options.itemId) : null;
    const skin = ctx.skins.find(entry => entry.id === options.skinId || entry.id === owned?.catalogId || entry.id === owned?.sourceId);
    if (!skin) return `<div class="modal-body"><div class="modal-top"><h2 id="modal-title">Skin niedostępny</h2>${ctx.button(icon('close'), 'close-modal', 'aria-label="Zamknij"', 'icon-button')}</div><p>Nie udało się znaleźć tego wykończenia w katalogu.</p></div>`;
    const wear = owned?.wearCode || options.wear || 'MW';
    const edition = owned ? (owned.edition || (owned.souvenir ? 'souvenir' : owned.stattrak ? 'stattrak' : 'regular')) : (options.edition || 'regular');
    const price = quote(ctx, skin, wear, edition);
    const info = pattern(ctx, owned || skin.id, owned ? undefined : options.seed);
    const seed = skin.noWear ? null : info?.seed ?? owned?.paintSeed ?? owned?.patternSeed ?? (Number.isInteger(options.seed) ? options.seed : null);
    const method = priceLabel(price);
    const selectedWear = wearList().find(entry => entry.code === wear);
    const phaseSiblings = skin.phase ? ctx.skins.filter(entry => entry.weapon === skin.weapon && entry.name === skin.name && entry.phase).sort((a, b) => PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase)) : [];
    const currentFloat = owned && !owned.noWear && Number.isFinite(owned.float) ? owned.float.toFixed(6) : null;
    const metrics = [['Fade', info?.fadePercent], ['Niebieski', info?.bluePercent], ['Fioletowy', info?.purplePercent], ['Złoty', info?.goldPercent]].filter(([, value]) => Number.isFinite(value));
    const factualPattern = Boolean(info?.family || family(skin) !== 'none');
    const sourceUrl = price?.url && /^https:\/\//.test(price.url) ? price.url : 'https://skinport.com/market';
    return `<div class="skin-inspector" style="--rarity:${rarities[skin.rarity]?.color || '#8e949f'}"><div class="modal-top"><span class="micro-label">INSPEKTOR SKINA ${owned ? '· TWÓJ PRZEDMIOT' : '· KATALOG'}</span>${ctx.button(icon('close'), 'close-modal', 'aria-label="Zamknij"', 'icon-button')}</div><div class="inspector-overview"><div class="inspector-art">${image(skinImage(owned || skin), skin.weapon + ' ' + itemName(skin), '', true)}<span>${escape(rarities[skin.rarity]?.label || '')}</span></div><div class="inspector-identity"><p class="inspector-weapon">${escape(skin.weapon)}</p><h2 id="modal-title">${escape(itemName(skin))}</h2><div class="inspector-edition">${escape(EDITIONS[edition] || EDITIONS.regular)} · ${escape(selectedWear?.label || wear)}</div>${patternTags(ctx, owned || skin)}<strong class="inspector-main-price">${price ? money(price.value) : 'Brak notowania'}</strong><span class="inspector-price-caption">${escape(method)}${price ? ' · ' + escape(price.source || 'Skinport') : ''}</span>${owned && price && owned.value !== price.value ? `<div class="inspector-owned-value"><span>Wartość zapisana w grze</span><b>${money(owned.value)}</b></div>` : ''}<div class="inspector-float"><span>Float</span><strong>${currentFloat || (owned?.noWear || skin.noWear ? 'Bez zużycia' : owned ? 'Nieznany — stary zapis' : `${Number(skin.minFloat || 0).toFixed(2)} – ${Number(skin.maxFloat ?? 1).toFixed(2)}`)}</strong></div></div></div>
      <div class="inspector-price-source"><span class="price-method ${price?.estimated ? 'estimated' : ''}">${escape(method)}</span><p>${price ? `${escape(price.source || 'Skinport')} · aktualizacja ${escape(date(price.updatedAt))}${Number.isFinite(price.quantity) ? ` · ${price.quantity.toLocaleString('pl-PL')} ofert` : ''}` : 'Wybrany stan lub edycja nie ma dostępnej ceny.'}<br><span>${price?.estimated ? 'Brak bezpośredniego notowania. Wartość jest szacunkiem katalogowym.' : 'Notowanie dotyczy dokładnej fazy, edycji i stanu zużycia.'}</span></p><a href="${escape(sourceUrl)}" target="_blank" rel="noopener noreferrer">Źródło ${icon('arrow')}</a></div>
      <section class="inspector-pattern-section"><div class="section-head"><div><h3>Wzór i seed</h3><p>${escape(info?.label || (factualPattern ? familyLabel(info?.family || family(skin)) : 'Indywidualny identyfikator wzoru'))}</p></div><span class="inspector-seed">SEED <b>${skin.noWear ? 'nie dotyczy' : Number.isInteger(seed) ? seed : owned ? 'nieznany' : '—'}</b></span></div>${metrics.length ? `<div class="pattern-metrics">${metrics.map(([label, value]) => `<div><span>${label}</span><b>${percentage(value)}</b><i style="--coverage:${Math.max(0, Math.min(100, value))}%"></i></div>`).join('')}</div>` : ''}${info?.patternTier ? `<p class="inspector-pattern-tier">Klasyfikacja źródła: <strong>${escape(info.patternTier)}</strong></p>` : ''}<p class="inspector-pattern-copy">${owned && !skin.noWear && !Number.isInteger(seed) ? 'Ten przedmiot pochodzi ze starszego zapisu i nie miał zapisanego seeda. Nie przypisujemy mu losowego wzoru po aktualizacji. ' : ''}${metrics.length ? 'Wskaźniki wzoru pochodzą z danych społeczności dla konkretnego modelu i seeda. Pokrycie koloru dotyczy strony widocznej podczas gry i jest przybliżone. ' : 'Grafika przedstawia wykończenie katalogowe. Dokładny wygląd wzoru na modelu broni nie jest tu odwzorowywany. '}Cena bazowa nie zawiera dopłaty za seed ani deklaracji „Blue Gem”.</p>${info?.sourceUrl && /^https:\/\//.test(info.sourceUrl) ? `<a class="inspector-pattern-link" href="${escape(info.sourceUrl)}" target="_blank" rel="noopener noreferrer">Dane o wzorze ${icon('arrow')}</a>` : ''}${!owned && !skin.noWear ? `<div class="inspector-seed-preview"><label for="inspect-seed">Sprawdź dane dla seeda</label><input id="inspect-seed" type="number" min="0" max="1000" step="1" value="${Number.isInteger(seed) ? seed : 661}" aria-label="Seed do podglądu">${ctx.button('Sprawdź', 'inspect-seed', `data-skin="${escape(skin.id)}" data-wear="${escape(wear)}" data-edition="${escape(edition)}"`, 'small outline')}<p>Podgląd katalogu — nie zmienia przedmiotów w ekwipunku.</p></div>` : ''}</section>
      <section class="inspector-wear-section"><h3>Ceny według zużycia <small>${escape(EDITIONS[edition] || '')}</small></h3><div class="inspector-wear-grid">${wearList().map(entry => { const wearPrice = quote(ctx, skin, entry.code, edition); return wearPrice ? `<div class="inspector-wear-price ${entry.code === wear ? 'active' : ''}"><span>${entry.code}</span><b>${money(wearPrice.value)}</b><em>${priceLabel(wearPrice)}</em></div>` : ''; }).join('')}</div></section>
      ${phaseSiblings.length > 1 ? `<section class="inspector-phase-section"><h3>Porównanie faz <small>${escape(wear)} · ${escape(EDITIONS[edition] || '')}</small></h3><div class="inspector-phase-grid">${phaseSiblings.map(sibling => { const phasePrice = quote(ctx, sibling, wear, edition); return `<button class="inspector-phase ${sibling.id === skin.id ? 'active' : ''}" data-action="inspect-phase" data-skin="${escape(sibling.id)}" data-wear="${escape(wear)}" data-edition="${escape(edition)}" aria-pressed="${sibling.id === skin.id}">${image(skinImage(sibling), '')}<span>${escape(sibling.phase)}</span><strong>${phasePrice ? money(phasePrice.value) : 'Brak notowania'}</strong><em>${phasePrice ? priceLabel(phasePrice) : '—'}</em></button>`; }).join('')}</div></section>` : ''}
      <div class="inspector-bottom"><span>${skin.paintIndex != null ? 'Paint index ' + escape(skin.paintIndex) : skin.styleId != null ? 'Paint index ' + escape(skin.styleId) : 'Wykończenie katalogowe'}${skin.phase ? ' · ' + escape(skin.phase) : ''}</span><a class="button secondary small" href="#skins" data-action="close-inspect">Wróć do atlasu ${icon('arrow')}</a></div></div>`;
  }
  return { atlas, inspect, patternTags };
})();

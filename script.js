/* SKINLAB UI: views, event routing, Web Animations roller and Web Audio sound. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const app = $('#app');
  if (!window.CaseGame) {
    app.innerHTML = '<p class="load-error">Nie udało się wczytać gry. Upewnij się, że plik game.js znajduje się obok index.html.</p>';
    return;
  }
  const { CASES, RARITIES, DAILY_REWARD, SALE_FEE } = window.CaseGame;
  const feePercent = Math.round(SALE_FEE * 100);
  const totalSkins = new Set(CASES.flatMap(box => box.skins.map(skin => `${skin.weapon}|${skin.name}`))).size;
  const game = window.CaseGame.createGame();
  const assets = window.CaseAssets || { cases: {}, skins: {}, hero: {} };
  const modal = $('#modal');
  const content = $('#modal-content');
  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const money = cents => currency.format(cents / 100);
  const pct = value => value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  const plural = (count, one, few, many) => count === 1 ? one : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? few : many;
  const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const caseById = id => CASES.find(box => box.id === id);
  const sale = value => game.saleValue(value);
  let state = game.getState();
  let route = location.hash.slice(1) || 'cases';
  let spinning = false;
  let selectedFilter = 'all';
  let catalogQuery = '', catalogSort = 'level', catalogPage = 1;
  let shopQuery = '', shopUnlocked = true;
  let careerTab = 'missions', careerChapter = null, careerCollection = null;
  let scrollToCatalogOnRoute = false;
  let lastHash = location.hash || '#cases';
  let toastTimer;
  let audioContext;
  let previousFocus;
  let spinAnimation;
  let sessionEarnings = 0;
  let sessionWorks = 0;
  let resultItem = null;
  let openingReward = null;
  const inventoryFilter = { query: '', rarity: 'all', sort: 'newest', page: 1, favorites: false };
  const fallback = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="250" height="150" viewBox="0 0 250 150"><path d="M28 73h166v15H89l-9 25H63l9-27H28zm78-14h27v15h-27zm80 6h39v8h-39zM40 80l-25 14V70h25z" fill="#737e96"/><path d="M99 87h18l8 20h-16z" fill="#4e5870"/></svg>');
  const skinImage = item => assets.skins[`${item.weapon} | ${item.name}`] || fallback;
  const image = (path, alt, cls = '', eager = false) => `<img src="${escape(path || fallback)}" alt="${escape(alt)}" ${cls ? `class="${cls}"` : ''} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} draggable="false">`;
  const caseImage = (id, cls = '', eager = false) => image(assets.cases[id], `Skrzynka ${caseById(id)?.name || ''}`, cls, eager);
  const rarityDots = () => `<span class="rarity-dots" aria-label="Pięć poziomów rzadkości">${Object.values(RARITIES).map(rarity => `<i style="--r:${rarity.color}"></i>`).join('')}</span>`;
  const button = (text, action, extra = '', cls = '') => `<button class="button ${cls}" data-action="${action}" ${extra}>${text}</button>`;

  function toast(message, error = false) {
    clearTimeout(toastTimer);
    $('#toast-region').innerHTML = `<div class="toast ${error ? 'error' : ''}">${icon(error ? 'info' : 'check')}<span>${escape(message)}</span></div>`;
    toastTimer = setTimeout(() => { $('#toast-region').innerHTML = ''; }, 3400);
  }

  function sound(kind = 'tap', rarity = 'milspec') {
    if (!state.settings.sound) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!audioContext) audioContext = new Audio();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      const start = audioContext.currentTime;
      const notes = kind === 'win' ? (rarity === 'rare' ? [440, 554.37, 659.25, 880, 1108] : [392, 493.88, 587.33]) : kind === 'work' ? [480, 620] : kind === 'buy' ? [420, 590] : [210];
      notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = kind === 'tick' ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(frequency, start + index * .085);
        gain.gain.setValueAtTime(0, start + index * .085);
        gain.gain.linearRampToValueAtTime(kind === 'tick' ? .035 : .07, start + index * .085 + .007);
        gain.gain.exponentialRampToValueAtTime(.001, start + index * .085 + (kind === 'win' ? .45 : .08));
        oscillator.connect(gain); gain.connect(audioContext.destination);
        oscillator.start(start + index * .085);
        oscillator.stop(start + index * .085 + .5);
      });
    } catch { /* Audio can be unavailable in a privacy-restricted browser. */ }
  }

  function paintHeader() {
    $('#balance').textContent = money(state.balance);
    $('#inventory-count').textContent = state.inventory.length;
    $('#inventory-count').hidden = state.inventory.length === 0;
    const progression = game.getProgress();
    $('#player-level').textContent = progression.level;
    $('.level-avatar').title = `Poziom ${progression.level} · ${progression.rank}`;
    const readyRewards = game.getCampaign().filter(m => m.available && m.completed && !m.claimed).length + game.getCollections().filter(c => c.complete && !c.claimed).length;
    $('#career-count').textContent = readyRewards;
    $('#career-count').hidden = readyRewards === 0;
    const soundButton = $('#sound-toggle');
    soundButton.innerHTML = icon(state.settings.sound ? 'sound' : 'mute');
    soundButton.setAttribute('aria-label', state.settings.sound ? 'Wyłącz dźwięk' : 'Włącz dźwięk');
    soundButton.title = state.settings.sound ? 'Dźwięk włączony' : 'Dźwięk wyłączony';
    soundButton.setAttribute('aria-pressed', String(state.settings.sound));
    document.querySelectorAll('[data-nav]').forEach(link => {
      const active = link.dataset.nav === (route.startsWith('case/') ? 'cases' : route);
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
  }

  function showTicker() {
    const picks = [['dnm', 'Nightwish'], ['kilowatt', 'Fade'], ['revolution', 'Temukau'], ['kilowatt', 'Chrome Cannon'], ['dnm', 'Starlight Protector']].map(([id, name]) => caseById(id)?.skins.find(skin => skin.name === name)).filter(Boolean);
    $('#collection-ticker').innerHTML = picks.map(item => `<span class="ticker-item" style="--rarity:${RARITIES[item.rarity].color}">${image(skinImage(item), '', '', true)}<span><b>${escape(item.weapon.replace('★ ', ''))}</b><small>${escape(item.name)}</small></span></span>`).join('');
  }

  function statsBar() {
    const total = state.inventory.reduce((sum, item) => sum + item.value, 0);
    const progress = game.getProgress();
    return `<div class="stats-bar">
      <div class="stat orange"><span class="stat-icon">${icon('trophy')}</span><div><small>Twoja ranga · Poziom ${progress.level}</small><a href="#career">${escape(progress.rank)} ${icon('arrow')}</a></div></div>
      <div class="stat"><span class="stat-icon">${icon('book')}</span><div><small>Unikalne odkrycia</small><b>${progress.discoveredCount} <em>/ ${totalSkins}</em></b></div></div>
      <div class="stat"><span class="stat-icon">${icon('box')}</span><div><small>Otwarte skrzynki</small><b>${state.stats.opens.toLocaleString('pl-PL')}</b></div></div>
      <div class="stat"><span class="stat-icon">${icon('grid')}</span><div><small>Wartość ekwipunku</small><b>${money(total)}</b></div></div>
    </div>`;
  }

  function careerContext() {
    return { game, state, icon, escape, button, money, caseImage, skinCard, cases: CASES };
  }

  function caseCard(box) {
    const owned = state.cases[box.id], keys = state.keys[box.id];
    const access = game.getCaseAccess(box.id);
    const collection = game.getCollections().find(c => c.caseId === box.id);
    return `<article class="case-card ${access.unlocked ? '' : 'locked-case'}" style="--case-color:${box.accent}">
      <div class="card-topline"><span>KOLEKCJA ${box.year}</span><span class="case-badge ${access.unlocked ? 'featured' : ''}">${access.unlocked ? escape(box.tierLabel || 'ODBLOKOWANA') : `${icon('lock')} POZ. ${access.requiredLevel}`}</span></div>
      <a href="#case/${box.id}" class="case-art" aria-label="Zobacz skrzynkę ${escape(box.name)}">${caseImage(box.id)}</a>
      <h3><a href="#case/${box.id}">${escape(box.name)}</a></h3>
      <div class="case-meta">${rarityDots()}<span>${box.skins.length} wykończeń · ${escape(box.rareType)}</span></div>
      <div class="case-discoveries"><span>Album ${collection.discovered} / ${collection.total}</span><div class="progress-track"><span style="width:${collection.percent}%"></span></div></div>
      <div class="card-bottom"><span class="case-price"><small>Skrzynka + klucz</small>${money(box.price + box.keyPrice)}</span><a href="#case/${box.id}" class="card-open">${access.unlocked ? 'Wybierz' : `Poz. ${access.requiredLevel}`} ${icon(access.unlocked ? 'arrow' : 'lock')}</a></div>
      <div class="case-cost-breakdown">Skrzynka ${money(box.price)} · Klucz ${money(box.keyPrice)}</div>
      ${owned || keys ? `<div class="case-owned"><span>Skrzynki: ${owned}</span><span>Klucze: ${keys}</span></div>` : ''}
    </article>`;
  }

  function renderCases() {
    const owned = CASES.reduce((sum, box) => sum + state.cases[box.id], 0);
    const daily = game.getDailyStatus();
    app.innerHTML = `<section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy"><p class="eyebrow"><span class="dash"></span> ${CASES.length} SKRZYNKI · ${totalSkins} SKINÓW · TWOJA KARIERA</p><h1 id="hero-title">Zbuduj kolekcję.<br><span>Zostań Kuratorem.</span></h1><p class="hero-description">Kultowe skiny to dopiero początek. Wypełniaj album,<br>realizuj misje i odblokuj kolejne kolekcje.</p><div class="hero-actions">${button(`${icon('box')} Wybierz skrzynkę ${icon('arrow')}`, 'scroll-catalog')}<a class="hero-career-link" href="#career">Poznaj swój cel ${icon('up')}</a></div></div>
      <div class="hero-visual" aria-hidden="true"><span class="hero-outline">RARE</span>${image(assets.hero.nightwish || skinImage(CASES[0].skins[15]), '', 'hero-weapon', true)}${caseImage('dnm', 'hero-case', true)}${image(assets.hero.kukri, '', 'hero-knife', true)}<span class="hero-rarity">${icon('star')}<span><b>0,26%</b><small>JEDEN DROP. WIELKIE EMOCJE.</small></span></span><span class="hero-tag"><small>COVERT COLLECTION</small><b>AK-47 · Nightwish</b></span><span class="cross one">+</span><span class="cross two">+</span></div>
    </section>
    ${statsBar()}
    ${window.CareerView.teaser(careerContext())}
    <section id="catalog" aria-labelledby="cases-title"><div class="section-head"><div><p class="eyebrow">KAŻDA KOLEKCJA TO NOWY ROZDZIAŁ</p><h2 id="cases-title">Wybierz swoją skrzynkę<small>${CASES.length} kolekcje</small></h2></div><button class="text-button" data-action="odds">${icon('info')} Szanse wylotu</button></div>
    <div class="catalog-toolbar"><div class="segmented" aria-label="Filtr skrzynek">${[['all', 'Wszystkie'], ['unlocked', `Odblokowane (${game.getProgress().unlockedCases})`], ['owned', `Moje (${owned})`]].map(([id, label]) => `<button class="${selectedFilter === id ? 'active' : ''}" data-action="case-filter" data-filter="${id}" aria-pressed="${selectedFilter === id}">${label}</button>`).join('')}</div><label class="search-field">${icon('search')}<input id="case-search" type="search" aria-label="Szukaj skrzynki" placeholder="Znajdź kolekcję…" value="${escape(catalogQuery)}"></label><select id="case-sort" class="filter-select" aria-label="Sortuj skrzynki"><option value="level" ${catalogSort === 'level' ? 'selected' : ''}>Według poziomu</option><option value="price" ${catalogSort === 'price' ? 'selected' : ''}>Najtańsze otwarcie</option><option value="price_desc" ${catalogSort === 'price_desc' ? 'selected' : ''}>Najdroższe otwarcie</option><option value="name" ${catalogSort === 'name' ? 'selected' : ''}>Nazwa A–Z</option></select></div><p id="catalog-count" class="filter-results"></p><div id="catalog-grid" class="case-grid"></div><div id="catalog-pagination"></div></section>
    <div class="promo-row"><article class="promo"><span class="promo-icon">${icon('gift')}</span><div><h3>Dobry dzień zaczyna się od bonusu.</h3><p>Wracaj codziennie i odbieraj ${money(DAILY_REWARD)} na kolejne otwarcia.</p></div>${button(daily.available ? `Odbierz bonus ${icon('arrow')}` : `Odebrano ${icon('check')}`, 'daily', daily.available ? '' : 'disabled', 'small outline')}</article><article class="promo alt"><span class="promo-icon">${icon('bolt')}</span><div><h3>Więcej kliknięć. Więcej skrzynek.</h3><p>Zarabiaj w grze i rozkręcaj swoją kolekcję.</p></div><a class="button small outline" href="#earn">Zarabiaj ${icon('up')}</a></article></div>
    <div class="trust-row"><span>${icon('shield')} Bez prawdziwych pieniędzy</span><span>${icon('check')} Automatyczny zapis postępu</span><span>${icon('info')} Przejrzyste szanse losowania</span></div>`;
    renderCatalogGrid();
  }

  function renderCatalogGrid() {
    const grid = $('#catalog-grid');
    if (!grid) return;
    const boxes = CASES.filter(box => (selectedFilter === 'all' || selectedFilter === 'owned' && state.cases[box.id] > 0 || selectedFilter === 'unlocked' && game.getCaseAccess(box.id).unlocked) && box.name.toLowerCase().includes(catalogQuery.trim().toLowerCase()));
    boxes.sort(catalogSort === 'price' ? (a, b) => a.price - b.price : catalogSort === 'price_desc' ? (a, b) => b.price - a.price : catalogSort === 'name' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => a.requiredLevel - b.requiredLevel || a.price - b.price);
    const pages = Math.max(1, Math.ceil(boxes.length / 12));
    catalogPage = Math.min(pages, Math.max(1, catalogPage));
    $('#catalog-count').textContent = `${boxes.length} ${plural(boxes.length, 'kolekcja', 'kolekcje', 'kolekcji')} · Nowe skrzynki odblokujesz, zdobywając XP za odkrycia i misje.`;
    grid.innerHTML = boxes.length ? boxes.slice((catalogPage - 1) * 12, catalogPage * 12).map(box => caseCard(box)).join('') : `<div class="empty-state">${icon('search')}<h2>Brak pasujących skrzynek</h2><p>Sprawdź inną nazwę lub wybierz wszystkie kolekcje.</p>${button('Pokaż wszystkie', 'clear-catalog', '', 'secondary')}</div>`;
    $('#catalog-pagination').innerHTML = pages > 1 ? `<div class="inventory-pagination">${button(`${icon('back')} Poprzednia`, 'catalog-page', `data-page="${catalogPage - 1}" ${catalogPage === 1 ? 'disabled' : ''}`, 'small outline')}<span>Strona ${catalogPage} z ${pages}</span>${button(`Następna ${icon('arrow')}`, 'catalog-page', `data-page="${catalogPage + 1}" ${catalogPage === pages ? 'disabled' : ''}`, 'small outline')}</div>` : '';
  }

  function legend() {
    return `<div class="rarity-legend">${Object.values(RARITIES).map(r => `<span><i style="--r:${r.color}"></i>${r.label} <b>${pct(r.chance)}</b></span>`).join('')}</div>`;
  }

  function rollerCard(item, winner = false) {
    return `<div class="roller-card ${winner ? 'winner' : ''}" style="--rarity:${RARITIES[item.rarity].color}">${image(skinImage(item), '', '', true)}<small>${escape(item.weapon)}</small><b>${escape(item.name)}</b></div>`;
  }

  function skinCard(item, inventory = false) {
    const rarity = RARITIES[item.rarity];
    return `<article class="skin-card ${item.locked ? 'favorite-skin' : ''}" style="--rarity:${rarity.color}">
      ${item.stattrak ? '<span class="stattrak">StatTrak™</span>' : ''}
      ${inventory ? `<button class="favorite-button ${item.locked ? 'active' : ''}" data-action="lock-item" data-id="${escape(item.id)}" aria-label="${item.locked ? 'Odblokuj sprzedaż' : 'Chroń przed sprzedażą'} ${escape(item.weapon + ' ' + item.name)}" aria-pressed="${!!item.locked}">${icon('star')}</button>` : ''}
      <div class="skin-image">${image(skinImage(item), `${item.weapon} | ${item.name}`)}</div>
      <span class="weapon">${escape(item.weapon)}</span><h3 title="${escape(item.name)}">${escape(item.name)}</h3>
      <div class="skin-rarity">${rarity.label}</div><div class="skin-bottom"><span class="skin-price">${money(item.value ?? item.baseValue)}</span>${inventory ? `<span class="wear" title="${escape(item.wear)}">${escape(item.wearCode)}</span>` : '<span class="wear">MW*</span>'}</div>
      ${inventory ? `<p class="float">Float: ${item.float.toFixed(6)}</p><button class="sell-button" data-action="sell" data-id="${escape(item.id)}" ${item.locked ? 'disabled' : ''} aria-label="Sprzedaj ${escape(item.weapon + ' ' + item.name)} za ${money(sale(item.value))}">${item.locked ? `${icon('lock')} Przedmiot chroniony` : `Sprzedaj za ${money(sale(item.value))}`}</button>` : ''}
    </article>`;
  }

  function renderOpener(id) {
    const box = caseById(id);
    if (!box) { navigate('cases'); return; }
    const access = game.getCaseAccess(id);
    const ready = access.unlocked && state.cases[id] > 0 && state.keys[id] > 0;
    const preview = Array.from({ length: 11 }, () => game.previewItem(id));
    app.innerHTML = `<a href="#cases" class="back-link">${icon('back')} Wszystkie skrzynki</a><div class="detail-heading">${caseImage(id, '', true)}<div><p class="eyebrow">KOLEKCJA ${box.year} · ${box.skins.length} PRZEDMIOTÓW · POZ. ${box.requiredLevel}</p><h1>${escape(box.name)}</h1><p class="section-subtitle">${escape(box.subtitle)}</p></div><button class="button outline small" data-action="odds">${icon('info')} Szanse wylotu</button></div>
    ${access.unlocked ? `<div class="opener-summary"><span>Łączny koszt otwarcia <strong>${money(box.price + box.keyPrice)}</strong></span><span>${icon('book')} Nowy skin = trwałe odkrycie + dodatkowe XP</span></div>` : `<div class="info-banner locked-banner">${icon('lock')}<span>Ta kolekcja wymaga poziomu <strong>${access.requiredLevel}</strong>. Twój poziom: ${access.level}. Zdobądź XP za otwarcia i misje.</span><a class="button small secondary" href="#career">Przejdź do kariery ${icon('arrow')}</a></div>`}
    <section class="opener-panel" aria-label="Otwieranie skrzynki"><div class="opener-topline"><span>${icon('box')} JEDNA SKRZYNKA. JEDEN WYJĄTKOWY DROP.</span><label class="toggle"><input type="checkbox" id="fast-toggle" ${state.settings.fast ? 'checked' : ''}>Szybkie otwieranie</label></div><div id="roller" class="roller" aria-label="Taśma losowania"><div id="roller-track" class="roller-track">${preview.map(item => rollerCard(item)).join('')}</div><div class="roller-marker"></div></div><div class="opener-controls">${button(`${icon('key')} Otwórz skrzynkę ${icon('arrow')}`, 'open', `data-case="${id}" ${ready ? '' : 'disabled'}`, 'open-button')}<div id="open-status" class="open-requirement">Posiadasz: <span class="${state.cases[id] ? 'ready' : ''}">${state.cases[id]} ${plural(state.cases[id], 'skrzynkę', 'skrzynki', 'skrzynek')}</span> i <span class="${state.keys[id] ? 'ready' : ''}">${state.keys[id]} ${plural(state.keys[id], 'pasujący klucz', 'pasujące klucze', 'pasujących kluczy')}</span>${ready ? ' · Możesz otworzyć!' : '<br>Do otwarcia potrzebujesz jednej skrzynki i jednego klucza.'}</div></div></section>
    <div class="purchase-row"><article class="purchase-card">${caseImage(id)}<div><h3>Skrzynka ${escape(box.name)}</h3><p>Posiadasz: ${state.cases[id]} · 1 sztuka</p></div>${button(`Kup · ${money(box.price)}`, 'buy-case', `data-case="${id}" ${!access.unlocked || state.balance < box.price ? 'disabled' : ''}`, 'secondary')}</article><article class="purchase-card">${assets.key ? image(assets.key, 'Klucz do skrzynki') : icon('key')}<div><h3>Klucz ${escape(box.name)}</h3><p>Posiadasz: ${state.keys[id]} · Tylko do tej skrzynki</p></div>${button(`Kup · ${money(box.keyPrice)}`, 'buy-key', `data-case="${id}" ${!access.unlocked || state.balance < box.keyPrice ? 'disabled' : ''}`, 'secondary')}</article></div>
    <section aria-labelledby="contents-title"><div class="section-head"><div><h2 id="contents-title">Co kryje ta skrzynka?<small>${box.skins.length} przedmiotów</small></h2><p class="section-subtitle">${game.getCollections().find(c => c.caseId === id).discovered} wykończeń w Twoim albumie. Każde nowe zostaje na zawsze.</p></div><button class="text-button" data-action="odds">${icon('info')} Jak działa losowanie?</button></div>${legend()}<div class="content-grid">${[...box.skins].reverse().map(item => skinCard(item)).join('')}</div><p class="section-subtitle" style="margin-top:16px">* Ceny odniesienia dla Minimal Wear, a gdy niedostępne — najbliższego dostępnego stanu. Różne stany mają osobne wyceny. To zapis cen używany przez symulator, a nie bieżąca oferta sprzedaży.</p></section>`;
    centerPreview();
  }

  function centerPreview() {
    const roller = $('#roller');
    const track = $('#roller-track');
    if (!roller || !track || spinning) return;
    const card = track.firstElementChild;
    if (card) track.style.transform = `translateX(${roller.clientWidth / 2 - (card.offsetWidth + 8) * 5 - card.offsetWidth / 2}px)`;
  }

  async function openCase(id) {
    if (spinning) return;
    spinning = true;
    const result = game.openCase(id);
    if (!result.ok) { spinning = false; toast(result.error, true); render(); return; }
    resultItem = result.item;
    openingReward = { newDiscovery: result.newDiscovery, xpAwarded: result.xpAwarded };
    const roller = $('#roller');
    const track = $('#roller-track');
    const openButton = $('[data-action="open"]');
    if (!roller || !track) { spinning = false; render(); showResult(result.item); return; }
    roller.classList.remove('finished');
    openButton.disabled = true;
    openButton.innerHTML = `${icon('clock')} Trwa otwieranie…`;
    $('#fast-toggle').disabled = true;
    $('#open-status').textContent = 'Polujemy na Twój kolejny drop…';
    const winnerIndex = 8, initialIndex = 49;
    const cards = Array.from({ length: 54 }, (_, index) => index === winnerIndex ? result.item : game.previewItem(id));
    track.innerHTML = cards.map((item, index) => rollerCard(item, index === winnerIndex)).join('');
    const width = track.firstElementChild.offsetWidth;
    const stride = width + 8;
    const from = roller.clientWidth / 2 - initialIndex * stride - width / 2;
    const to = roller.clientWidth / 2 - winnerIndex * stride - width / 2;
    track.style.transform = `translateX(${from}px)`;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 180 : state.settings.fast ? 1300 : 5200;
    const startedAt = performance.now();
    let tickFrame = 0, lastCard = -1;
    sound('buy');
    const tick = () => {
      if (!spinning) return;
      const transform = getComputedStyle(track).transform;
      const offset = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41;
      const underMarker = Math.floor((roller.clientWidth / 2 - offset) / stride);
      if (underMarker !== lastCard && performance.now() - startedAt > 80) { sound('tick'); lastCard = underMarker; }
      tickFrame = requestAnimationFrame(tick);
    };
    try {
      spinAnimation = track.animate([{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }], { duration, easing: 'cubic-bezier(.14,.02,.12,1)', fill: 'forwards' });
      if (!reduced) tickFrame = requestAnimationFrame(tick);
      await spinAnimation.finished;
    } catch { track.style.transform = `translateX(${to}px)`; }
    cancelAnimationFrame(tickFrame);
    // Recenter after an orientation change that happened during the animation.
    spinAnimation?.cancel();
    const finalWidth = track.firstElementChild.offsetWidth;
    track.style.transform = `translateX(${roller.clientWidth / 2 - winnerIndex * (finalWidth + 8) - finalWidth / 2}px)`;
    roller.classList.add('finished');
    sound('win', result.item.rarity);
    $('#open-status').textContent = `${result.item.weapon} | ${result.item.name} — przedmiot dodany do ekwipunku!`;
    await new Promise(resolve => setTimeout(resolve, reduced ? 100 : 650));
    spinning = false;
    state = game.getState();
    paintHeader();
    openButton.disabled = !(state.cases[id] > 0 && state.keys[id] > 0);
    openButton.innerHTML = `${icon('key')} Otwórz kolejną skrzynkę ${icon('arrow')}`;
    $('#fast-toggle').disabled = false;
    showResult(result.item);
  }

  function renderShop() {
    app.innerHTML = `<div class="view-heading"><p class="eyebrow"><span class="dash"></span> UZUPEŁNIJ ZAPASY</p><h1>Sklep ze skrzynkami</h1><p>Skrzynkę i klucz kupujesz osobno. Droższe kolekcje odblokujesz wraz z rozwojem kariery.</p></div><div class="info-banner">${icon('info')}<span>Każda skrzynka wymaga <strong>własnego, pasującego klucza</strong>. Saldo jest wspólne — zdecyduj, którą kolekcję chcesz teraz rozwijać.</span></div><div class="shop-toolbar"><label class="search-field">${icon('search')}<input id="shop-search" type="search" aria-label="Szukaj w sklepie" placeholder="Znajdź skrzynkę…" value="${escape(shopQuery)}"></label><label class="toggle"><input id="shop-unlocked" type="checkbox" ${shopUnlocked ? 'checked' : ''}>Tylko odblokowane</label><a class="button small outline" href="#career">${icon('trophy')} Poziom ${game.getProgress().level}</a></div><p class="filter-results" id="shop-count"></p><div class="shop-grid" id="shop-grid"></div><div class="trust-row"><span>${icon('wallet')} Wirtualne środki</span><span>${icon('check')} Zakupy zapisują się automatycznie</span><a href="#earn">Brakuje środków? Zarabiaj w grze ${icon('arrow')}</a></div>`;
    renderShopGrid();
  }

  function renderShopGrid() {
    const grid = $('#shop-grid');
    if (!grid) return;
    const boxes = CASES.filter(box => (!shopUnlocked || game.getCaseAccess(box.id).unlocked) && box.name.toLowerCase().includes(shopQuery.trim().toLowerCase())).sort((a, b) => a.requiredLevel - b.requiredLevel || a.price - b.price);
    $('#shop-count').textContent = `${boxes.length} ${plural(boxes.length, 'kolekcja', 'kolekcje', 'kolekcji')} · ${game.getProgress().unlockedCases} / ${CASES.length} odblokowanych`;
    grid.innerHTML = boxes.length ? boxes.map(box => {
      const access = game.getCaseAccess(box.id);
      return `<article class="shop-card ${access.unlocked ? '' : 'locked-shop'}"><div class="shop-case-head">${caseImage(box.id)}<div><span class="micro-label">POZ. ${box.requiredLevel} · ${escape(box.tierLabel || 'KOLEKCJA')}</span><h2>${escape(box.name)}</h2><p>${box.skins.length} skinów · ${escape(box.rareType)}</p><div class="shop-owned"><span>Skrzynki: ${state.cases[box.id]}</span><span>Klucze: ${state.keys[box.id]}</span></div></div></div>${!access.unlocked ? `<div class="shop-lock-message">${icon('lock')} Wymaga poziomu ${access.requiredLevel}. <a href="#career">Rozwijaj karierę ${icon('up')}</a></div>` : ''}${['case', 'key'].map(type => `<div class="shop-purchase">${icon(type === 'case' ? 'box' : 'key')}<div class="product-info"><h3>${type === 'case' ? 'Skrzynka' : 'Pasujący klucz'}</h3><p>${money(type === 'case' ? box.price : box.keyPrice)} / szt.</p></div><select class="quantity" id="qty-${type}-${box.id}" aria-label="Liczba ${type === 'case' ? 'skrzynek' : 'kluczy'} ${escape(box.name)}" ${!access.unlocked ? 'disabled' : ''}>${[1, 5, 10].map(qty => `<option value="${qty}">${qty}×</option>`).join('')}</select>${button('Kup', `buy-${type}`, `data-case="${box.id}" data-quantity="qty-${type}-${box.id}" ${!access.unlocked || state.balance < (type === 'case' ? box.price : box.keyPrice) ? 'disabled' : ''}`, `small ${type === 'case' ? '' : 'secondary'}`)}</div>`).join('')}<div class="shop-total"><span>Łączny koszt otwarcia</span><b>${money(box.price + box.keyPrice)}</b></div><a class="text-button" href="#case/${box.id}">Zobacz zawartość ${icon('arrow')}</a></article>`;
    }).join('') : `<div class="empty-state">${icon('search')}<h2>Nie znaleziono skrzynek</h2><p>Zmień nazwę lub pokaż również zablokowane kolekcje.</p></div>`;
  }

  function filteredInventory() {
    const q = inventoryFilter.query.trim().toLowerCase();
    const items = state.inventory.filter(item => (!inventoryFilter.favorites || item.locked) && (inventoryFilter.rarity === 'all' || item.rarity === inventoryFilter.rarity) && (!q || `${item.weapon} ${item.name} ${item.wear} ${item.stattrak ? 'stattrak' : ''}`.toLowerCase().includes(q)));
    const sorts = {
      newest: (a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id),
      value_desc: (a, b) => b.value - a.value,
      value_asc: (a, b) => a.value - b.value,
      rarity: (a, b) => RARITIES[b.rarity].rank - RARITIES[a.rarity].rank || b.value - a.value,
      name: (a, b) => `${a.weapon} ${a.name}`.localeCompare(`${b.weapon} ${b.name}`, 'pl')
    };
    return items.sort(sorts[inventoryFilter.sort] || sorts.newest);
  }

  function renderInventory() {
    const total = state.inventory.reduce((sum, item) => sum + item.value, 0);
    const net = state.inventory.filter(item => !item.locked).reduce((sum, item) => sum + sale(item.value), 0);
    app.innerHTML = `<div class="view-heading"><p class="eyebrow"><span class="dash"></span> TWOJE DROPSY. TWOJE ZASADY.</p><h1>Twój ekwipunek</h1><p>Chroń ulubione skiny gwiazdką. Sprzedane przedmioty nadal liczą się do Twojego albumu odkryć.</p></div><div class="inventory-stats"><div class="inventory-stat"><small>Przedmioty w kolekcji</small><b>${state.inventory.length}</b></div><div class="inventory-stat"><small>Wartość kolekcji</small><b>${money(total)}</b></div><div class="inventory-stat"><small>Dostępne do sprzedaży · prowizja ${feePercent}%</small><b class="green-text">${money(net)}</b></div></div><div class="inventory-toolbar"><label class="search-field">${icon('search')}<input id="inventory-search" type="search" placeholder="Znajdź swój skin…" aria-label="Szukaj w ekwipunku" value="${escape(inventoryFilter.query)}"></label><select id="rarity-filter" class="filter-select" aria-label="Filtruj według rzadkości"><option value="all">Wszystkie rzadkości</option>${Object.values(RARITIES).map(r => `<option value="${r.id}" ${inventoryFilter.rarity === r.id ? 'selected' : ''}>${r.label}</option>`).join('')}</select><select id="inventory-sort" class="filter-select" aria-label="Sortuj ekwipunek">${[['newest', 'Najnowsze'], ['value_desc', 'Najdroższe'], ['value_asc', 'Najtańsze'], ['rarity', 'Najrzadsze'], ['name', 'Nazwa A–Z']].map(([value, label]) => `<option value="${value}" ${inventoryFilter.sort === value ? 'selected' : ''}>${label}</option>`).join('')}</select><button class="button small outline ${inventoryFilter.favorites ? 'selected' : ''}" data-action="favorites-filter" aria-pressed="${inventoryFilter.favorites}" aria-label="Pokaż tylko chronione przedmioty">${icon('star')}</button>${button('Sprzedaj wyniki', 'sell-filtered', 'id="sell-filtered"', 'small outline')}</div><p class="filter-results" id="inventory-results"></p><div class="content-grid inventory-grid" id="inventory-grid"></div><div id="inventory-pagination"></div>`;
    renderInventoryGrid();
  }

  function renderInventoryGrid() {
    const grid = $('#inventory-grid');
    if (!grid) return;
    const items = filteredInventory();
    const sellable = items.filter(item => !item.locked);
    const perPage = 20, pages = Math.max(1, Math.ceil(items.length / perPage));
    inventoryFilter.page = Math.min(pages, Math.max(1, inventoryFilter.page));
    const start = (inventoryFilter.page - 1) * perPage;
    $('#inventory-results').textContent = items.length ? `${items.length} ${plural(items.length, 'przedmiot', 'przedmioty', 'przedmiotów')} · Sprzedaż ${sellable.length} niechronionych: ${money(sellable.reduce((sum, item) => sum + sale(item.value), 0))}` : '';
    $('#sell-filtered').disabled = sellable.length === 0;
    grid.innerHTML = items.length ? items.slice(start, start + perPage).map(item => skinCard(item, true)).join('') : `<div class="empty-state">${icon('grid')}<h2>${state.inventory.length ? 'Nie znaleziono skinów' : 'Tutaj zacznie się Twoja kolekcja'}</h2><p>${state.inventory.length ? 'Zmień nazwę lub filtr rzadkości, aby zobaczyć pozostałe przedmioty.' : 'Otwórz pierwszą skrzynkę. Twój nowy skin trafi prosto do ekwipunku.'}</p>${state.inventory.length ? button('Wyczyść filtry', 'clear-filters', '', 'secondary') : '<a class="button" href="#cases">Wybierz skrzynkę ' + icon('arrow') + '</a>'}</div>`;
    $('#inventory-pagination').innerHTML = pages > 1 ? `<div class="inventory-pagination">${button(`${icon('back')} Poprzednia`, 'inventory-page', `data-page="${inventoryFilter.page - 1}" ${inventoryFilter.page === 1 ? 'disabled' : ''}`, 'small outline')}<span>Strona ${inventoryFilter.page} z ${pages}</span>${button(`Następna ${icon('arrow')}`, 'inventory-page', `data-page="${inventoryFilter.page + 1}" ${inventoryFilter.page === pages ? 'disabled' : ''}`, 'small outline')}</div>` : '';
  }

  function renderEarn() {
    const daily = game.getDailyStatus();
    const work = game.getWorkStatus();
    app.innerHTML = `<div class="view-heading"><p class="eyebrow"><span class="dash"></span> TWOJA NASTĘPNA SKRZYNKA JEST BLISKO</p><h1>Rozkręć swój budżet</h1><p>Zarabiaj wirtualne dolary. Bez wpłat, bez ryzyka — sama przyjemność zbierania.</p></div><div class="earn-layout"><section class="work-panel" id="work-panel"><span class="panel-eyebrow">MAŁA PRACA, WIELKI POTENCJAŁ</span><h2>Każde kliknięcie się liczy.</h2><p>Od $0.10 do $0.18 za pracę. Seria pomaga oszczędzić na kolejną skrzynkę.</p><button class="work-button" data-action="work" aria-label="Pracuj i zarabiaj wirtualne dolary">${icon('bolt')}<strong>PRACUJ</strong><span id="work-button-reward">+${money(work.reward)} / klik</span></button><div class="work-bottom"><div><small>Za następne kliknięcie</small><b id="work-reward">${money(work.reward)}</b></div><div><small>Twoja seria</small><b id="work-combo">${work.combo}×</b></div></div><p class="keyboard-hint" style="margin-top:15px;margin-bottom:0">Wskazówka: użyj <kbd>Spacji</kbd>, gdy przycisk ma fokus. Odstęp 1 s. Praca daje środki, a XP zdobywasz w skrzynkach i misjach.</p></section><div class="earn-side"><section class="daily-panel">${icon('gift', 'daily-icon')}<h2>Codzienna dostawa</h2><p>Mały prezent na dobry start. Bonus wraca każdego dnia o północy.</p><div class="daily-amount">${money(daily.reward)}</div>${button(daily.available ? `Odbierz swój bonus ${icon('arrow')}` : `${icon('check')} Dzisiejszy bonus odebrany`, 'daily', daily.available ? '' : 'disabled', daily.available ? '' : 'secondary')}<p id="daily-countdown" class="section-subtitle" style="margin-top:12px;margin-bottom:0">${daily.available ? 'Gotowy do odebrania. Miłej zabawy!' : 'Kolejny bonus jutro.'}</p></section><section class="hint-panel"><h3>${icon('shield')} Zbieraj w swoim tempie</h3><p>To gra dla przyjemności. Każde otwarcie ma te same szanse, niezależnie od długości serii i poprzednich wyników. Cały postęp zapisuje się automatycznie.</p></section></div></div><section class="earn-session"><h3>Małe kroki, rosnąca kolekcja</h3><div><div class="mini-stat"><small>Zarobione w tej sesji</small><b>${money(sessionEarnings)}</b></div><div class="mini-stat"><small>Prace w tej sesji</small><b>${sessionWorks}</b></div><div class="mini-stat"><small>Łącznie zarobione</small><b>${money(state.stats.earned)}</b></div></div></section>`;
    updateTimers();
  }

  function updateTimers() {
    if (route !== 'earn') return;
    const work = game.getWorkStatus();
    if ($('#work-reward')) $('#work-reward').textContent = money(work.reward);
    if ($('#work-button-reward')) $('#work-button-reward').textContent = work.ready ? `+${money(work.reward)} / klik` : 'Ładuję energię…';
    if ($('#work-combo')) $('#work-combo').textContent = `${work.combo}×`;
    const daily = game.getDailyStatus();
    if (!daily.available && $('#daily-countdown')) {
      const remaining = Math.max(0, Math.ceil((daily.nextAt - Date.now()) / 1000));
      const hours = String(Math.floor(remaining / 3600)).padStart(2, '0');
      const minutes = String(Math.floor(remaining % 3600 / 60)).padStart(2, '0');
      const seconds = String(remaining % 60).padStart(2, '0');
      $('#daily-countdown').textContent = `Kolejny bonus za ${hours}:${minutes}:${seconds}`;
    } else if (daily.available) {
      const dailyButton = $('[data-action="daily"]', app);
      if (dailyButton?.disabled) renderEarn();
    }
  }

  function showModal(html) {
    if (!modal.open) previousFocus = document.activeElement;
    content.innerHTML = html;
    if (!modal.open) modal.showModal();
    const first = $('button', content);
    first?.focus();
  }

  function closeModal() { if (modal.open) modal.close(); }
  const modalTop = title => `<div class="modal-top"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="Zamknij okno">${icon('close')}</button></div>`;

  function showOdds() {
    showModal(`<div class="modal-body">${modalTop('Poznaj swoje szanse')}<p class="modal-copy">Każde otwarcie jest niezależne. Najpierw losowana jest rzadkość, a następnie jeden z przedmiotów tego poziomu w danej skrzynce.</p><div class="chance-list">${Object.values(RARITIES).map(r => `<div><div class="chance-row-head"><span><i style="--r:${r.color}"></i>${r.label}</span><b>${pct(r.chance)}</b></div><div class="chance-progress"><b style="--r:${r.color};width:${r.chance}%"></b></div></div>`).join('')}</div><p class="modal-copy">Stan zużycia i float są losowane osobno w dostępnym zakresie skina. Broń i noże mają dodatkowo 10% szans na StatTrak™. Prezentowane wartości są cenami symulatora.</p>${button('Wszystko jasne', 'close-modal', '', 'wide secondary')}</div>`);
  }

  function showResult(item) {
    const r = RARITIES[item.rarity];
    showModal(`<div class="result-modal" style="--rarity:${r.color}"><button class="icon-button modal-close" data-action="close-modal" aria-label="Zamknij wynik">${icon('close')}</button><p class="eyebrow">${icon(item.rarity === 'rare' ? 'star' : 'check')} ${item.rarity === 'rare' ? 'WYJĄTKOWO RZADKI DROP!' : item.rarity === 'covert' ? 'ŚWIETNE TRAFIENIE!' : 'NOWY SKIN W KOLEKCJI'}</p><h2 id="modal-title">${item.rarity === 'rare' ? 'Ten moment jest Twój.' : 'Oto Twój drop.'}</h2><div class="result-art">${image(skinImage(item), `${item.weapon} | ${item.name}`, '', true)}</div><p class="result-weapon">${item.stattrak ? 'StatTrak™ ' : ''}${escape(item.weapon)}</p><h3 class="result-name">${escape(item.name)}</h3><div class="result-tags"><span class="rarity-tag">${r.label}</span><span>${escape(item.wear)}</span><span>Float ${item.float.toFixed(6)}</span></div><div class="result-progression">${icon(openingReward?.newDiscovery ? 'book' : 'trophy')}<span><b>${openingReward?.newDiscovery ? 'Nowe odkrycie w albumie' : 'Kolejny krok w karierze'}</b><small>${openingReward?.newDiscovery ? 'Odkrycie zostaje także po sprzedaży.' : 'Ten skin jest już w Twoim albumie.'}</small></span><strong>+${openingReward?.xpAwarded || 25} XP</strong></div><div class="result-value">${money(item.value)}</div><p class="result-fee">Cena w symulatorze · Sprzedaż po prowizji ${feePercent}%: ${money(sale(item.value))}</p><div class="modal-buttons">${button(`${icon('grid')} Zachowaj`, 'keep-result', '', 'secondary')}${button(`Sprzedaj · ${money(sale(item.value))}`, 'sell-result', `data-id="${escape(item.id)}"`, 'green')}</div><p class="result-saved">${icon('check')} Przedmiot zapisany · Poziom ${game.getProgress().level}</p></div>`);
  }

  function showStats() {
    const best = state.stats.bestDrop;
    showModal(`<div class="modal-body">${modalTop('Twoja droga w SKINLAB')}<p class="modal-copy">Każde otwarcie to nowa historia. Oto Twoje dotychczasowe wyniki.</p><div class="stat-table"><div><small>Otwarte skrzynki</small><strong>${state.stats.opens}</strong></div><div><small>Sprzedane przedmioty</small><strong>${state.stats.sold}</strong></div><div><small>Wydano w sklepie</small><strong>${money(state.stats.spent)}</strong></div><div><small>Zarobiono w grze</small><strong>${money(state.stats.earned)}</strong></div></div><hr class="modal-divider"><p class="modal-copy">Najlepszy drop: <strong>${best ? `${escape(best.weapon)} | ${escape(best.name)} · ${money(best.value)}` : 'Czeka na Twoje pierwsze otwarcie.'}</strong></p>${button('Wracam do gry', 'close-modal', '', 'wide secondary')}</div>`);
  }

  function render() {
    if (spinning) return;
    if (route.startsWith('case/')) renderOpener(route.split('/')[1]);
    else if (route === 'shop') renderShop();
    else if (route === 'inventory') renderInventory();
    else if (route === 'earn') renderEarn();
    else if (route === 'career') app.innerHTML = window.CareerView.render(careerContext(), { tab: careerTab, chapter: careerChapter, collection: careerCollection });
    else { route = 'cases'; renderCases(); }
    if (state.storageWarning) app.insertAdjacentHTML('afterbegin', `<p class="storage-warning" role="alert">${icon('info')} ${escape(state.storageWarning)}</p>`);
  }

  function navigate(next) { location.hash = next; }

  function runPurchase(type, target) {
    const id = target.dataset.case;
    const qty = target.dataset.quantity ? Number(document.getElementById(target.dataset.quantity)?.value) : 1;
    const result = type === 'case' ? game.buyCase(id, qty) : game.buyKey(id, qty);
    if (!result.ok) { toast(result.error, true); return; }
    sound('buy');
    toast(`${type === 'case' ? 'Kupiono skrzynki' : 'Kupiono klucze'}: ${qty}× ${caseById(id).name}`);
  }

  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (spinning && anchor && anchor.getAttribute('href') !== '#main') { event.preventDefault(); toast('Jeszcze chwila — Twoja skrzynka właśnie się otwiera.'); return; }
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    const action = target.dataset.action;
    if (spinning && !['close-modal', 'odds', 'about', 'stats'].includes(action)) { toast('Poczekaj na wynik otwierania.'); return; }
    switch (action) {
      case 'case-filter': selectedFilter = target.dataset.filter; catalogPage = 1; render(); $('#catalog').scrollIntoView({block:'start'}); break;
      case 'scroll-catalog': $('#catalog')?.scrollIntoView({behavior:'smooth', block:'start'}); break;
      case 'clear-catalog': selectedFilter = 'all'; catalogQuery = ''; catalogPage = 1; render(); $('#catalog').scrollIntoView({block:'start'}); break;
      case 'catalog-page': catalogPage = Number(target.dataset.page); renderCatalogGrid(); $('#catalog').scrollIntoView({block:'start'}); break;
      case 'career-tab': careerTab = target.dataset.tab; careerCollection = null; render(); break;
      case 'career-chapter': careerChapter = Number(target.dataset.chapter); render(); break;
      case 'album-open': careerCollection = target.dataset.case; render(); $('.career-tabs').scrollIntoView({block:'start'}); break;
      case 'album-back': careerCollection = null; render(); $('.career-tabs').scrollIntoView({block:'start'}); break;
      case 'claim-mission':
      case 'claim-collection': {
        const previousLevel = game.getProgress().level;
        const result = action === 'claim-mission' ? game.claimMission(target.dataset.id) : game.claimCollection(target.dataset.case);
        if (!result.ok) { toast(result.error, true); break; }
        const level = game.getProgress().level;
        sound('win');
        if (action === 'claim-mission') careerChapter = null;
        render();
        toast(`${result.ultimate ? 'Operacja ukończona! Zostałeś Kuratorem. ' : ''}+${money(result.cash)} i ${result.xp} XP${level > previousLevel ? ` · Awans na poziom ${level}!` : ''}`);
        break;
      }
      case 'mission-hint': selectedFilter = 'unlocked'; catalogQuery = ''; catalogPage = 1; scrollToCatalogOnRoute = true; navigate('cases'); break;
      case 'lock-item': {
        const item = state.inventory.find(item => item.id === target.dataset.id);
        if (!item) return;
        const locked = !item.locked;
        const result = game.setItemLocked(item.id, locked);
        if (!result.ok) toast(result.error, true);
        else toast(locked ? 'Skin chroniony. Sprzedaż zbiorcza go pominie.' : 'Ochrona wyłączona. Skin można sprzedać.');
        break;
      }
      case 'favorites-filter': inventoryFilter.favorites = !inventoryFilter.favorites; inventoryFilter.page = 1; renderInventory(); break;
      case 'buy-case': runPurchase('case', target); break;
      case 'buy-key': runPurchase('key', target); break;
      case 'open': openCase(target.dataset.case); break;
      case 'odds': showOdds(); break;
      case 'stats': showStats(); break;
      case 'close-modal': closeModal(); break;
      case 'keep-result': closeModal(); resultItem = null; render(); toast('Skin czeka w Twoim ekwipunku.'); break;
      case 'sell-result':
      case 'sell': {
        const result = game.sellItem(target.dataset.id);
        if (!result.ok) { toast(result.error, true); break; }
        if (action === 'sell-result') { closeModal(); resultItem = null; render(); }
        sound('buy'); toast(`Przedmiot sprzedany. +${money(result.total)}`); break;
      }
      case 'sell-filtered': {
        const items = filteredInventory().filter(item => !item.locked);
        if (!items.length) return;
        const ids = items.map(item => item.id);
        const net = items.reduce((sum, item) => sum + sale(item.value), 0);
        showModal(`<div class="modal-body">${modalTop('Sprzedać wybrane przedmioty?')}<p class="modal-copy">Sprzedasz niechronione przedmioty pasujące do obecnych filtrów: <strong>${items.length} szt.</strong> Otrzymasz <strong>${money(net)}</strong> po prowizji ${feePercent}%.</p><p class="modal-copy">Odkrycia zostają w albumie. Przedmioty oznaczone gwiazdką zachowasz.</p><div class="modal-buttons">${button('Zachowaj kolekcję', 'close-modal', '', 'secondary')}${button(`Sprzedaj · ${money(net)}`, 'confirm-sell', '', 'green')}</div></div>`);
        $('[data-action="confirm-sell"]', content).onclick = () => {
          const result = game.sellItems(ids);
          closeModal();
          if (result.ok) { sound('buy'); toast(`Sprzedano ${items.length} ${plural(items.length, 'przedmiot', 'przedmioty', 'przedmiotów')}. +${money(net)}`); }
          else toast(result.error, true);
        };
        break;
      }
      case 'inventory-page': inventoryFilter.page = Number(target.dataset.page); renderInventoryGrid(); break;
      case 'clear-filters': inventoryFilter.query = ''; inventoryFilter.rarity = 'all'; inventoryFilter.favorites = false; inventoryFilter.page = 1; renderInventory(); break;
      case 'daily': {
        const reward = game.getDailyStatus().reward;
        const result = game.claimDaily();
        if (result.ok) { sessionEarnings += reward; render(); sound('win'); toast(`Bonus odebrany. +${money(reward)} do portfela!`); }
        else toast(result.error, true);
        break;
      }
      case 'work': {
        const result = game.work();
        if (!result.ok) { updateTimers(); return; }
        const reward = result.reward;
        sessionEarnings += reward; sessionWorks += 1;
        renderEarn(); sound('work');
        const floating = document.createElement('span');
        floating.className = 'floating-earning'; floating.textContent = `+${money(reward)}`;
        $('#work-panel').append(floating); floating.addEventListener('animationend', () => floating.remove(), { once: true });
        $('[data-action="work"]').focus({ preventScroll: true });
        break;
      }
      case 'about': showModal(`<div class="modal-body">${modalTop('Czysta frajda z otwierania.')}<p class="modal-copy"><strong>SKINLAB</strong> to fanowski symulator skrzynek CS2. Wszystkie środki i przedmioty istnieją wyłącznie w tej grze. Wyceny stanów opierają się na zapisanej migawce cen Skinport; nie są ofertą ani bieżącym kursem rynku.</p><p class="modal-copy">Postęp jest zapisywany w tej przeglądarce. Grafiki oraz nazwy przedmiotów pochodzą z Counter-Strike 2 i należą do Valve oraz ich twórców. Projekt nie jest powiązany z Valve.</p><p class="modal-copy">Źródło lokalnych grafik: <a href="https://github.com/ByMykel/CSGO-API" target="_blank" rel="noopener noreferrer" style="color:var(--orange)">ByMykel / CSGO-API ${icon('up')}</a></p>${button('Gramy dalej', 'close-modal', '', 'wide secondary')}</div>`); break;
    }
  });

  document.addEventListener('input', event => {
    if (event.target.id === 'case-search') { catalogQuery = event.target.value; catalogPage = 1; renderCatalogGrid(); }
    if (event.target.id === 'shop-search') { shopQuery = event.target.value; renderShopGrid(); }
    if (event.target.id === 'inventory-search') {
      inventoryFilter.query = event.target.value;
      inventoryFilter.page = 1;
      renderInventoryGrid();
    }
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'case-sort') { catalogSort = event.target.value; catalogPage = 1; renderCatalogGrid(); }
    if (event.target.id === 'shop-unlocked') { shopUnlocked = event.target.checked; renderShopGrid(); }
    if (event.target.id === 'rarity-filter') { inventoryFilter.rarity = event.target.value; inventoryFilter.page = 1; renderInventoryGrid(); }
    if (event.target.id === 'inventory-sort') { inventoryFilter.sort = event.target.value; inventoryFilter.page = 1; renderInventoryGrid(); }
    if (event.target.id === 'fast-toggle') game.setSetting('fast', event.target.checked);
  });
  $('#sound-toggle').addEventListener('click', () => { game.setSetting('sound', !state.settings.sound); sound('tap'); });
  modal.addEventListener('close', () => {
    if (resultItem) { resultItem = null; render(); }
    previousFocus?.isConnected && previousFocus.focus({ preventScroll: true });
  });
  modal.addEventListener('click', event => { if (event.target === modal) { const rect = modal.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal(); } });
  window.addEventListener('hashchange', () => {
    if (location.hash === '#main') return;
    if (spinning) { history.replaceState(null, '', lastHash); return; }
    const requested = location.hash.slice(1) || 'cases';
    route = ['cases', 'shop', 'inventory', 'earn', 'career'].includes(requested) || (requested.startsWith('case/') && caseById(requested.split('/')[1])) ? requested : 'cases';
    lastHash = `#${route}`;
    paintHeader(); render();
    if (scrollToCatalogOnRoute && route === 'cases') {
      scrollToCatalogOnRoute = false;
      $('#catalog')?.scrollIntoView({block:'start', behavior:'instant'});
    } else window.scrollTo({ top: 0, behavior: 'instant' });
  });
  window.addEventListener('resize', centerPreview);
  window.addEventListener('pagehide', () => { spinAnimation?.cancel(); });
  // Sync other tabs without interrupting the visual roller or writing the save again.
  window.addEventListener('storage', event => {
    if (event.key === window.CaseGame.STORAGE_KEY || event.key === null) game.refresh();
  });
  game.subscribe(next => {
    state = next;
    paintHeader();
    if (!spinning) render();
  });
  showTicker(); paintHeader(); render();
  setInterval(updateTimers, 500);
})();



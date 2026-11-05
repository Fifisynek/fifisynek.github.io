/* SKINLAB UI: views, event routing, Web Animations roller and Web Audio sound. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const app = $('#app');
  if (!window.CaseGame) {
    app.innerHTML = '<p class="load-error">Nie udało się wczytać gry. Upewnij się, że plik game.js znajduje się obok index.html.</p>';
    return;
  }
  const { CASES, SKINS, RARITIES, DAILY_REWARD, SALE_FEE } = window.CaseGame;
  const feePercent = Math.round(SALE_FEE * 100);
  const totalSkins = SKINS.length;
  const officialCount = CASES.filter(box => !box.isCustom && !box.isTerminal).length;
  const customCount = CASES.filter(box => box.isCustom).length;
  const game = window.CaseGame.createGame();
  const assets = window.CaseAssets || { cases: {}, skins: {}, hero: {} };
  const modal = $('#modal');
  const content = $('#modal-content');
  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const money = cents => currency.format(cents / 100);
  const percent = chance => chance > 0 && chance * 100 < .000001 ? '< 0,000001%' : (chance * 100).toLocaleString('pl-PL', {minimumFractionDigits:2,maximumFractionDigits:chance < .001 ? 6 : 2}) + '%';
  const plural = (count, one, few, many) => count === 1 ? one : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? few : many;
  const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const caseById = id => CASES.find(box => box.id === id);
  const sale = value => game.saleValue(value);
  let state = game.getState();
  let route = location.hash.slice(1) || 'cases';
  let spinning = false;
  let busyKind = null;
  let selectedFilter = 'all';
  let catalogQuery = '', catalogSort = 'level', catalogPage = 1;
  let catalogOrigin = 'all', shopOrigin = 'all';
  let shopQuery = '', shopUnlocked = true;
  let careerTab = 'missions', careerChapter = null, careerCollection = null;
  let scrollToCatalogOnRoute = false;
  let lastHash = location.hash || '#cases';
  let toastTimer;
  let audioContext;
  let previousFocus;
  let spinAnimation;
  let openingCount = 1, poolPage = 1, poolRarity = 'all', poolWear = 'all', poolQuery = '';
  let lastBatch = null;
  const upgradeOptions = {ids:[],target:null,wear:'MW',query:'',rarity:'all',page:1,inputQuery:'',inputPage:1};
  let sessionEarnings = 0;
  let sessionWorks = 0;
  let resultItem = null;
  let openingReward = null;
  const inventoryFilter = { tab:'all', query: '', rarity: 'all', wear:'all', sort: 'newest', page: 1, favorites: false };
  const fallback = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="250" height="150" viewBox="0 0 250 150"><path d="M28 73h166v15H89l-9 25H63l9-27H28zm78-14h27v15h-27zm80 6h39v8h-39zM40 80l-25 14V70h25z" fill="#737e96"/><path d="M99 87h18l8 20h-16z" fill="#4e5870"/></svg>');
  const itemName = item => item.displayName || item.name;
  const skinImage = item => assets.skinIds?.[item.catalogId || item.sourceId || item.id] || item.image || assets.skins[`${item.weapon} | ${itemName(item)}`] || assets.skins[`${item.weapon} | ${item.name}`] || fallback;
  const image = (path, alt, cls = '', eager = false) => `<img src="${escape(path || fallback)}" alt="${escape(alt)}" ${cls ? `class="${cls}"` : ''} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} draggable="false">`;
  const caseImage = (id, cls = '', eager = false) => image(assets.cases[id], `Skrzynka ${caseById(id)?.name || ''}`, cls, eager);
  const rarityDots = box => `<span class="rarity-dots" aria-label="Rzadkości w puli">${Object.values(RARITIES).filter(r => box ? game.getRarityChances(box.id)[r.id] > 0 : r.weight > 0).map(rarity => `<i style="--r:${rarity.color}"></i>`).join('')}</span>`;
  const button = (text, action, extra = '', cls = '') => `<button class="button ${cls}" data-action="${action}" ${extra}>${text}</button>`;
  const originMatches = (box, origin) => origin === 'all' || origin === 'custom' && box.isCustom || origin === 'terminal' && box.isTerminal || origin === 'official' && !box.isCustom && !box.isTerminal;

  function wearMeter(item, compact = false) {
    if (item.noWear || item.wearCode === 'NW') return `<p class="no-wear-label">Bez parametru zużycia</p>`;
    return `<div class="wear-meter ${compact ? 'compact' : ''}" aria-label="Float ${item.float.toFixed(6)}, ${escape(item.wear)}"><div class="wear-meter-track"><i></i><i></i><i></i><i></i><i></i><b style="left:${Math.min(99, Math.max(1, item.float * 100))}%"></b></div>${compact ? '' : '<div class="wear-meter-labels"><span>FN</span><span>MW</span><span>FT</span><span>WW</span><span>BS</span></div>'}</div>`;
  }

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
    const resources = game.getResources();
    const inventoryCount = state.inventory.length + resources.totalCases + resources.totalKeys;
    $('#inventory-count').textContent = inventoryCount > 999 ? '999+' : inventoryCount;
    $('#inventory-count').hidden = inventoryCount === 0;
    $('#inventory-count').title = `${state.inventory.length} skinów · ${resources.totalCases} skrzynek · ${resources.totalKeys} kluczy`;
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
    return { game, state, icon, escape, button, money, caseImage, skinCard, cases: CASES, skins:SKINS, image, skinImage, itemName, percent, rarities:RARITIES, assets, feePercent, plural, sound };
  }

  function caseCard(box) {
    const owned = state.cases[box.id], keys = state.keys[box.id];
    const access = game.getCaseAccess(box.id);
    const collection = game.getCollections().find(c => c.caseId === box.id);
    return `<article class="case-card ${access.unlocked ? '' : 'locked-case'} ${box.isCustom ? 'custom-box' : ''}" style="--case-color:${box.accent}">
      <div class="card-topline"><span>${box.isCustom ? 'SKINLAB ORIGINAL' : box.isTerminal ? 'TERMINAL · SYMULACJA' : `KOLEKCJA ${box.year}`}</span><span class="case-badge ${access.unlocked ? 'featured' : ''}">${access.unlocked ? escape(box.tierLabel || 'ODBLOKOWANA') : `${icon('lock')} POZ. ${access.requiredLevel}`}</span></div>
      <a href="#case/${box.id}" class="case-art" aria-label="Zobacz skrzynkę ${escape(box.name)}">${caseImage(box.id)}</a>
      <h3><a href="#case/${box.id}">${escape(box.name)}</a></h3>
      <div class="case-meta">${rarityDots(box)}<span>${box.skins.length} wykończeń · ${escape(box.rareType)}</span></div>
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
      <div class="hero-copy"><p class="eyebrow"><span class="dash"></span> ${officialCount} SKRZYNKI CS2 · ${customCount} CUSTOM · ${totalSkins} SKINÓW</p><h1 id="hero-title">Zbuduj kolekcję.<br><span>Zostań Kuratorem.</span></h1><p class="hero-description">Pełny katalog CS2 i autorskie skrzynki SKINLAB.<br>Otwieraj seriami. Zbieraj. Ulepszaj swoje dropy.</p><div class="hero-actions">${button(`${icon('box')} Wybierz skrzynkę ${icon('arrow')}`, 'scroll-catalog')}<a class="hero-career-link" href="#upgrader">Sprawdź upgrader ${icon('up')}</a></div></div>
      <div class="hero-visual" aria-hidden="true"><span class="hero-outline">RARE</span>${image(assets.hero.nightwish || skinImage(CASES[0].skins[15]), '', 'hero-weapon', true)}${caseImage('dnm', 'hero-case', true)}${image(assets.hero.kukri, '', 'hero-knife', true)}<span class="hero-rarity">${icon('star')}<span><b>0,26%</b><small>JEDEN DROP. WIELKIE EMOCJE.</small></span></span><span class="hero-tag"><small>COVERT COLLECTION</small><b>AK-47 · Nightwish</b></span><span class="cross one">+</span><span class="cross two">+</span></div>
    </section>
    ${statsBar()}
    ${window.CareerView.teaser(careerContext())}
    <section id="catalog" aria-labelledby="cases-title"><div class="section-head"><div><p class="eyebrow">${officialCount} OFICJALNE · ${customCount} AUTORSKICH · 2 TERMINALE</p><h2 id="cases-title">Wybierz swoją skrzynkę<small>${CASES.length} kolekcji</small></h2></div><button class="text-button" data-action="odds">${icon('info')} Szanse wylotu</button></div>
    <div class="catalog-toolbar"><div class="segmented" aria-label="Filtr skrzynek">${[['all', 'Wszystkie'], ['unlocked', `Odblokowane (${game.getProgress().unlockedCases})`], ['owned', `Moje (${owned})`]].map(([id, label]) => `<button class="${selectedFilter === id ? 'active' : ''}" data-action="case-filter" data-filter="${id}" aria-pressed="${selectedFilter === id}">${label}</button>`).join('')}</div><label class="search-field">${icon('search')}<input id="case-search" type="search" aria-label="Szukaj skrzynki" placeholder="Znajdź kolekcję…" value="${escape(catalogQuery)}"></label><select id="case-origin" class="filter-select" aria-label="Rodzaj skrzynek"><option value="all" ${catalogOrigin === 'all' ? 'selected' : ''}>Wszystkie typy</option><option value="official" ${catalogOrigin === 'official' ? 'selected' : ''}>Oficjalne CS2</option><option value="custom" ${catalogOrigin === 'custom' ? 'selected' : ''}>SKINLAB Originals</option><option value="terminal" ${catalogOrigin === 'terminal' ? 'selected' : ''}>Terminale · symulacja</option></select><select id="case-sort" class="filter-select" aria-label="Sortuj skrzynki"><option value="level" ${catalogSort === 'level' ? 'selected' : ''}>Według poziomu</option><option value="price" ${catalogSort === 'price' ? 'selected' : ''}>Najtańsze otwarcie</option><option value="price_desc" ${catalogSort === 'price_desc' ? 'selected' : ''}>Najdroższe otwarcie</option><option value="name" ${catalogSort === 'name' ? 'selected' : ''}>Nazwa A–Z</option></select></div><p id="catalog-count" class="filter-results"></p><div id="catalog-grid" class="case-grid"></div><div id="catalog-pagination"></div></section>
    <div class="promo-row"><article class="promo"><span class="promo-icon">${icon('gift')}</span><div><h3>Dobry dzień zaczyna się od bonusu.</h3><p>Wracaj codziennie i odbieraj ${money(DAILY_REWARD)} na kolejne otwarcia.</p></div>${button(daily.available ? `Odbierz bonus ${icon('arrow')}` : `Odebrano ${icon('check')}`, 'daily', daily.available ? '' : 'disabled', 'small outline')}</article><article class="promo alt"><span class="promo-icon">${icon('bolt')}</span><div><h3>Więcej kliknięć. Więcej skrzynek.</h3><p>Zarabiaj w grze i rozkręcaj swoją kolekcję.</p></div><a class="button small outline" href="#earn">Zarabiaj ${icon('up')}</a></article></div>
    <div class="trust-row"><span>${icon('shield')} Bez prawdziwych pieniędzy</span><span>${icon('check')} Automatyczny zapis postępu</span><span>${icon('info')} Przejrzyste szanse losowania</span></div>`;
    renderCatalogGrid();
  }

  function renderCatalogGrid() {
    const grid = $('#catalog-grid');
    if (!grid) return;
    const boxes = CASES.filter(box => (selectedFilter === 'all' || selectedFilter === 'owned' && state.cases[box.id] > 0 || selectedFilter === 'unlocked' && game.getCaseAccess(box.id).unlocked) && originMatches(box, catalogOrigin) && box.name.toLowerCase().includes(catalogQuery.trim().toLowerCase()));
    boxes.sort(catalogSort === 'price' ? (a, b) => a.price + a.keyPrice - b.price - b.keyPrice : catalogSort === 'price_desc' ? (a, b) => b.price + b.keyPrice - a.price - a.keyPrice : catalogSort === 'name' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => a.requiredLevel - b.requiredLevel || a.price - b.price);
    const pages = Math.max(1, Math.ceil(boxes.length / 12));
    catalogPage = Math.min(pages, Math.max(1, catalogPage));
    $('#catalog-count').textContent = `${boxes.length} ${plural(boxes.length, 'kolekcja', 'kolekcje', 'kolekcji')} · Nowe skrzynki odblokujesz, zdobywając XP za odkrycia i misje.`;
    grid.innerHTML = boxes.length ? boxes.slice((catalogPage - 1) * 12, catalogPage * 12).map(box => caseCard(box)).join('') : `<div class="empty-state">${icon('search')}<h2>Brak pasujących skrzynek</h2><p>Sprawdź inną nazwę lub wybierz wszystkie kolekcje.</p>${button('Pokaż wszystkie', 'clear-catalog', '', 'secondary')}</div>`;
    $('#catalog-pagination').innerHTML = pages > 1 ? `<div class="inventory-pagination">${button(`${icon('back')} Poprzednia`, 'catalog-page', `data-page="${catalogPage - 1}" ${catalogPage === 1 ? 'disabled' : ''}`, 'small outline')}<span>Strona ${catalogPage} z ${pages}</span>${button(`Następna ${icon('arrow')}`, 'catalog-page', `data-page="${catalogPage + 1}" ${catalogPage === pages ? 'disabled' : ''}`, 'small outline')}</div>` : '';
  }

  function skinCard(item, inventory = false) {
    const rarity = RARITIES[item.rarity];
    const finish = itemName(item);
    const previewWear = item.previewWear && item.previewWear !== 'all' ? item.previewWear : null;
    const availableWears = window.CaseGame.WEARS.filter(wear => game.getSkinValue(item.skinId || item.id,wear.code) !== null).map(wear=>wear.code);
    const wearLabel = inventory ? item.wearCode : item.wearCode || previewWear || (item.noWear ? 'NW' : availableWears.length > 1 ? `${availableWears[0]}–${availableWears.at(-1)}` : availableWears[0] || '—');
    const shownPrice = item.value ?? item.previewPrice ?? item.baseValue;
    return `<article class="skin-card ${item.locked ? 'favorite-skin' : ''}" style="--rarity:${rarity.color}">
      ${item.stattrak ? '<span class="stattrak">StatTrak™</span>' : ''}
      ${item.dropChance != null ? `<span class="drop-chance">${percent(item.dropChance)}</span>` : ''}
      ${inventory ? `<button class="favorite-button ${item.locked ? 'active' : ''}" data-action="lock-item" data-id="${escape(item.id)}" aria-label="${item.locked ? 'Odblokuj sprzedaż' : 'Chroń przed sprzedażą'} ${escape(item.weapon + ' ' + item.name)}" aria-pressed="${!!item.locked}">${icon('star')}</button>` : ''}
      <div class="skin-image">${image(skinImage(item), `${item.weapon} | ${finish}`)}</div>
      <span class="weapon">${escape(item.weapon)}</span><h3 title="${escape(finish)}">${escape(finish)}</h3>
      <div class="skin-rarity">${rarity.label}</div><div class="skin-bottom"><span class="skin-price">${shownPrice ? money(shownPrice) : '—'}</span><span class="wear" title="${escape(item.wear || 'Dostępne stany zużycia')}">${escape(wearLabel)}</span></div>
      ${inventory ? `<p class="skin-wear-full">${escape(item.wear)}</p><p class="float">${item.noWear ? 'Wykończenie bez zużycia' : `Float: ${item.float.toFixed(6)}`}</p>${wearMeter(item,true)}<div class="inventory-skin-actions"><button class="sell-button" data-action="sell" data-id="${escape(item.id)}" ${item.locked ? 'disabled' : ''} aria-label="Sprzedaj ${escape(item.weapon + ' ' + finish)} za ${money(sale(item.value))}">${item.locked ? `${icon('lock')} Chroniony` : `Sprzedaj · ${money(sale(item.value))}`}</button><button class="skin-upgrade-button" data-action="send-upgrader" data-id="${escape(item.id)}" ${item.locked ? 'disabled' : ''} aria-label="Ulepsz ${escape(item.weapon + ' ' + finish)}">${icon('upgrade')}</button></div>` : ''}
    </article>`;
  }


  function renderOpener(id) {
    app.innerHTML = window.OpeningView.render(careerContext(), {caseId:id,count:openingCount,poolPage,poolRarity,poolWear,query:poolQuery});
    window.OpeningView.center();
  }
  function centerPreview() { if (!spinning) window.OpeningView.center(); }
  async function openCase(id) {
    if (spinning) return;
    spinning=true; busyKind='opening';
    const result=game.openCases(id,openingCount);
    if (!result.ok) { spinning=false;busyKind=null;render();toast(result.error,true);return; }
    lastBatch=result;resultItem=result.items[0];openingReward=result.rewards[0];
    sound('buy');
    try {
      await window.OpeningView.animate(careerContext(),{caseId:id,rewards:result.rewards,count:result.quantity,fast:state.settings.fast,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});
    } catch { window.OpeningView.cancel(); }
    spinning=false;busyKind=null;state=game.getState();paintHeader();
    const best=result.items.reduce((a,b)=>RARITIES[a.rarity].rank>RARITIES[b.rarity].rank?a:b);
    sound('win',best.rarity);
    if(result.quantity===1)showResult(result.items[0]);else showBatchResult(result);
  }


  function renderShop() {
    app.innerHTML = `<div class="view-heading"><p class="eyebrow"><span class="dash"></span> UZUPEŁNIJ ZAPASY</p><h1>Sklep ze skrzynkami</h1><p>Skrzynkę i klucz kupujesz osobno. Droższe kolekcje odblokujesz wraz z rozwojem kariery.</p></div><div class="info-banner">${icon('info')}<span>Każda skrzynka wymaga <strong>własnego, pasującego klucza</strong>. Saldo jest wspólne — zdecyduj, którą kolekcję chcesz teraz rozwijać.</span></div><div class="shop-toolbar"><label class="search-field">${icon('search')}<input id="shop-search" type="search" aria-label="Szukaj w sklepie" placeholder="Znajdź skrzynkę…" value="${escape(shopQuery)}"></label><select id="shop-origin" class="filter-select" aria-label="Rodzaj skrzynek w sklepie"><option value="all" ${shopOrigin === 'all' ? 'selected' : ''}>Wszystkie typy</option><option value="official" ${shopOrigin === 'official' ? 'selected' : ''}>Oficjalne CS2</option><option value="custom" ${shopOrigin === 'custom' ? 'selected' : ''}>SKINLAB Originals</option><option value="terminal" ${shopOrigin === 'terminal' ? 'selected' : ''}>Terminale · symulacja</option></select><label class="toggle"><input id="shop-unlocked" type="checkbox" ${shopUnlocked ? 'checked' : ''}>Tylko odblokowane</label><a class="button small outline" href="#career">${icon('trophy')} Poziom ${game.getProgress().level}</a></div><p class="filter-results" id="shop-count"></p><div class="shop-grid" id="shop-grid"></div><div class="trust-row"><span>${icon('wallet')} Wirtualne środki</span><span>${icon('check')} Zakupy zapisują się automatycznie</span><a href="#earn">Brakuje środków? Zarabiaj w grze ${icon('arrow')}</a></div>`;
    renderShopGrid();
  }

  function renderShopGrid() {
    const grid = $('#shop-grid');
    if (!grid) return;
    const boxes = CASES.filter(box => (!shopUnlocked || game.getCaseAccess(box.id).unlocked) && originMatches(box, shopOrigin) && box.name.toLowerCase().includes(shopQuery.trim().toLowerCase())).sort((a, b) => a.requiredLevel - b.requiredLevel || a.price - b.price);
    $('#shop-count').textContent = `${boxes.length} ${plural(boxes.length, 'kolekcja', 'kolekcje', 'kolekcji')} · ${game.getProgress().unlockedCases} / ${CASES.length} odblokowanych`;
    grid.innerHTML = boxes.length ? boxes.map(box => {
      const access = game.getCaseAccess(box.id);
      return `<article class="shop-card ${access.unlocked ? '' : 'locked-shop'}"><div class="shop-case-head">${caseImage(box.id)}<div><span class="micro-label">POZ. ${box.requiredLevel} · ${escape(box.tierLabel || 'KOLEKCJA')}</span><h2>${escape(box.name)}</h2><p>${box.skins.length} skinów · ${escape(box.rareType)}</p><div class="shop-owned"><span>Skrzynki: ${state.cases[box.id]}</span><span>Klucze: ${state.keys[box.id]}</span></div></div></div>${!access.unlocked ? `<div class="shop-lock-message">${icon('lock')} Wymaga poziomu ${access.requiredLevel}. <a href="#career">Rozwijaj karierę ${icon('up')}</a></div>` : ''}${['case', 'key'].map(type => `<div class="shop-purchase">${icon(type === 'case' ? 'box' : 'key')}<div class="product-info"><h3>${type === 'case' ? 'Skrzynka' : 'Pasujący klucz'}</h3><p>${money(type === 'case' ? box.price : box.keyPrice)} / szt.</p></div><select class="quantity" id="qty-${type}-${box.id}" aria-label="Liczba ${type === 'case' ? 'skrzynek' : 'kluczy'} ${escape(box.name)}" ${!access.unlocked ? 'disabled' : ''}>${[1, 5, 10].map(qty => `<option value="${qty}">${qty}×</option>`).join('')}</select>${button('Kup', `buy-${type}`, `data-case="${box.id}" data-quantity="qty-${type}-${box.id}" ${!access.unlocked || state.balance < (type === 'case' ? box.price : box.keyPrice) ? 'disabled' : ''}`, `small ${type === 'case' ? '' : 'secondary'}`)}</div>`).join('')}<div class="shop-total"><span>Łączny koszt otwarcia</span><b>${money(box.price + box.keyPrice)}</b></div><a class="text-button" href="#case/${box.id}">Zobacz zawartość ${icon('arrow')}</a></article>`;
    }).join('') : `<div class="empty-state">${icon('search')}<h2>Nie znaleziono skrzynek</h2><p>Zmień nazwę lub pokaż również zablokowane kolekcje.</p></div>`;
  }


  function filteredInventory() { return window.InventoryView.filteredSkins(careerContext(),inventoryFilter); }
  function renderInventory() {
    app.innerHTML=window.InventoryView.render(careerContext(),inventoryFilter);
    renderInventoryGrid();
  }
  function renderInventoryGrid() {
    if(!$('#inventory-grid'))return;
    const result=window.InventoryView.grid(careerContext(),inventoryFilter);
    inventoryFilter.page=result.page;
    $('#inventory-grid').innerHTML=result.html;
    $('#inventory-results').textContent=result.label;
    $('#inventory-pagination').innerHTML=result.pagination;
    $('#sell-filtered').disabled=!result.sellableCount;
  }
  function preserveInput(renderView) {
    const active=document.activeElement,id=active?.id;
    const selection=active&&'selectionStart'in active?active.selectionStart:null;
    renderView();
    const next=id&&document.getElementById(id);
    if(next){next.focus({preventScroll:true});if(selection!==null){try{next.setSelectionRange(selection,selection);}catch{}}}
  }
  function renderUpgrader() {
    upgradeOptions.ids=upgradeOptions.ids.filter(id=>state.inventory.some(item=>item.id===id&&!item.locked));
    app.innerHTML=window.UpgraderView.render(careerContext(),upgradeOptions);
  }
  async function runUpgrade() {
    if(spinning)return;
    spinning=true;busyKind='upgrade';
    const result=game.upgrade([...upgradeOptions.ids],upgradeOptions.target,upgradeOptions.wear);
    if(!result.ok){spinning=false;busyKind=null;renderUpgrader();toast(result.error,true);return;}
    document.querySelectorAll('.upgrade-arena button,.upgrade-presets button,.upgrade-picker button,.upgrade-picker input,.upgrade-picker select').forEach(control=>{control.disabled=true;});
    const wheel=$('#upgrade-wheel'),needle=$('#upgrade-needle');
    wheel?.classList.add('upgrading');
    $('#upgrade-status').textContent='Trwa próba ulepszenia…';sound('buy');
    // This angle displays the roll already committed by the game.
    const angle=360*result.roll,totalAngle=360*5+angle;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    try{
      spinAnimation=needle?.animate([{transform:'rotate(0deg)'},{transform:`rotate(${totalAngle}deg)`}],{duration:reduced?160:state.settings.fast?1300:3800,easing:'cubic-bezier(.16,.02,.12,1)',fill:'forwards'});
      await spinAnimation?.finished;
      if(needle)needle.style.transform=`rotate(${angle}deg)`;
      spinAnimation?.cancel();wheel?.classList.add(result.won?'won':'lost');
      await new Promise(resolve=>setTimeout(resolve,reduced?80:450));
    }catch{/* State is saved before animation. */}
    spinning=false;busyKind=null;state=game.getState();paintHeader();
    upgradeOptions.ids=[];renderUpgrader();resultItem=result.item;
    sound(result.won?'win':'tap',result.item?.rarity);showUpgradeResult(result);
  }
  function chooseUpgradePreset(multiplier) {
    const value=state.inventory.filter(item=>upgradeOptions.ids.includes(item.id)&&!item.locked).reduce((sum,item)=>sum+item.value,0);
    if(!value)return;
    const candidates=SKINS.map(skin=>({skin,value:game.getSkinValue(skin.id,upgradeOptions.wear)})).filter(row=>row.value>=Math.ceil(value*multiplier)).sort((a,b)=>a.value-b.value);
    if(!candidates.length){toast('Brak celu o tej wartości w wybranym stanie. Zmień mnożnik lub zużycie.',true);return;}
    upgradeOptions.target=candidates[0].skin.id;upgradeOptions.query='';upgradeOptions.rarity='all';upgradeOptions.page=1;renderUpgrader();
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

  function showModal(html,wide=false) {
    modal.classList.toggle('wide',wide);
    if (!modal.open) previousFocus = document.activeElement;
    content.innerHTML = html;
    if (!modal.open) modal.showModal();
    const first = $('button', content);
    first?.focus();
  }

  function closeModal() { if (modal.open) modal.close(); }
  const modalTop = title => `<div class="modal-top"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="Zamknij okno">${icon('close')}</button></div>`;


  function showOdds(caseId) {
    const id=caseId||(route.startsWith('case/')?route.split('/')[1]:'dnm');
    const box=caseById(id),chances=game.getRarityChances(id);
    showModal(`<div class="modal-body">${modalTop('Szanse · '+escape(box.name))}<p class="modal-copy">${box.isCustom||box.isTerminal?'Ta kolekcja ma autorskie wagi poszczególnych przedmiotów. Poniżej suma szans dla każdej rzadkości.':'Najpierw losowana jest rzadkość, następnie wariant tego poziomu. Każde otwarcie jest niezależne.'}</p><div class="chance-list">${Object.entries(chances).filter(([,chance])=>chance>0).map(([id,chance])=>`<div><div class="chance-row-head"><span><i style="--r:${RARITIES[id].color}"></i>${RARITIES[id].label}</span><b>${percent(chance)}</b></div><div class="chance-progress"><b style="--r:${RARITIES[id].color};width:${chance*100}%"></b></div></div>`).join('')}</div><p class="modal-copy">Szansę każdego wariantu zobaczysz na jego karcie. Zużycie i float są losowane w dozwolonym zakresie skina. Filtr zużycia zmienia podgląd cen, a nie wynik losowania.</p>${button('Wszystko jasne','close-modal','','wide secondary')}</div>`);
  }
  function showResult(item) {
    const r=RARITIES[item.rarity];
    showModal(`<div class="result-modal" style="--rarity:${r.color}"><button class="icon-button modal-close" data-action="close-modal" aria-label="Zamknij wynik">${icon('close')}</button><p class="eyebrow">${icon(item.rarity==='rare'?'star':'check')} ${item.rarity==='rare'?'WYJĄTKOWO RZADKI DROP!':'NOWY SKIN W KOLEKCJI'}</p><h2 id="modal-title">Oto Twój drop.</h2><div class="result-art">${image(skinImage(item),item.weapon+' | '+itemName(item),'',true)}</div><p class="result-weapon">${item.stattrak?'StatTrak™ ':''}${escape(item.weapon)}</p><h3 class="result-name">${escape(itemName(item))}</h3><div class="result-tags"><span class="rarity-tag">${r.label}</span><span>${escape(item.wear)}</span>${item.noWear?'':`<span>Float ${item.float.toFixed(6)}</span>`}</div>${wearMeter(item)}<div class="result-progression">${icon(openingReward?.newDiscovery?'book':'trophy')}<span><b>${openingReward?.newDiscovery?'Nowe odkrycie w albumie':'Kolejny krok w karierze'}</b><small>Odkrycie zostaje także po sprzedaży.</small></span><strong>+${openingReward?.xpAwarded??0} XP</strong></div><div class="result-value">${money(item.value)}</div><p class="result-fee">Cena w symulatorze · Sprzedaż po prowizji ${feePercent}%: ${money(sale(item.value))}</p><div class="modal-buttons">${button(`${icon('grid')} Zachowaj`,'keep-result','','secondary')}${button(`Sprzedaj · ${money(sale(item.value))}`,'sell-result',`data-id="${escape(item.id)}"`,'green')}</div><p class="result-saved">${icon('check')} Przedmiot zapisany · Poziom ${game.getProgress().level}</p></div>`);
  }
  function showBatchResult(result) {
    const net=result.items.reduce((sum,item)=>sum+sale(item.value),0),discoveries=result.rewards.filter(reward=>reward.newDiscovery).length;
    showModal(`<div class="modal-body batch-result">${modalTop(`Twoje dropy · ${result.quantity} skrzynek`)}<p class="modal-copy">Każda taśma to osobne losowanie. Wszystkie przedmioty są już zapisane w ekwipunku.</p><div class="batch-result-grid">${result.items.map(item=>`<div class="batch-result-card">${skinCard(item)}<p>${escape(item.wear)}${item.noWear?'':` · Float ${item.float.toFixed(6)}`}</p>${wearMeter(item,true)}</div>`).join('')}</div><div class="batch-summary"><span>Łączna wartość <b>${money(result.totalValue)}</b></span><span>Nowe odkrycia <b>${discoveries}</b></span><span>Kariera <b>+${result.xpAwarded} XP</b></span></div><div class="modal-buttons">${button(`${icon('grid')} Zachowaj wszystkie`,'keep-result','','secondary')}${button(`Sprzedaj wszystkie · ${money(net)}`,'sell-batch','','green')}</div></div>`,true);
  }
  function showUpgradeResult(result) {
    const item=result.item;
    showModal(`<div class="result-modal upgrade-result ${result.won?'upgrade-success':'upgrade-failure'}" style="--rarity:${item?RARITIES[item.rarity].color:'#9b6371'}"><button class="icon-button modal-close" data-action="close-modal" aria-label="Zamknij wynik">${icon('close')}</button><p class="eyebrow">UPGRADER · ${percent(result.chance)} SZANSY</p><h2 id="modal-title">${result.won?'Ulepszenie udane.':'Tym razem się nie udało.'}</h2>${item?`<div class="result-art">${image(skinImage(item),item.weapon+' '+itemName(item),'',true)}</div><p class="result-weapon">${escape(item.weapon)}</p><h3 class="result-name">${escape(itemName(item))}</h3><div class="result-tags"><span>${escape(item.wear)}</span>${item.noWear?'':`<span>Float ${item.float.toFixed(6)}</span>`}</div>${wearMeter(item)}<div class="result-value">${money(item.value)}</div><p class="result-fee">Przedmiot zapisany w ekwipunku. Wkład został zużyty.</p><div class="modal-buttons">${button('Zachowaj','keep-result','','secondary')}${button(`Sprzedaj · ${money(sale(item.value))}`,'sell-result',`data-id="${escape(item.id)}"`,'green')}</div>`:`<div class="upgrade-loss-icon">${icon('upgrade')}</div><p class="modal-copy">Zużyto ${result.quantity} ${plural(result.quantity,'skin','skiny','skinów')} o łącznej wartości <strong>${money(result.inputValue)}</strong>. Wybrany cel nie trafił do ekwipunku.</p>${button('Wróć do upgradera','close-modal','','wide secondary')}`}</div>`);
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
    else if (route === 'upgrader') renderUpgrader();
    else if (route === 'earn') renderEarn();
    else if (route === 'career') app.innerHTML = window.CareerView.render(careerContext(), { tab: careerTab, chapter: careerChapter, collection: careerCollection });
    else { route = 'cases'; renderCases(); }
    if (state.storageWarning) app.insertAdjacentHTML('afterbegin', `<p class="storage-warning" role="alert">${icon('info')} ${escape(state.storageWarning)}</p>`);
  }

  function navigate(next) { location.hash = next; }

  function runPurchase(type, target) {
    const id = target.dataset.case;
    const qty = target.dataset.count ? Number(target.dataset.count) : target.dataset.quantity ? Number(document.getElementById(target.dataset.quantity)?.value) : 1;
    const result = type === 'case' ? game.buyCase(id, qty) : game.buyKey(id, qty);
    if (!result.ok) { toast(result.error, true); return; }
    sound('buy');
    toast(`${type === 'case' ? 'Kupiono skrzynki' : 'Kupiono klucze'}: ${qty}× ${caseById(id).name}`);
  }

  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (spinning && anchor && anchor.getAttribute('href') !== '#main') { event.preventDefault(); toast(busyKind==='upgrade'?'Jeszcze chwila — trwa próba ulepszenia.':'Jeszcze chwila — Twoje skrzynki właśnie się otwierają.'); return; }
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    const action = target.dataset.action;
    if (spinning && !['skip-opening'].includes(action)) { toast('Poczekaj na wynik losowania.'); return; }
    switch (action) {
      case 'skip-opening': window.OpeningView.skip(); break;
      case 'opening-count': openingCount=Number(target.dataset.count); render(); break;
      case 'pool-page': poolPage=Number(target.dataset.page); render(); $('#contents-title')?.scrollIntoView({block:'start'}); break;
      case 'inventory-tab': inventoryFilter.tab=target.dataset.tab;inventoryFilter.query='';inventoryFilter.rarity='all';inventoryFilter.wear='all';inventoryFilter.favorites=false;inventoryFilter.page=1;renderInventory();break;
      case 'send-upgrader': upgradeOptions.ids=[target.dataset.id];upgradeOptions.target=null;navigate('upgrader');break;
      case 'upgrade-input': {
        const id=target.dataset.id,index=upgradeOptions.ids.indexOf(id);
        if(index>=0)upgradeOptions.ids.splice(index,1);
        else if(upgradeOptions.ids.length>=5){toast('W jednej próbie możesz użyć maksymalnie pięciu skinów.',true);break;}
        else upgradeOptions.ids.push(id);
        upgradeOptions.page=1;renderUpgrader();break;
      }
      case 'upgrade-target': upgradeOptions.target=target.dataset.id;renderUpgrader();break;
      case 'upgrade-clear': upgradeOptions.ids=[];upgradeOptions.target=null;renderUpgrader();break;
      case 'upgrade-preset': chooseUpgradePreset(Number(target.dataset.multiplier));break;
      case 'upgrade-input-page': upgradeOptions.inputPage=Number(target.dataset.page);renderUpgrader();break;
      case 'upgrade-target-page': upgradeOptions.page=Number(target.dataset.page);renderUpgrader();break;
      case 'upgrade-run': runUpgrade();break;
      case 'case-filter': selectedFilter = target.dataset.filter; catalogPage = 1; render(); $('#catalog').scrollIntoView({block:'start'}); break;
      case 'scroll-catalog': $('#catalog')?.scrollIntoView({behavior:'smooth', block:'start'}); break;
      case 'clear-catalog': selectedFilter = 'all'; catalogQuery = ''; catalogOrigin='all';catalogPage = 1; render(); $('#catalog').scrollIntoView({block:'start'}); break;
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
      case 'odds': showOdds(target.dataset.case); break;
      case 'stats': showStats(); break;
      case 'close-modal': closeModal(); break;
      case 'keep-result': closeModal(); resultItem = null;lastBatch=null;render();toast('Przedmioty czekają w Twoim ekwipunku.');break;
      case 'sell-batch': {
        if(!lastBatch)break;
        const result=game.sellItems(lastBatch.items.map(item=>item.id));
        if(!result.ok){toast(result.error,true);break;}
        closeModal();resultItem=null;lastBatch=null;render();sound('buy');toast(`Sprzedano serię. +${money(result.total)}`);break;
      }
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
      case 'clear-filters': inventoryFilter.query = ''; inventoryFilter.rarity = 'all';inventoryFilter.wear='all';inventoryFilter.favorites = false; inventoryFilter.page = 1; renderInventory(); break;
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
    if(spinning)return;
    if(event.target.id==='pool-search'){poolQuery=event.target.value;poolPage=1;preserveInput(()=>renderOpener(route.split('/')[1]));}
    if(event.target.id==='upgrade-input-search'){upgradeOptions.inputQuery=event.target.value;upgradeOptions.inputPage=1;preserveInput(renderUpgrader);}
    if(event.target.id==='upgrade-target-search'){upgradeOptions.query=event.target.value;upgradeOptions.page=1;preserveInput(renderUpgrader);}
    if (event.target.id === 'case-search') { catalogQuery = event.target.value; catalogPage = 1; renderCatalogGrid(); }
    if (event.target.id === 'shop-search') { shopQuery = event.target.value; renderShopGrid(); }
    if (event.target.id === 'inventory-search') {
      inventoryFilter.query = event.target.value;
      inventoryFilter.page = 1;
      renderInventoryGrid();
    }
  });
  document.addEventListener('change', event => {
    if(spinning)return;
    if(event.target.id==='pool-rarity'){poolRarity=event.target.value;poolPage=1;preserveInput(()=>renderOpener(route.split('/')[1]));}
    if(event.target.id==='pool-wear'){poolWear=event.target.value;poolPage=1;preserveInput(()=>renderOpener(route.split('/')[1]));}
    if(event.target.id==='upgrade-wear'){upgradeOptions.wear=event.target.value;upgradeOptions.page=1;renderUpgrader();}
    if(event.target.id==='upgrade-rarity'){upgradeOptions.rarity=event.target.value;upgradeOptions.page=1;renderUpgrader();}
    if(event.target.id==='case-origin'){catalogOrigin=event.target.value;catalogPage=1;renderCatalogGrid();}
    if(event.target.id==='shop-origin'){shopOrigin=event.target.value;renderShopGrid();}
    if(event.target.id==='wear-filter'){inventoryFilter.wear=event.target.value;inventoryFilter.page=1;renderInventoryGrid();}
    if (event.target.id === 'case-sort') { catalogSort = event.target.value; catalogPage = 1; renderCatalogGrid(); }
    if (event.target.id === 'shop-unlocked') { shopUnlocked = event.target.checked; renderShopGrid(); }
    if (event.target.id === 'rarity-filter') { inventoryFilter.rarity = event.target.value; inventoryFilter.page = 1; renderInventoryGrid(); }
    if (event.target.id === 'inventory-sort') { inventoryFilter.sort = event.target.value; inventoryFilter.page = 1; renderInventoryGrid(); }
    if (event.target.id === 'fast-toggle') game.setSetting('fast', event.target.checked);
  });
  $('#sound-toggle').addEventListener('click', () => { game.setSetting('sound', !state.settings.sound); sound('tap'); });
  modal.addEventListener('close', () => {
    if (resultItem) { resultItem = null;lastBatch=null;render(); }
    previousFocus?.isConnected && previousFocus.focus({ preventScroll: true });
  });
  modal.addEventListener('click', event => { if (event.target === modal) { const rect = modal.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal(); } });
  window.addEventListener('hashchange', () => {
    if (location.hash === '#main') return;
    if (spinning) { history.replaceState(null, '', lastHash); return; }
    const requested = location.hash.slice(1) || 'cases';
    if(requested.startsWith('case/')&&requested!==route){poolQuery='';poolRarity='all';poolWear='all';poolPage=1;}
    route = ['cases', 'shop', 'inventory', 'upgrader', 'earn', 'career'].includes(requested) || (requested.startsWith('case/') && caseById(requested.split('/')[1])) ? requested : 'cases';
    lastHash = `#${route}`;
    paintHeader(); render();
    if (scrollToCatalogOnRoute && route === 'cases') {
      scrollToCatalogOnRoute = false;
      $('#catalog')?.scrollIntoView({block:'start', behavior:'instant'});
    } else window.scrollTo({ top: 0, behavior: 'instant' });
  });
  window.addEventListener('resize', centerPreview);
  window.addEventListener('pagehide', () => { window.OpeningView.cancel();spinAnimation?.cancel(); });
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



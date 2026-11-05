/* SKINLAB — opening presentation. Rewards are committed by the game before animation. */
(function (root) {
  'use strict';
  const ALLOWED_COUNTS = [1, 2, 3, 5];
  const PAGE_SIZE = 48;
  let active = null;
  let serial = 0;

  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const chanceLabel = fraction => `${(fraction * 100).toLocaleString('pl-PL', { maximumFractionDigits: fraction < .0001 ? 6 : fraction < .01 ? 4 : 2 })}%`;
  function definitions() { return root.CaseGame || { RARITIES: {}, WEARS: [] }; }
  function helpers(ctx) {
    return { escape: ctx.escape || escapeHTML, icon: ctx.icon || (() => ''), button: ctx.button || ((text, action, extra = '', cls = '') => `<button class="button ${cls}" data-action="${action}" ${extra}>${text}</button>`) };
  }
  function rollerCard(ctx, item, winner = false) {
    if (!item) return '';
    const { escape } = helpers(ctx);
    const color = definitions().RARITIES[item.rarity]?.color || '#7e8ba2';
    const name = typeof ctx.itemName === 'function' ? ctx.itemName(item) : item.displayName || item.name;
    const path = ctx.skinImage ? ctx.skinImage(item) : item.image || '';
    return `<div class="roller-card${winner ? ' winner' : ''}" style="--rarity:${color}" ${winner ? 'data-winner="true"' : ''}><img src="${escape(path)}" alt="" decoding="async" loading="eager" draggable="false"><small>${escape(item.weapon)}</small><b title="${escape(name)}">${escape(name)}</b></div>`;
  }
  function render(ctx, options = {}) {
    const { escape, icon, button } = helpers(ctx);
    const game = ctx.game;
    const state = ctx.state || game.getState();
    const cases = ctx.CASES || ctx.cases || definitions().CASES || [];
    const box = cases.find(entry => entry.id === options.caseId);
    if (!box) return `<div class="empty-state"><h2>Nie znaleziono skrzynki</h2><a class="button" href="#cases">Wszystkie skrzynki</a></div>`;
    const id = escape(box.id);
    const count = ALLOWED_COUNTS.includes(options.count) ? options.count : 1;
    const access = game.getCaseAccess(box.id);
    const openingXP = game.getOpeningXP ? game.getOpeningXP(box.id) : { openXP: 25, discoveryXP: 10 };
    const owned = state.cases[box.id] || 0;
    const keys = state.keys[box.id] || 0;
    const ready = access.unlocked && owned >= count && keys >= count;
    const money = ctx.money || (value => `$${(value / 100).toFixed(2)}`);
    const caseImage = ctx.caseImage || (() => icon('box'));
    const rarities = definitions().RARITIES;
    const wears = definitions().WEARS;
    const rarityChances = game.getRarityChances(box.id);
    const dropChances = new Map(game.getDropChances(box.id).map(row => [row.skinId, row.chance]));
    const poolRarity = options.poolRarity || 'all';
    const poolWear = options.poolWear || 'all';
    const query = String(options.query || options.poolQuery || '').trim().toLocaleLowerCase('pl');
    const pool = box.skins.filter(source => (poolRarity === 'all' || source.rarity === poolRarity) &&
      (poolWear === 'all' || game.getSkinValue(source.id, poolWear) !== null) &&
      (!query || `${source.weapon} ${source.displayName || source.name}`.toLocaleLowerCase('pl').includes(query)))
      .sort((left, right) => (rarities[right.rarity]?.rank || 0) - (rarities[left.rarity]?.rank || 0) || (left.displayName || left.name).localeCompare(right.displayName || right.name));
    const pages = Math.max(1, Math.ceil(pool.length / PAGE_SIZE));
    const page = Math.min(pages, Math.max(1, Math.trunc(Number(options.poolPage) || 1)));
    const visible = pool.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const collection = game.getCollections().find(entry => entry.caseId === box.id);
    const legend = `<div class="rarity-legend">${Object.entries(rarityChances).filter(([, chance]) => chance > 0).map(([rarity, chance]) => `<span><i style="--r:${rarities[rarity]?.color || '#8b95a8'}"></i>${escape(rarities[rarity]?.label || rarity)} <b>${chanceLabel(chance)}</b></span>`).join('')}</div>`;
    const rows = Array.from({ length: count }, (_, row) => `<div class="roller-shell"><span class="roller-row-label">DROP ${String(row + 1).padStart(2, '0')}</span><div id="roller-${row}" class="roller" data-row="${row}" aria-label="Taśma losowania ${row + 1}"><div id="roller-track-${row}" class="roller-track" data-center-index="5">${Array.from({ length: 11 }, () => rollerCard(ctx, game.previewItem(box.id))).join('')}</div><div class="roller-marker"></div></div></div>`).join('');
    const pagination = pages > 1 ? `<div class="inventory-pagination">${button(`${icon('back')} Poprzednia`, 'pool-page', `data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}`, 'small outline')}<span>Strona ${page} z ${pages}</span>${button(`Następna ${icon('arrow')}`, 'pool-page', `data-page="${page + 1}" ${page === pages ? 'disabled' : ''}`, 'small outline')}</div>` : '';
    const contentCards = visible.map(source => {
      const code = poolWear !== 'all' ? poolWear : game.getSkinValue(source.id, 'MW') !== null ? 'MW' : wears.find(wear => game.getSkinValue(source.id, wear.code) !== null)?.code;
      const previewPrice = code ? game.getSkinValue(source.id, code) : source.baseValue;
      const item = { ...source, dropChance: dropChances.get(source.id) || 0, previewWear: code, previewPrice, value: previewPrice, wearCode: code, wear: wears.find(wear => wear.code === code)?.label || '' };
      return ctx.skinCard ? ctx.skinCard(item, false) : `<article class="skin-card"><h3>${escape(source.weapon)} | ${escape(source.displayName || source.name)}</h3><p>${money(previewPrice)} · ${escape(code)}</p><span class="drop-chance">${chanceLabel(item.dropChance)}</span></article>`;
    }).join('');
    return `<a href="#cases" class="back-link">${icon('back')} Wszystkie skrzynki</a>
      <div class="detail-heading">${caseImage(box.id, '', true)}<div><p class="eyebrow">${box.isCustom ? 'CUSTOM COLLECTION' : box.isTerminal ? 'TERMINAL · SYMULACJA' : `KOLEKCJA ${box.year}`} · ${box.skins.length} WARIANTÓW · POZ. ${box.requiredLevel || 1}</p><h1>${escape(box.name)}</h1><p class="section-subtitle">${escape(box.description || box.subtitle || '')}</p></div><button class="button outline small" data-action="odds" data-case="${id}">${icon('info')} Szanse wylotu</button></div>
      ${box.isTerminal ? `<div class="info-banner terminal-banner">${icon('info')}<span>Terminal działa tu jako autorska symulacja losowania. Mechanika różni się od terminala w CS2; poniższe szanse dotyczą wyłącznie tej gry.</span></div>` : ''}
      ${box.isCustom ? `<p class="custom-case-note section-subtitle">Autorska pula i indywidualne wagi przedmiotów. Każdy procent w zawartości pochodzi z rzeczywistej tabeli losowania tej skrzynki.</p>` : ''}
      ${access.unlocked ? `<div class="opener-summary"><span>${count === 1 ? 'Koszt otwarcia' : `Koszt ${count} otwarć`} <strong>${money((box.price + box.keyPrice) * count)}</strong></span><span>${icon('book')} +${openingXP.openXP} XP / otwarcie · +${openingXP.discoveryXP} XP / nowe odkrycie</span></div>` : `<div class="info-banner locked-banner">${icon('lock')}<span>Ta kolekcja wymaga poziomu <strong>${access.requiredLevel}</strong>. Twój poziom: ${access.level}. Otwieraj skrzynki i wykonuj misje, aby zdobywać XP.</span><a class="button small secondary" href="#career">Przejdź do kariery ${icon('arrow')}</a></div>`}
      <section class="opener-panel" aria-label="Otwieranie skrzynek"><div class="opener-topline"><span>${icon('box')} ${count === 1 ? 'JEDEN ROLLER. JEDEN NOWY DROP.' : `${count} ${count === 5 ? 'ROLLERÓW' : 'ROLLERY'}. ${count} NIEZALEŻNYCH LOSOWAŃ.`}</span><label class="toggle"><input type="checkbox" id="fast-toggle" ${state.settings.fast ? 'checked' : ''}>Szybkie otwieranie</label></div>
        <div class="opening-quantity-row"><span>Liczba skrzynek</span><div class="opening-quantity segmented" role="group" aria-label="Liczba otwieranych skrzynek">${ALLOWED_COUNTS.map(quantity => `<button data-action="opening-count" data-count="${quantity}" class="${count === quantity ? 'active' : ''}" aria-pressed="${count === quantity}">${quantity}×</button>`).join('')}</div></div>
        <div class="batch-rollers count-${count}">${rows}</div><div class="opener-controls">${button(`${icon('key')} Otwórz ${count === 1 ? 'skrzynkę' : `${count} ${count === 5 ? 'skrzynek' : 'skrzynki'}`} ${icon('arrow')}`, 'open', `data-case="${id}" data-count="${count}" ${ready ? '' : 'disabled'}`, 'open-button')}${button('Pomiń animację', 'skip-opening', 'id="skip-opening" disabled hidden', 'small outline')}<div id="open-status" class="open-requirement" aria-live="polite">Posiadasz: <span class="${owned >= count ? 'ready' : ''}">${owned} skrzynek</span> i <span class="${keys >= count ? 'ready' : ''}">${keys} pasujących kluczy</span>${ready ? ' · Gotowe do otwarcia!' : `<br>Do tej serii potrzebujesz ${count} skrzynek i ${count} pasujących kluczy.`}</div></div></section>
      <div class="purchase-row"><article class="purchase-card">${caseImage(box.id)}<div><h3>Skrzynka ${escape(box.name)}</h3><p>Posiadasz: ${owned} · Zakup ${count} szt.</p></div>${button(`Kup ${count}× · ${money(box.price * count)}`, 'buy-case', `data-case="${id}" data-count="${count}" ${!access.unlocked || state.balance < box.price * count ? 'disabled' : ''}`, 'secondary')}</article><article class="purchase-card"><span class="purchase-key">${icon('key')}</span><div><h3>Klucz ${escape(box.name)}</h3><p>Posiadasz: ${keys} · Pasuje do tej skrzynki</p></div>${button(`Kup ${count}× · ${money(box.keyPrice * count)}`, 'buy-key', `data-case="${id}" data-count="${count}" ${!access.unlocked || state.balance < box.keyPrice * count ? 'disabled' : ''}`, 'secondary')}</article></div>
      <section aria-labelledby="contents-title"><div class="section-head"><div><h2 id="contents-title">Zawartość skrzynki<small>${box.skins.length} wariantów</small></h2><p class="section-subtitle">${collection ? `${collection.discovered} / ${collection.total} odkryć w albumie.` : ''} Procent na karcie to szansa wylosowania danego wariantu.</p></div></div>${legend}
      <div class="pool-toolbar catalog-toolbar"><label class="search-field">${icon('search')}<input id="pool-search" type="search" placeholder="Znajdź skin…" aria-label="Szukaj w zawartości skrzynki" value="${escape(options.query || options.poolQuery || '')}"></label><select id="pool-rarity" class="filter-select" aria-label="Filtr rzadkości"><option value="all">Wszystkie rzadkości</option>${Object.entries(rarityChances).filter(([, chance]) => chance > 0).map(([rarity]) => `<option value="${rarity}" ${poolRarity === rarity ? 'selected' : ''}>${escape(rarities[rarity]?.label || rarity)}</option>`).join('')}</select><select id="pool-wear" class="filter-select" aria-label="Podgląd stanu zużycia"><option value="all">Wszystkie stany</option>${wears.filter(wear => box.skins.some(source => game.getSkinValue(source.id, wear.code) !== null)).map(wear => `<option value="${wear.code}" ${poolWear === wear.code ? 'selected' : ''}>${escape(wear.label)}</option>`).join('')}</select></div>
      <p class="filter-results">${pool.length} wariantów · ${visible.length ? (page - 1) * PAGE_SIZE + 1 : 0}–${Math.min(page * PAGE_SIZE, pool.length)}. Filtr zużycia zmienia podgląd cen; zużycie dropu pozostaje losowe.</p><div class="content-grid">${contentCards || `<div class="empty-state"><h3>Brak pasujących skinów</h3><p>Zmień filtry lub nazwę.</p></div>`}</div>${pagination}<p class="section-subtitle" style="margin-top:16px">Ceny są zapisanymi wycenami symulatora dla pokazanego stanu. Procent obejmuje wariant skina; float i StatTrak są losowane osobno. Nie jest to bieżąca oferta rynkowa.</p></section>`;
  }

  function position(roller, track, index) {
    const card = track.children[index] || track.firstElementChild;
    if (!card) return 0;
    return roller.clientWidth / 2 - card.offsetLeft - card.offsetWidth / 2;
  }
  function center() {
    if (active) return;
    document.querySelectorAll('.batch-rollers .roller').forEach(roller => {
      const track = roller.querySelector('.roller-track');
      if (track) track.style.transform = `translateX(${position(roller, track, Number(track.dataset.centerIndex) || 5)}px)`;
    });
  }
  function settleRow(row) {
    if (!row.track.isConnected) return;
    row.track.dataset.centerIndex = String(row.winnerIndex);
    row.track.style.transform = `translateX(${position(row.roller, row.track, row.winnerIndex)}px)`;
    row.roller.classList.remove('rolling');
    row.roller.classList.add('finished');
  }
  function skip() {
    if (!active) return;
    active.skipRequested = true;
    active.animations.forEach(animation => {
      if (animation.playState !== 'running' && animation.playState !== 'paused') return;
      try { animation.finish(); } catch (_) { animation.cancel(); }
    });
    active.release();
  }
  function cancel() {
    if (!active) return;
    active.cancelled = true;
    active.animations.forEach(animation => animation.cancel());
    active.release();
    if (active.tickFrame) cancelAnimationFrame(active.tickFrame);
    active = null;
    serial += 1;
  }
  function motionFrames(from, to) {
    const frames = [];
    const cutoff = .18;
    const early = .32;
    const exponent = (early * 2 / cutoff) * (1 - cutoff) / (1 - early);
    for (let index = 0; index <= 120; index++) {
      const time = index / 120;
      const progress = time <= cutoff ? early * Math.pow(time / cutoff, 2) : early + (1 - early) * (1 - Math.pow(1 - (time - cutoff) / (1 - cutoff), exponent));
      frames.push({ offset: time, transform: `translateX(${from + (to - from) * progress}px)` });
    }
    return frames;
  }
  async function animate(ctx, options = {}) {
    cancel();
    const token = ++serial;
    let release;
    const interruption = new Promise(resolve => { release = resolve; });
    const session = { animations: [], rows: [], skipRequested: false, cancelled: false, release, tickFrame: 0 };
    active = session;
    const rewards = options.rewards || [];
    const count = rewards.length;
    const status = document.querySelector('#open-status');
    const openButton = document.querySelector('[data-action="open"]');
    const skipButton = document.querySelector('#skip-opening');
    if (openButton) { openButton.disabled = true; openButton.textContent = 'Trwa otwieranie…'; }
    document.querySelectorAll('[data-action="opening-count"], [data-action="buy-case"], [data-action="buy-key"], #fast-toggle').forEach(control => { control.disabled = true; });
    if (skipButton) { skipButton.hidden = false; skipButton.disabled = false; }
    if (status) status.textContent = count > 1 ? `Losowanie ${count} niezależnych dropów…` : 'Twój kolejny drop jest coraz bliżej…';
    for (let rowIndex = 0; rowIndex < count; rowIndex++) {
      const roller = document.getElementById(`roller-${rowIndex}`);
      const track = document.getElementById(`roller-track-${rowIndex}`);
      if (!roller || !track) continue;
      const reward = rewards[rowIndex];
      const item = reward.item || reward;
      const winnerIndex = 34 + rowIndex % 2;
      const cards = Array.from({ length: 42 }, (_, index) => index === winnerIndex ? item : ctx.game.previewItem(options.caseId));
      track.innerHTML = cards.map((source, index) => rollerCard(ctx, source, index === winnerIndex)).join('');
      roller.classList.remove('finished');
      roller.classList.add('rolling');
      track.dataset.centerIndex = '3';
      track.style.transform = `translateX(${position(roller, track, 3)}px)`;
      session.rows.push({ roller, track, winnerIndex, rowIndex });
    }
    try {
      const images = session.rows.flatMap(row => Array.from(row.track.querySelectorAll('img')));
      const decoding = Promise.allSettled(images.map(image => typeof image.decode === 'function' ? image.decode() : Promise.resolve()));
      let decodeTimer;
      await Promise.race([decoding, new Promise(resolve => { decodeTimer = setTimeout(resolve, 300); }), interruption]);
      clearTimeout(decodeTimer);
      if (session.cancelled || serial !== token) return { cancelled: true };
      const duration = options.reduced ? 160 : options.fast ? 1500 : 4800;
      const work = session.rows.map(row => {
        if (session.skipRequested || typeof row.track.animate !== 'function') { settleRow(row); return Promise.resolve(); }
        const from = position(row.roller, row.track, 3);
        const to = position(row.roller, row.track, row.winnerIndex);
        const animation = row.track.animate(motionFrames(from, to), { duration, delay: options.reduced ? 0 : row.rowIndex * 80, easing: 'linear', fill: 'forwards' });
        session.animations.push(animation);
        return animation.finished.catch(() => {}).then(() => {
          if (session.cancelled || serial !== token) return;
          animation.cancel();
          settleRow(row);
        });
      });
      let lastCard = -1;
      let lastSound = 0;
      function tick(timestamp) {
        if (active !== session || session.skipRequested || session.cancelled) return;
        const lead = session.rows[0];
        if (lead && ctx.sound && !options.reduced) {
          const marker = lead.roller.getBoundingClientRect().left + lead.roller.clientWidth / 2;
          const first = lead.track.firstElementChild;
          const second = first?.nextElementSibling;
          if (first && second) {
            const firstRect = first.getBoundingClientRect();
            const stride = second.getBoundingClientRect().left - firstRect.left;
            const under = Math.floor((marker - firstRect.left) / stride);
            if (under !== lastCard && timestamp - lastSound >= 60) { ctx.sound('tick'); lastSound = timestamp; lastCard = under; }
          }
        }
        session.tickFrame = requestAnimationFrame(tick);
      }
      session.tickFrame = requestAnimationFrame(tick);
      await Promise.all(work);
      if (session.tickFrame) cancelAnimationFrame(session.tickFrame);
      if (session.cancelled || serial !== token) return { cancelled: true };
      session.rows.forEach(settleRow);
      if (status) status.textContent = `Gotowe! ${count === 1 ? 'Skin trafił' : 'Wszystkie skiny trafiły'} do ekwipunku.`;
      if (skipButton) skipButton.disabled = true;
      let glowTimer;
      await Promise.race([new Promise(resolve => { glowTimer = setTimeout(resolve, options.reduced ? 80 : session.skipRequested ? 160 : 650); }), interruption]);
      clearTimeout(glowTimer);
      return { cancelled: session.cancelled };
    } finally {
      if (active === session) active = null;
      if (session.tickFrame) cancelAnimationFrame(session.tickFrame);
      if (skipButton) { skipButton.hidden = true; skipButton.disabled = true; }
    }
  }
  root.OpeningView = Object.freeze({ render, animate, center, skip, cancel });
})(typeof window !== 'undefined' ? window : globalThis);

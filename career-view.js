/* Presentational career and collection views. Game rules live in game.js. */
window.CareerView = (() => {
  'use strict';
  const chapters = [
    ['Pierwszy kontakt', 'Zacznij od podstaw. Otwieraj, odkrywaj i poznaj swoją kolekcję.'],
    ['Łowca wzorów', 'Wyjdź poza jedną skrzynkę i poszerzaj swój album.'],
    ['Własna kolekcja', 'Każde nowe wykończenie przybliża Cię do następnej rangi.'],
    ['Szerokie horyzonty', 'Sięgaj po kolejne kolekcje i buduj swój dorobek.'],
    ['Kolekcjonerska liga', 'Coraz większy album. Coraz bliżej najrzadszych kolekcji.'],
    ['Droga do Kuratora', 'Ostatni rozdział. Zostaw po sobie kolekcję z historią.']
  ];
  const bar = (current, target, cls = '') => `<div class="progress-track ${cls}" role="progressbar" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${Math.min(current, target)}"><span style="width:${Math.min(100, current / Math.max(1, target) * 100)}%"></span></div>`;

  function teaser(ctx) {
    const { game, icon, escape, button, money } = ctx;
    const missions = game.getCampaign();
    const next = missions.find(m => m.available && !m.claimed);
    const ready = missions.filter(m => m.available && m.completed && !m.claimed).length;
    const progress = game.getProgress();
    return `<section class="career-teaser"><span class="teaser-symbol">${icon(progress.careerCompleted ? 'trophy' : 'book')}</span><div class="teaser-copy"><span class="micro-label">${progress.careerCompleted ? 'OPERACJA UKOŃCZONA' : `ROZDZIAŁ ${next?.chapter || 1} / 6 · DROGA DO KURATORA`}</span><h2>${escape(next?.title || 'Twój album wciąż może rosnąć.')}</h2><p>${next ? `${escape(next.description)} <b>${Math.min(next.current, next.target)} / ${next.target}</b>` : 'Zdobyta ranga to początek. Odkrywaj wszystkie wykończenia i kompletuj kolekcje.'}</p></div>${next ? `<div class="teaser-reward"><span>NAGRODA</span><b>${money(next.cash)} <small>+ ${next.xp} XP</small></b></div>` : ''}<a class="button ${ready ? '' : 'secondary'} small" href="#career">${ready ? `Odbierz ${ready} ${icon('gift')}` : `Twoja kariera ${icon('arrow')}`}</a></section>`;
  }

  function render(ctx, options = {}) {
    const { game, state, icon, escape, money, button, caseImage, skinCard, cases } = ctx;
    const progress = game.getProgress();
    const missions = game.getCampaign();
    const collections = game.getCollections();
    const discovered = progress.discoveredCount ?? Object.keys(state.progress.discovered).length;
    const explored = collections.filter(c => c.opened > 0).length;
    const active = missions.find(m => m.available && !m.claimed);
    const chapter = options.chapter || active?.chapter || 6;
    const chapterInfo = chapters[chapter - 1];
    const tab = options.tab || 'missions';
    const claimed = missions.filter(m => m.claimed).length;
    const goals = [
      ['Otwarte skrzynki', state.stats.opens, 500, 'box'],
      ['Odkryte warianty skinów', discovered, 180, 'book'],
      ['Poznane kolekcje', explored, 18, 'grid'],
      ['Poziom kolekcjonera', progress.level, 20, 'trophy']
    ];
    const collection = options.collection ? collections.find(c => c.caseId === options.collection) : null;
    let body = '';
    if (tab === 'collections' && collection) {
      const box = cases.find(c => c.id === collection.caseId);
      const albumRule = collection.requiresRare ? 'Komplet tej autorskiej kolekcji wymaga wszystkich przedmiotów z puli, także złotych, jeśli je zawiera.' : 'Komplet tworzą zwykłe skiny z tej skrzynki. Złote przedmioty są dodatkową zdobyczą.';
      body = `<button class="text-button collection-back" data-action="album-back">${icon('back')} Wszystkie kolekcje</button><div class="section-head"><div><p class="eyebrow">ALBUM KOLEKCJONERA</p><h2>${escape(box.name)} <small>${collection.discovered} / ${collection.total} skinów</small></h2><p class="section-subtitle">${albumRule} Fazy Doppler są odrębnymi odkryciami; kolejny stan zużycia lub StatTrak nie zwiększa licznika.</p></div><a class="button secondary small" href="#case/${box.id}">Otwórz tę skrzynkę ${icon('arrow')}</a></div><div class="album-detail-progress">${bar(collection.discovered, collection.total)}<span>${Math.round(collection.percent)}% kolekcji</span></div><div class="content-grid album-skin-grid">${[...box.skins].reverse().map(skin => `<div class="album-skin ${game.isDiscovered(skin.id) ? 'discovered' : 'undiscovered'}"><span class="discovery-badge">${icon(game.isDiscovered(skin.id) ? 'check' : 'lock')}${game.isDiscovered(skin.id) ? 'ODKRYTO' : 'DO ODKRYCIA'}</span>${skinCard(skin)}</div>`).join('')}</div>`;
    } else if (tab === 'collections') {
      body = `<div class="section-head"><div><h2>Album kolekcjonera <small>${collections.filter(c => c.complete).length} / ${collections.length} kompletów</small></h2><p class="section-subtitle">Odkrycia zostają po sprzedaży i ulepszaniu. Oficjalne albumy wymagają zwykłej puli; customy całej zawartości, także złotych przedmiotów.</p></div></div><div class="album-grid">${collections.map(c => {
        const box = cases.find(b => b.id === c.caseId);
        return `<article class="album-card ${c.complete ? 'complete' : ''}"><div class="album-art">${caseImage(c.caseId)}${c.complete ? `<span class="album-medal" title="Kolekcja kompletna">${icon('trophy')}</span>` : ''}</div><span class="micro-label">${escape(box.tierLabel || 'KOLEKCJA')} · POZ. ${box.requiredLevel}</span><h3>${escape(c.name)}</h3><div class="album-progress-label"><span>${c.discovered} / ${c.total} skinów</span><b>${Math.round(c.percent)}%</b></div>${bar(c.discovered, c.total)}<p class="album-reward">Za komplet: <strong>${money(c.cash)}</strong> + ${c.xp} XP</p><div class="album-actions">${button(`Zobacz album ${icon('book')}`, 'album-open', `data-case="${c.caseId}"`, 'small secondary')}${c.complete && !c.claimed ? button(`${icon('gift')} Odbierz`, 'claim-collection', `data-case="${c.caseId}"`, 'small') : c.claimed ? `<span class="reward-claimed">${icon('check')} Odznaka zdobyta</span>` : ''}</div></article>`;
      }).join('')}</div>`;
    } else {
      const chapterMissions = missions.filter(m => m.chapter === chapter);
      body = `<div class="chapter-nav" aria-label="Rozdziały kariery">${chapters.map(([title], i) => {
        const list = missions.filter(m => m.chapter === i + 1);
        const complete = list.every(m => m.claimed);
        const available = list.some(m => m.available);
        return `<button class="chapter-tab ${chapter === i + 1 ? 'active' : ''} ${complete ? 'completed' : ''}" data-action="career-chapter" data-chapter="${i + 1}" aria-pressed="${chapter === i + 1}"><span>${complete ? icon('check') : available ? String(i + 1).padStart(2, '0') : icon('lock')}</span><b>${title}</b><small>${list.filter(m => m.claimed).length} / ${list.length}</small></button>`;
      }).join('')}</div><div class="chapter-heading"><div><p class="eyebrow">ROZDZIAŁ ${String(chapter).padStart(2, '0')}</p><h2>${chapterInfo[0]}</h2><p>${chapterInfo[1]}</p></div><span>${chapterMissions.filter(m => m.claimed).length} / ${chapterMissions.length} misji odebranych</span></div><div class="mission-grid">${chapterMissions.map(m => `<article class="mission-card ${m.claimed ? 'claimed' : m.available && m.completed ? 'ready' : !m.available ? 'locked-mission' : ''}"><div class="mission-status"><span class="mission-symbol">${icon(m.claimed ? 'check' : !m.available ? 'lock' : m.completed ? 'gift' : 'trophy')}</span><span class="micro-label">${m.claimed ? 'UKOŃCZONO' : !m.available ? 'NAJPIERW POPRZEDNI ROZDZIAŁ' : m.completed ? 'NAGRODA CZEKA' : 'W TOKU'}</span></div><h3>${escape(m.title)}</h3><p>${escape(m.description)}</p><div class="mission-progress-label"><span>Postęp</span><strong>${Math.min(m.current, m.target)} / ${m.target}</strong></div>${bar(m.current, m.target)}<div class="mission-footer"><div><span class="micro-label">NAGRODA</span><strong>${money(m.cash)} <small>+ ${m.xp} XP</small></strong></div>${button(m.claimed ? `${icon('check')} Odebrano` : !m.available ? `${icon('lock')} Zablokowano` : m.completed ? 'Odbierz nagrodę' : 'Realizuj cel', m.completed && m.available && !m.claimed ? 'claim-mission' : 'mission-hint', `data-id="${m.id}" ${m.claimed || !m.available ? 'disabled' : ''}`, `small ${m.completed && m.available && !m.claimed ? '' : 'outline'}`)}</div></article>`).join('')}</div><div class="info-banner campaign-hint">${icon('info')}<span>Odbierz trzy nagrody, aby przejść do kolejnego rozdziału. Wcześniejsze otwarcia i odkrycia liczą się także do późniejszych celów. Zakupy i odsprzedawanie tego samego przedmiotu nie dają XP.</span></div>`;
    }
    return `<div class="view-heading career-heading"><div><p class="eyebrow"><span class="dash"></span> OPERACJA: KURATOR</p><h1>Kolekcja, która ma cel.</h1><p>Od pierwszego dropu do rangi Kuratora. Sześć rozdziałów. Osiemnaście zadań. Twój własny dorobek.</p></div>${button(`${icon('trophy')} Statystyki`, 'stats', '', 'small outline')}</div><div class="career-overview"><section class="rank-panel"><div class="rank-emblem">${icon('trophy')}<span>${progress.level}</span></div><div class="rank-details"><span class="micro-label">TWOJA RANGA · POZIOM ${progress.level} / 20</span><h2>${escape(progress.rank)}</h2><p>${progress.level >= 20 ? 'Najwyższy poziom osiągnięty. Dokończ rozdziały, by zamknąć operację.' : `Następny poziom: ${progress.currentXP} / ${progress.neededXP} XP`}</p>${bar(progress.level >= 20 ? 1 : progress.currentXP, progress.level >= 20 ? 1 : progress.neededXP)}<small>${progress.unlockedCases} / ${progress.totalCases} skrzynek odblokowanych · ${claimed} / ${missions.length} misji</small></div></section><section class="ultimate-panel"><div class="ultimate-title"><span class="micro-label">${progress.careerCompleted ? 'OPERACJA UKOŃCZONA' : 'TWÓJ CEL GŁÓWNY'}</span>${icon(progress.careerCompleted ? 'check' : 'star')}</div><h2>${progress.careerCompleted ? 'Kurator. Misja wykonana.' : 'Zostań Kuratorem.'}</h2><div class="ultimate-goals">${goals.map(([label, current, target, glyph]) => `<div><span>${icon(current >= target ? 'check' : glyph)}${label}</span><b>${Math.min(current, target)} <small>/ ${target}</small></b>${bar(current, target)}</div>`).join('')}</div></section></div><div class="career-tabs segmented" aria-label="Widok kariery"><button class="${tab === 'missions' ? 'active' : ''}" data-action="career-tab" data-tab="missions" aria-pressed="${tab === 'missions'}">${icon('trophy')} Rozdziały i misje</button><button class="${tab === 'collections' ? 'active' : ''}" data-action="career-tab" data-tab="collections" aria-pressed="${tab === 'collections'}">${icon('book')} Album kolekcji <span>${discovered}</span></button></div>${body}`;
  }
  return { render, teaser };
})();

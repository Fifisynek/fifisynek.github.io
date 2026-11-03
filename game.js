/* Case Lab — dependency-free game data, economy and durable state. */
(function (root, factory) {
  "use strict";
  const catalog = typeof module === "object" && module.exports ? require("./catalog.js") : root.CaseCatalog;
  const api = factory(catalog);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CaseGame = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (catalog) {
  "use strict";

  const STORAGE_KEY = "case-lab-save-v1";
  const START_BALANCE = 10000;
  const SALE_FEE = 0.10;
  const DAILY_REWARD = 250;
  const WORK_COOLDOWN = 1000;
  const MAX_MONEY = 999999999999;
  const MAX_COUNT = 1000000;
  const MAX_INVENTORY = 10000;
  const RARITIES = {
    milspec: { id: "milspec", label: "Mil-Spec", color: "#4b69ff", chance: 79.92, weight: 79920, rank: 0 },
    restricted: { id: "restricted", label: "Restricted", color: "#8847ff", chance: 15.98, weight: 15980, rank: 1 },
    classified: { id: "classified", label: "Classified", color: "#d32ce6", chance: 3.2, weight: 3200, rank: 2 },
    covert: { id: "covert", label: "Covert", color: "#eb4b4b", chance: 0.64, weight: 640, rank: 3 },
    rare: { id: "rare", label: "Special Rare", color: "#e4ae39", chance: 0.26, weight: 260, rank: 4 }
  };
  const WEARS = [
    { code: "FN", label: "Factory New", min: 0, max: 0.07, multiplier: 1.4 },
    { code: "MW", label: "Minimal Wear", min: 0.07, max: 0.15, multiplier: 1 },
    { code: "FT", label: "Field-Tested", min: 0.15, max: 0.38, multiplier: 0.72 },
    { code: "WW", label: "Well-Worn", min: 0.38, max: 0.45, multiplier: 0.58 },
    { code: "BS", label: "Battle-Scarred", min: 0.45, max: 1.000001, multiplier: 0.44 }
  ];

  if (!catalog || !Array.isArray(catalog.CASES)) throw new Error("Najpierw załaduj katalog skrzynek (catalog.js).");
  const CASES = clone(catalog.CASES);

  const palettes = {
    milspec: ["#7ea4dc", "#263a62"], restricted: ["#ac8de4", "#453465"],
    classified: ["#f28ed9", "#733c7e"], covert: ["#ef9278", "#792e3b"], rare: ["#f7d88a", "#9f6930"]
  };
  const caseIndex = Object.create(null);
  const skinIndex = Object.create(null);
  for (const box of CASES) {
    caseIndex[box.id] = box;
    box.skins.forEach((entry, index) => {
      entry.id = `${box.id}-${index + 1}`;
      entry.caseId = box.id;
      entry.palette = palettes[entry.rarity].slice();
      entry.art = /Gloves|Wraps/.test(entry.weapon) ? "gloves" : /★/.test(entry.weapon) ? "knife" :
        /AWP|SSG|SCAR|G3SG/.test(entry.weapon) ? "sniper" : /AK-|M4|AUG|SG |FAMAS/.test(entry.weapon) ? "rifle" :
        /Nova|MAG|XM|Sawed/.test(entry.weapon) ? "shotgun" : /MAC|MP|PP-|P90/.test(entry.weapon) ? "smg" : "pistol";
      skinIndex[entry.id] = entry;
    });
  }

  function freezeDeep(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.values(value).forEach(freezeDeep);
      Object.freeze(value);
    }
    return value;
  }
  freezeDeep(CASES);
  freezeDeep(RARITIES);
  freezeDeep(WEARS);

  const MAX_LEVEL = 20;
  const OPEN_XP = 25;
  const DISCOVERY_XP = 10;
  const RANKS = ["Rekrut", "Poszukiwacz", "Kolekcjoner", "Specjalista", "Ekspert", "Kurator"];
  const MISSIONS = [
    ["first-open", 1, "Pierwsza skrzynka", "Otwórz swoją pierwszą skrzynkę.", "opens", 1, 200, 25],
    ["first-pages", 1, "Pierwsze strony", "Odkryj 5 różnych skinów.", "discoveries", 5, 200, 30],
    ["getting-started", 1, "Dobry początek", "Otwórz łącznie 10 skrzynek.", "opens", 10, 300, 60],
    ["explorer", 2, "Nowe kierunki", "Otwórz skrzynki z 3 różnych kolekcji.", "collections", 3, 300, 70],
    ["twenty-finishes", 2, "Mały katalog", "Odkryj 20 różnych skinów.", "discoveries", 20, 400, 100],
    ["thirty-five", 2, "Stały bywalec", "Otwórz łącznie 35 skrzynek.", "opens", 35, 400, 120],
    ["six-worlds", 3, "Sześć światów", "Otwórz skrzynki z 6 różnych kolekcji.", "collections", 6, 500, 150],
    ["forty-five", 3, "Pełna gablota", "Odkryj 45 różnych skinów.", "discoveries", 45, 600, 180],
    ["seventy-five", 3, "W swoim żywiole", "Otwórz łącznie 75 skrzynek.", "opens", 75, 600, 200],
    ["ten-worlds", 4, "Dziesięć historii", "Otwórz skrzynki z 10 różnych kolekcji.", "collections", 10, 800, 220],
    ["seventy-five-finishes", 4, "Archiwista", "Odkryj 75 różnych skinów.", "discoveries", 75, 800, 250],
    ["one-fifty", 4, "Doświadczenie", "Otwórz łącznie 150 skrzynek.", "opens", 150, 1000, 300],
    ["fourteen-worlds", 5, "Szerokie horyzonty", "Otwórz skrzynki z 14 różnych kolekcji.", "collections", 14, 1000, 350],
    ["one-ten-finishes", 5, "Żywe archiwum", "Odkryj 110 różnych skinów.", "discoveries", 110, 1200, 400],
    ["three-hundred", 5, "Weteran", "Otwórz łącznie 300 skrzynek.", "opens", 300, 1500, 450],
    ["eighteen-worlds", 6, "Bez granic", "Otwórz skrzynki z 18 różnych kolekcji.", "collections", 18, 1500, 500],
    ["one-eighty-finishes", 6, "Kolekcja z charakterem", "Odkryj 180 różnych skinów.", "discoveries", 180, 2000, 600],
    ["curator", 6, "Tytuł Kuratora", "Osiągnij poziom 20, otwórz 500 skrzynek, odwiedź 18 kolekcji i odkryj 180 skinów.", "ultimate", 4, 2500, 0]
  ].map(([id, chapter, title, description, metric, target, cash, xp]) => ({ id, chapter, title, description, metric, target, cash, xp, ultimate: metric === "ultimate" }));
  freezeDeep(MISSIONS);

  // A finish is one weapon + paint, regardless of wear, StatTrak or source case.
  function finishKey(source) { return `${source.weapon}|${source.name}`; }
  function countDiscoveries(discovered) {
    return new Set(Object.keys(discovered).filter(id => discovered[id] && skinIndex[id]).map(id => finishKey(skinIndex[id]))).size;
  }
  function levelThreshold(level) { return 100 * (level - 1) + 25 * (level - 1) * (level - 1); }
  function itemPrice(source, wear, stattrak = false, variation = 1) {
    const anchor = source.wearValues && integer(source.wearValues[wear.code]) && source.wearValues[wear.code] > 0 ?
      source.wearValues[wear.code] : source.baseValue * wear.multiplier;
    return Math.max(1, Math.round(anchor * variation * (stattrak ? 1.3 : 1)));
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function integer(value, maximum = MAX_MONEY) { return Number.isSafeInteger(value) && value >= 0 && value <= maximum; }
  // Millisecond timestamps already exceed the money cap; validate them independently.
  function timestamp(value) { return integer(value, 8640000000000000); }
  function localDay(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function emptyCounts() { return Object.fromEntries(CASES.map(box => [box.id, 0])); }
  function initialState() {
    return {
      version: 2, balance: START_BALANCE, cases: emptyCounts(), keys: emptyCounts(), inventory: [],
      settings: { sound: true, fast: false },
      stats: { spent: 0, earned: 0, opens: 0, sold: 0, bestDrop: null, workActions: 0, caseOpens: emptyCounts(), rarities: Object.fromEntries(Object.keys(RARITIES).map(id => [id, 0])) },
      progress: { xp: 0, discovered: {}, claimedMissions: [], claimedCollections: [], legacyAccess: [] },
      dailyClaimed: null, lastWork: 0, workCombo: 0, storageWarning: null
    };
  }

  function createGame(options = {}) {
    const clock = typeof options.now === "function" ? options.now : Date.now;
    const rng = typeof options.random === "function" ? options.random : Math.random;
    let storage = options.storage;
    let state = initialState();
    let sequence = 0;
    let writing = false;
    let lastPayload = null;
    const listeners = new Set();

    function now() {
      const value = Number(clock());
      return Number.isFinite(value) && value >= 0 ? value : Date.now();
    }
    function random() {
      const value = Number(rng());
      return Number.isFinite(value) ? Math.min(0.9999999999999999, Math.max(0, value)) : 0.5;
    }
    if (typeof storage === "undefined") {
      try { storage = typeof localStorage !== "undefined" ? localStorage : null; }
      catch (_) { storage = null; }
    }

    function validItem(raw, seen, migrating = false) {
      if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || raw.id.length < 1 || raw.id.length > 100 || seen.has(raw.id)) return null;
      const source = skinIndex[raw.skinId];
      if (!source || source.caseId !== raw.caseId || raw.rarity !== source.rarity || !integer(raw.value) || raw.value < 1) return null;
      if (typeof raw.float !== "number" || !Number.isFinite(raw.float) || raw.float < 0 || raw.float > 1) return null;
      const wearFloat = migrating ? Math.max(source.minFloat, Math.min(source.maxFloat, raw.float)) : raw.float;
      const wear = WEARS.find(entry => wearFloat >= entry.min && wearFloat < entry.max);
      if (!wear || wearFloat < source.minFloat || wearFloat > source.maxFloat || (!migrating && wear.code !== raw.wearCode)) return null;
      const stattrak = Boolean(raw.stattrak) && source.art !== "gloves" && source.weapon !== "Zeus x27";
      seen.add(raw.id);
      return {
        id: raw.id, skinId: source.id, weapon: source.weapon, name: source.name, rarity: source.rarity,
        wear: wear.label, wearCode: wear.code, float: wearFloat, value: migrating ? itemPrice(source, wear, stattrak) : raw.value, caseId: source.caseId,
        stattrak, locked: raw.locked === true,
        createdAt: timestamp(raw.createdAt) ? raw.createdAt : 0,
        art: source.art, palette: source.palette.slice()
      };
    }

    function restore(raw) {
      if (!raw || typeof raw !== "object" || ![1, 2].includes(raw.version)) throw new Error("Nieobsługiwana wersja zapisu.");
      const next = initialState();
      const migrating = raw.version === 1;
      let repaired = false;
      for (const field of ["balance"]) {
        if (integer(raw[field])) next[field] = raw[field]; else repaired = true;
      }
      for (const group of ["cases", "keys"]) {
        for (const box of CASES) {
          if (raw[group] && integer(raw[group][box.id], MAX_COUNT)) next[group][box.id] = raw[group][box.id];
          else if (!migrating || !raw[group] || Object.hasOwn(raw[group], box.id)) repaired = true;
        }
      }
      const seen = new Set();
      if (Array.isArray(raw.inventory)) {
        raw.inventory.slice(0, MAX_INVENTORY).forEach(entry => {
          const item = validItem(entry, seen, migrating);
          if (item) next.inventory.push(item); else repaired = true;
        });
        if (raw.inventory.length > MAX_INVENTORY) repaired = true;
      } else repaired = true;
      for (const setting of ["sound", "fast"]) {
        if (raw.settings && typeof raw.settings[setting] === "boolean") next.settings[setting] = raw.settings[setting];
      }
      if (raw.stats && typeof raw.stats === "object") {
        for (const key of ["spent", "earned", "opens", "sold", "workActions"]) {
          if (integer(raw.stats[key])) next.stats[key] = raw.stats[key]; else if (!(migrating && key === "workActions")) repaired = true;
        }
        for (const box of CASES) {
          if (raw.stats.caseOpens && integer(raw.stats.caseOpens[box.id], MAX_COUNT)) next.stats.caseOpens[box.id] = raw.stats.caseOpens[box.id];
          else if (!migrating) repaired = true;
        }
        for (const rarity of Object.keys(RARITIES)) {
          if (raw.stats.rarities && integer(raw.stats.rarities[rarity], MAX_COUNT)) next.stats.rarities[rarity] = raw.stats.rarities[rarity];
          else if (!migrating) repaired = true;
        }
        if (raw.stats.bestDrop != null) {
          next.stats.bestDrop = validItem(raw.stats.bestDrop, new Set(), migrating);
          if (!next.stats.bestDrop) repaired = true;
        }
      } else repaired = true;
      // The collection itself can restore the best drop if that statistic was damaged.
      for (const item of next.inventory) {
        if (!next.stats.bestDrop || item.value > next.stats.bestDrop.value) next.stats.bestDrop = clone(item);
      }
      if (!migrating && raw.progress && typeof raw.progress === "object") {
        const progress = raw.progress;
        if (integer(progress.xp)) next.progress.xp = progress.xp; else repaired = true;
        if (progress.discovered && typeof progress.discovered === "object" && !Array.isArray(progress.discovered)) {
          for (const [id, value] of Object.entries(progress.discovered)) {
            if (skinIndex[id] && value === true) next.progress.discovered[id] = true; else repaired = true;
          }
        } else repaired = true;
        for (const [field, allowed] of [["claimedMissions", MISSIONS.map(mission => mission.id)], ["claimedCollections", CASES.map(box => box.id)], ["legacyAccess", CASES.map(box => box.id)]]) {
          if (Array.isArray(progress[field])) {
            next.progress[field] = [...new Set(progress[field].filter(id => typeof id === "string" && allowed.includes(id)))];
            if (next.progress[field].length !== progress[field].length) repaired = true;
          } else repaired = true;
        }
      } else if (!migrating) repaired = true;
      // Never forget a finish still present in a valid inventory or the historic best drop.
      const archived = [...next.inventory, ...(next.stats.bestDrop ? [next.stats.bestDrop] : [])];
      for (const item of archived) next.progress.discovered[item.skinId] = true;
      if (migrating) {
        // Existing inventory is verifiable history; historic aggregate counters alone
        // do not award new XP or fake complete collections after this update.
        next.progress.xp = next.inventory.length * OPEN_XP + countDiscoveries(next.progress.discovered) * DISCOVERY_XP;
        next.progress.legacyAccess = CASES.filter(box => next.cases[box.id] || next.keys[box.id]).map(box => box.id);
        for (const item of next.inventory) {
          next.stats.caseOpens[item.caseId] = Math.min(MAX_COUNT, next.stats.caseOpens[item.caseId] + 1);
          next.stats.rarities[item.rarity] = Math.min(MAX_COUNT, next.stats.rarities[item.rarity] + 1);
        }
      }
      if (raw.dailyClaimed === null || (typeof raw.dailyClaimed === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.dailyClaimed))) next.dailyClaimed = raw.dailyClaimed;
      else repaired = true;
      if (timestamp(raw.lastWork)) next.lastWork = raw.lastWork;
      if (integer(raw.workCombo, 16)) next.workCombo = Math.min(9, raw.workCombo);
      if (repaired) next.storageWarning = "Naprawiono uszkodzone dane zapisu. Poprawne przedmioty i postęp zostały zachowane.";
      else if (migrating) next.storageWarning = "Zapis zaktualizowano: zachowano środki i ekwipunek, wyceny dopasowano do nowego rynku. Album odzyskał skiny z ekwipunku i najlepszy historyczny drop; sprzedanych wcześniej skinów nie da się odtworzyć.";
      return next;
    }

    if (storage && typeof storage.getItem === "function") {
      try {
        const saved = storage.getItem(STORAGE_KEY);
        lastPayload = saved == null ? null : saved;
        if (saved != null) state = restore(JSON.parse(saved));
      } catch (_) {
        state = initialState();
        state.storageWarning = "Nie udało się odczytać zapisu. Gra działa z nowym stanem; kolejny ruch utworzy nowy zapis.";
      }
    } else {
      state.storageWarning = "Zapis lokalny jest niedostępny. Postęp pozostanie tylko do zamknięcia tej strony.";
    }

    function save() {
      if (!storage || typeof storage.setItem !== "function") {
        state.storageWarning = "Zapis lokalny jest niedostępny. Postęp pozostanie tylko do zamknięcia tej strony.";
        return;
      }
      try {
        const payload = { ...state, storageWarning: null };
        const serialized = JSON.stringify(payload);
        storage.setItem(STORAGE_KEY, serialized);
        lastPayload = serialized;
        state.storageWarning = null;
      } catch (_) {
        state.storageWarning = "Nie udało się zapisać postępu (pamięć przeglądarki może być pełna). Zachowaj tę kartę otwartą.";
      }
    }
    function notify() {
      for (const listener of listeners) {
        try { listener(clone(state)); } catch (_) { /* A rendering error must not interrupt the economy. */ }
      }
    }
    function fail(error) { return { ok: false, error }; }
    function syncStorage() {
      if (!storage || typeof storage.getItem !== "function") {
        const warning = "Zapis lokalny jest niedostępny. Postęp pozostanie tylko do zamknięcia tej strony.";
        const changed = state.storageWarning !== warning;
        state.storageWarning = warning;
        return { ok: false, changed, error: warning };
      }
      let saved;
      try {
        saved = storage.getItem(STORAGE_KEY);
        if (saved == null) saved = null;
      } catch (_) {
        const warning = "Nie udało się odczytać zapisu. Zachowano bieżący postęp w tej karcie.";
        const changed = state.storageWarning !== warning;
        state.storageWarning = warning;
        return { ok: false, changed, error: warning };
      }
      // An unchanged older payload must not roll back progress after a failed write.
      if (saved === lastPayload) return { ok: true, changed: false };
      lastPayload = saved;
      const previous = JSON.stringify(state);
      try {
        state = saved === null ? initialState() : restore(JSON.parse(saved));
        return { ok: true, changed: JSON.stringify(state) !== previous };
      } catch (_) {
        // Another tab or extension may damage storage; retain this tab's valid state.
        const warning = "Nie udało się odczytać zmienionego zapisu. Zachowano bieżący postęp w tej karcie; kolejny ruch naprawi zapis.";
        const changed = state.storageWarning !== warning;
        state.storageWarning = warning;
        return { ok: false, changed, error: warning };
      }
    }
    function refresh() {
      if (writing) return fail("Poczekaj na zakończenie poprzedniej operacji.");
      const result = syncStorage();
      if (result.changed) notify();
      return result;
    }
    function transaction(callback) {
      if (writing) return fail("Poczekaj na zakończenie poprzedniej operacji.");
      writing = true;
      let result;
      let synchronized;
      try {
        // Every mutation uses the latest shared save, including rejected purchases.
        synchronized = syncStorage();
        result = callback();
        if (result.ok) save();
      } finally { writing = false; }
      if (result.ok || synchronized.changed) notify();
      return result;
    }
    function addStat(key, amount) { state.stats[key] = Math.min(MAX_MONEY, state.stats[key] + amount); }
    function addXP(amount) { state.progress.xp = Math.min(MAX_MONEY, state.progress.xp + amount); }
    function isDiscovered(skinId) {
      const source = skinIndex[skinId];
      if (!source) return false;
      if (state.progress.discovered[skinId]) return true;
      const key = finishKey(source);
      return Object.keys(state.progress.discovered).some(id => skinIndex[id] && finishKey(skinIndex[id]) === key);
    }
    function discover(skinId) {
      const fresh = !isDiscovered(skinId);
      state.progress.discovered[skinId] = true;
      if (fresh) addXP(DISCOVERY_XP);
      return fresh;
    }
    function getProgress() {
      const xp = state.progress.xp;
      let level = 1;
      while (level < MAX_LEVEL && xp >= levelThreshold(level + 1)) level += 1;
      const atMax = level === MAX_LEVEL;
      const currentXP = xp - levelThreshold(level);
      const neededXP = atMax ? 0 : levelThreshold(level + 1) - levelThreshold(level);
      const discovered = countDiscoveries(state.progress.discovered);
      const openedCases = Object.values(state.stats.caseOpens).filter(count => count > 0).length;
      const rankIndex = level === MAX_LEVEL ? 5 : level >= 16 ? 4 : level >= 12 ? 3 : level >= 8 ? 2 : level >= 4 ? 1 : 0;
      return {
        level, maxLevel: MAX_LEVEL, xp, currentXP, neededXP,
        nextLevelXP: atMax ? null : levelThreshold(level + 1), progress: atMax ? 1 : currentXP / neededXP,
        rank: RANKS[rankIndex], totalCases: CASES.length,
        unlockedCases: CASES.filter(box => level >= (box.requiredLevel || 1) || state.progress.legacyAccess.includes(box.id)).length,
        discovered, discoveredCount: discovered, openedCases, exploredCases: openedCases, openCount: state.stats.opens,
        careerCompleted: MISSIONS.every(mission => state.progress.claimedMissions.includes(mission.id))
      };
    }
    function getCaseAccess(caseId) {
      const box = caseIndex[caseId];
      const level = getProgress().level;
      const requiredLevel = box ? box.requiredLevel || 1 : MAX_LEVEL + 1;
      return { unlocked: Boolean(box) && (level >= requiredLevel || state.progress.legacyAccess.includes(caseId)), requiredLevel, level };
    }
    function getCampaign() {
      const progress = getProgress();
      const metrics = { opens: state.stats.opens, discoveries: progress.discovered, collections: progress.openedCases,
        ultimate: Number(progress.level >= MAX_LEVEL) + Number(state.stats.opens >= 500) + Number(progress.discovered >= 180) + Number(progress.openedCases >= 18) };
      return MISSIONS.map(mission => {
        const current = Math.min(mission.target, metrics[mission.metric]);
        const available = mission.chapter === 1 || MISSIONS.filter(previous => previous.chapter < mission.chapter).every(previous => state.progress.claimedMissions.includes(previous.id));
        return { ...mission, current, completed: current >= mission.target, claimed: state.progress.claimedMissions.includes(mission.id), available };
      });
    }
    function getCollections() {
      const finishes = new Set(Object.keys(state.progress.discovered).filter(id => skinIndex[id]).map(id => finishKey(skinIndex[id])));
      return CASES.map(box => {
        const regular = box.skins.filter(source => source.rarity !== "rare");
        const rare = box.skins.filter(source => source.rarity === "rare");
        const discovered = regular.filter(source => finishes.has(finishKey(source))).length;
        return {
          caseId: box.id, name: box.name, discovered, total: regular.length, complete: discovered === regular.length,
          claimed: state.progress.claimedCollections.includes(box.id), percent: Math.round(discovered / regular.length * 100),
          opened: state.stats.caseOpens[box.id], cash: 500, xp: 200,
          rareDiscovered: rare.filter(source => finishes.has(finishKey(source))).length, rareTotal: rare.length
        };
      });
    }
    function claimMission(id) {
      return transaction(() => {
        const mission = getCampaign().find(entry => entry.id === id);
        if (!mission) return fail("Nie znaleziono tego zadania.");
        if (mission.claimed) return fail("Nagroda za to zadanie została już odebrana.");
        if (!mission.available) return fail("Najpierw odbierz nagrody za poprzedni rozdział.");
        if (!mission.completed) return fail("To zadanie nie jest jeszcze ukończone.");
        if (state.balance + mission.cash > MAX_MONEY) return fail("Osiągnięto limit środków na koncie.");
        state.balance += mission.cash;
        addStat("earned", mission.cash);
        addXP(mission.xp);
        state.progress.claimedMissions.push(mission.id);
        return { ok: true, id: mission.id, reward: mission.cash, cash: mission.cash, xp: mission.xp, ultimate: mission.ultimate };
      });
    }
    function claimCollection(caseId) {
      return transaction(() => {
        const collection = getCollections().find(entry => entry.caseId === caseId);
        if (!collection) return fail("Nie znaleziono tej kolekcji.");
        if (collection.claimed) return fail("Medal za tę kolekcję został już odebrany.");
        if (!collection.complete) return fail("Odkryj wszystkie zwykłe skiny z tej kolekcji. Złote dropy są opcjonalne.");
        if (state.balance + collection.cash > MAX_MONEY) return fail("Osiągnięto limit środków na koncie.");
        state.balance += collection.cash;
        addStat("earned", collection.cash);
        addXP(collection.xp);
        state.progress.claimedCollections.push(caseId);
        return { ok: true, caseId, reward: collection.cash, cash: collection.cash, xp: collection.xp };
      });
    }

    function buy(caseId, quantity, kind) {
      return transaction(() => {
        const box = caseIndex[caseId];
        if (!box) return fail("Nie znaleziono tej skrzynki.");
        const access = getCaseAccess(caseId);
        if (!access.unlocked) return fail(`Ta kolekcja odblokuje się na poziomie ${access.requiredLevel}. Zdobywaj XP, otwierając skrzynki i wykonując zadania.`);
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) return fail("Wybierz liczbę od 1 do 999.");
        if (state[kind][caseId] + quantity > MAX_COUNT) return fail("Masz już maksymalną liczbę tych przedmiotów.");
        const total = (kind === "cases" ? box.price : box.keyPrice) * quantity;
        if (state.balance < total) return fail("Za mało środków. Zajrzyj do panelu zarabiania.");
        state.balance -= total;
        state[kind][caseId] += quantity;
        addStat("spent", total);
        return { ok: true, quantity, total, caseId, kind };
      });
    }

    function createItem(box) {
      const draw = random() * 100000;
      let cumulative = 0;
      let rarity = "rare";
      for (const definition of Object.values(RARITIES)) {
        cumulative += definition.weight;
        if (draw < cumulative) { rarity = definition.id; break; }
      }
      const pool = box.skins.filter(entry => entry.rarity === rarity);
      const source = pool[Math.floor(random() * pool.length)];
      const wearFloat = Number((source.minFloat + random() * (source.maxFloat - source.minFloat)).toFixed(6));
      const wear = WEARS.find(entry => wearFloat >= entry.min && wearFloat < entry.max) || WEARS[WEARS.length - 1];
      const stattrak = source.art !== "gloves" && source.weapon !== "Zeus x27" && random() < 0.1;
      const value = itemPrice(source, wear, stattrak, 0.96 + random() * 0.08);
      const timestamp = now();
      sequence += 1;
      let unique;
      try { unique = globalThis.crypto && typeof globalThis.crypto.randomUUID === "function" ? globalThis.crypto.randomUUID() : null; } catch (_) { unique = null; }
      const id = unique || `drop-${timestamp.toString(36)}-${sequence.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      return {
        id, skinId: source.id, weapon: source.weapon, name: source.name, rarity: source.rarity,
        wear: wear.label, wearCode: wear.code, float: wearFloat, value, caseId: box.id,
        stattrak, locked: false, createdAt: timestamp, art: source.art, palette: source.palette.slice()
      };
    }

    function openCase(caseId) {
      return transaction(() => {
        const box = caseIndex[caseId];
        if (!box) return fail("Nie znaleziono tej skrzynki.");
        const access = getCaseAccess(caseId);
        if (!access.unlocked) return fail(`Ta kolekcja odblokuje się na poziomie ${access.requiredLevel}.`);
        if (!state.cases[caseId]) return fail("Najpierw kup tę skrzynkę w sklepie.");
        if (!state.keys[caseId]) return fail("Do otwarcia potrzebujesz pasującego klucza.");
        if (state.inventory.length >= MAX_INVENTORY) return fail("Ekwipunek jest pełny. Sprzedaj kilka przedmiotów.");
        const item = createItem(box);
        state.cases[caseId] -= 1;
        state.keys[caseId] -= 1;
        state.inventory.unshift(item);
        addStat("opens", 1);
        state.stats.caseOpens[box.id] = Math.min(MAX_COUNT, state.stats.caseOpens[box.id] + 1);
        state.stats.rarities[item.rarity] = Math.min(MAX_COUNT, state.stats.rarities[item.rarity] + 1);
        addXP(OPEN_XP);
        const fresh = discover(item.skinId);
        if (!state.stats.bestDrop || item.value > state.stats.bestDrop.value) state.stats.bestDrop = clone(item);
        const xpAwarded = OPEN_XP + (fresh ? DISCOVERY_XP : 0);
        return { ok: true, item: clone(item), discovered: fresh, newDiscovery: fresh, xp: xpAwarded, xpAwarded, level: getProgress().level };
      });
    }

    function saleValue(value) { return integer(value) ? Math.floor(value * 90 / 100) : 0; }
    function sellItems(ids) {
      return transaction(() => {
        if (!Array.isArray(ids) || ids.length < 1 || ids.length > MAX_INVENTORY || ids.some(id => typeof id !== "string")) return fail("Wybierz przedmioty do sprzedaży.");
        const selected = new Set(ids);
        const found = state.inventory.filter(item => selected.has(item.id));
        if (found.length !== selected.size) return fail("Co najmniej jeden przedmiot nie znajduje się już w ekwipunku.");
        if (found.some(item => item.locked)) return fail("Ulubione przedmioty są chronione. Najpierw odznacz gwiazdkę przy przedmiocie.");
        const total = found.reduce((sum, item) => sum + saleValue(item.value), 0);
        if (state.balance + total > MAX_MONEY) return fail("Osiągnięto limit środków na koncie.");
        state.inventory = state.inventory.filter(item => !selected.has(item.id));
        state.balance += total;
        addStat("earned", total);
        addStat("sold", found.length);
        return { ok: true, total, quantity: found.length, ids: [...selected] };
      });
    }
    function setItemLocked(id, locked) {
      return transaction(() => {
        if (typeof locked !== "boolean") return fail("Nieprawidłowe ustawienie ulubionego przedmiotu.");
        const item = state.inventory.find(entry => entry.id === id);
        if (!item) return fail("Ten przedmiot nie znajduje się już w ekwipunku.");
        item.locked = locked;
        return { ok: true, id, locked };
      });
    }

    function getWorkStatus() {
      const timestamp = now();
      const elapsed = timestamp - state.lastWork;
      const continuing = state.workCombo > 0 && elapsed >= 0 && elapsed <= 5000;
      const cooldownMs = continuing ? Math.max(0, WORK_COOLDOWN - elapsed) : 0;
      const combo = continuing ? Math.min(9, state.workCombo + 1) : 1;
      return { ready: cooldownMs === 0, cooldownMs: Math.ceil(cooldownMs), reward: 10 + (combo - 1), combo };
    }
    function work() {
      return transaction(() => {
        const status = getWorkStatus();
        if (!status.ready) return { ...fail("Chwila odpoczynku! Spróbuj ponownie za moment."), cooldownMs: status.cooldownMs };
        if (state.balance + status.reward > MAX_MONEY) return fail("Osiągnięto limit środków na koncie.");
        state.balance += status.reward;
        state.lastWork = now();
        state.workCombo = status.combo;
        addStat("earned", status.reward);
        addStat("workActions", 1);
        return { ok: true, reward: status.reward, combo: status.combo };
      });
    }
    function getDailyStatus() {
      const timestamp = now();
      const date = new Date(timestamp);
      const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      return { available: state.dailyClaimed !== localDay(timestamp), reward: DAILY_REWARD, nextAt: next.getTime() };
    }
    function claimDaily() {
      return transaction(() => {
        if (!getDailyStatus().available) return fail("Dzisiejszy bonus jest już odebrany. Wróć po północy.");
        if (state.balance + DAILY_REWARD > MAX_MONEY) return fail("Osiągnięto limit środków na koncie.");
        state.balance += DAILY_REWARD;
        state.dailyClaimed = localDay(now());
        addStat("earned", DAILY_REWARD);
        return { ok: true, reward: DAILY_REWARD };
      });
    }
    function setSetting(key, value) {
      return transaction(() => {
        if (!["sound", "fast"].includes(key) || typeof value !== "boolean") return fail("Nieprawidłowe ustawienie.");
        state.settings[key] = value;
        return { ok: true, key, value };
      });
    }
    function reset() {
      return transaction(() => {
        state = initialState();
        return { ok: true };
      });
    }

    return Object.freeze({
      getState: () => clone(state),
      refresh,
      subscribe(callback) {
        if (typeof callback !== "function") throw new TypeError("Odbiorca musi być funkcją.");
        listeners.add(callback);
        return () => listeners.delete(callback);
      },
      buyCase: (caseId, quantity = 1) => buy(caseId, quantity, "cases"),
      buyKey: (caseId, quantity = 1) => buy(caseId, quantity, "keys"),
      openCase,
      previewItem(caseId) { return caseIndex[caseId] ? createItem(caseIndex[caseId]) : null; },
      sellItem: id => sellItems([id]), sellItems, saleValue,
      getWorkStatus, work, getDailyStatus, claimDaily, setSetting, reset,
      getProgress, getCaseAccess, getCampaign, claimMission, getCollections, claimCollection,
      setItemLocked, isDiscovered,
      getSkinValue(skinId, wearCode, stattrak = false) {
        const source = skinIndex[skinId];
        const wear = WEARS.find(entry => entry.code === wearCode);
        if (!source || !wear || typeof stattrak !== "boolean") return null;
        if (source.maxFloat <= wear.min || source.minFloat >= wear.max || (source.wearValues && !source.wearValues[wear.code])) return null;
        return itemPrice(source, wear, stattrak && source.art !== "gloves" && source.weapon !== "Zeus x27");
      }
    });
  }

  return Object.freeze({ CASES, RARITIES, WEARS, STORAGE_KEY, START_BALANCE, SALE_FEE, DAILY_REWARD, WORK_COOLDOWN, MAX_LEVEL, OPEN_XP, DISCOVERY_XP, MISSIONS, createGame });
});

/* Case Lab — dependency-free game data, economy and durable state. */
(function (root, factory) {
  "use strict";
  const catalog = typeof module === "object" && module.exports ? require("./catalog.js") : root.CaseCatalog;
  const saveGuard = typeof module === "object" && module.exports ? require("./save-guard.js") : root.SaveGuard;
  const api = factory(catalog, saveGuard);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CaseGame = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (catalog, saveGuard) {
  "use strict";

  const STORAGE_KEY = "case-lab-save-v1";
  const STORAGE_BACKUP_KEY = STORAGE_KEY + ":verified-backup";
  const START_BALANCE = 10000;
  const SALE_FEE = 0.10;
  const DAILY_REWARD = 250;
  const WORK_COOLDOWN = 1000;
  const MAX_MONEY = 999999999999;
  const MAX_COUNT = 1000000;
  const MAX_INVENTORY = 10000;
  const OPEN_QUANTITIES = [1, 2, 3, 5];
  const UPGRADE_HOUSE_EDGE = 0.10;
  const UPGRADE_MAX_CHANCE = 0.75;
  const RARITIES = {
    consumer: { id: "consumer", label: "Consumer", color: "#b0bdcb", chance: 0, weight: 0, rank: -2 },
    industrial: { id: "industrial", label: "Industrial", color: "#7baecb", chance: 0, weight: 0, rank: -1 },
    milspec: { id: "milspec", label: "Mil-Spec", color: "#4b69ff", chance: 79.92, weight: 79920, rank: 0 },
    restricted: { id: "restricted", label: "Restricted", color: "#8847ff", chance: 15.98, weight: 15980, rank: 1 },
    classified: { id: "classified", label: "Classified", color: "#d32ce6", chance: 3.2, weight: 3200, rank: 2 },
    covert: { id: "covert", label: "Covert", color: "#eb4b4b", chance: 0.64, weight: 640, rank: 3 },
    rare: { id: "rare", label: "Special Rare", color: "#e4ae39", chance: 0.26, weight: 260, rank: 4 },
    contraband: { id: "contraband", label: "Contraband", color: "#e4ae39", chance: 0, weight: 0, rank: 5 }
  };
  const WEARS = [
    { code: "FN", label: "Factory New", min: 0, max: 0.07, multiplier: 1.4 },
    { code: "MW", label: "Minimal Wear", min: 0.07, max: 0.15, multiplier: 1 },
    { code: "FT", label: "Field-Tested", min: 0.15, max: 0.38, multiplier: 0.72 },
    { code: "WW", label: "Well-Worn", min: 0.38, max: 0.45, multiplier: 0.58 },
    { code: "BS", label: "Battle-Scarred", min: 0.45, max: 1.000001, multiplier: 0.44 },
    { code: "NW", label: "Bez zużycia", min: 0, max: 1, multiplier: 1 }
  ];

  if (!catalog || !Array.isArray(catalog.CASES)) throw new Error("Najpierw załaduj katalog skrzynek (catalog.js).");
  if (!saveGuard || typeof saveGuard.createGuard !== "function") throw new Error("Najpierw załaduj ochronę zapisu (save-guard.js).");
  const CASES = clone(catalog.CASES);

  const palettes = {
    consumer: ["#b0bdcb", "#384554"], industrial: ["#7baecb", "#284253"],
    milspec: ["#7ea4dc", "#263a62"], restricted: ["#ac8de4", "#453465"],
    classified: ["#f28ed9", "#733c7e"], covert: ["#ef9278", "#792e3b"], rare: ["#f7d88a", "#9f6930"], contraband: ["#f7d88a", "#9f6930"]
  };
  const caseIndex = Object.create(null);
  const skinIndex = Object.create(null);
  const canonicalIndex = Object.create(null);
  function decorateSkin(entry, id, caseId) {
    entry.id = id;
    entry.caseId = caseId;
    entry.palette = (palettes[entry.rarity] || palettes.milspec).slice();
    entry.art = /Gloves|Wraps/.test(entry.weapon) ? "gloves" : /★/.test(entry.weapon) || entry.rarity === "rare" ? "knife" :
      /AWP|SSG|SCAR|G3SG/.test(entry.weapon) ? "sniper" : /AK-|M4|AUG|SG |FAMAS/.test(entry.weapon) ? "rifle" :
      /Nova|MAG|XM|Sawed/.test(entry.weapon) ? "shotgun" : /MAC|MP|PP-|P90/.test(entry.weapon) ? "smg" : "pistol";
    return entry;
  }
  for (const raw of catalog.ALL_SKINS || []) {
    const entry = clone(raw);
    const id = entry.sourceId || entry.id;
    if (typeof id === "string" && !canonicalIndex[id]) canonicalIndex[id] = decorateSkin(entry, id, "catalog");
  }
  for (const box of CASES) {
    caseIndex[box.id] = box;
    box.skins.forEach((entry, index) => {
      decorateSkin(entry, `${box.id}-${index + 1}`, box.id);
      skinIndex[entry.id] = entry;
      const canonicalId = entry.sourceId || entry.id;
      if (!canonicalIndex[canonicalId]) canonicalIndex[canonicalId] = decorateSkin(clone(entry), canonicalId, "catalog");
    });
  }
  const SKINS = Object.values(canonicalIndex);
  for (const entry of SKINS) skinIndex[entry.id] = entry;

  // Official cases share rarity odds. Curated cases declare exact per-item weights.
  // Both the visible percentages and the random draw use this same normalized table.
  const dropTables = Object.create(null);
  for (const box of CASES) {
    let entries;
    if (Array.isArray(box.dropTable)) {
      entries = box.dropTable.map(row => {
        const source = Number.isSafeInteger(row.index) ? box.skins[row.index] : box.skins.find(skin => skin.id === row.skinId || skin.sourceId === row.skinId);
        return source && Number.isFinite(row.weight) && row.weight > 0 ? { skinId: source.id, weight: row.weight, rarity: source.rarity } : null;
      }).filter(Boolean);
    } else if (box.skins.some(source => Number.isFinite(source.dropWeight) && source.dropWeight > 0)) {
      entries = box.skins.filter(source => Number.isFinite(source.dropWeight) && source.dropWeight > 0)
        .map(source => ({ skinId: source.id, weight: source.dropWeight, rarity: source.rarity }));
    } else {
      const available = Object.values(RARITIES).filter(rarity => rarity.weight > 0 && box.skins.some(skin => skin.rarity === rarity.id));
      entries = available.flatMap(rarity => {
        const pool = box.skins.filter(source => source.rarity === rarity.id);
        return pool.map(source => ({ skinId: source.id, weight: rarity.weight / pool.length, rarity: source.rarity }));
      });
    }
    if (!entries.length) throw new Error(`Skrzynka ${box.id} nie ma poprawnej tabeli dropów.`);
    const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
    dropTables[box.id] = entries.map(entry => ({ ...entry, chance: entry.weight / total }));
  }
  function getDropChances(caseId) { return dropTables[caseId] ? clone(dropTables[caseId]) : []; }
  function getRarityChances(caseId) {
    const chances = Object.fromEntries(Object.keys(RARITIES).map(id => [id, 0]));
    for (const entry of dropTables[caseId] || []) chances[entry.rarity] += entry.chance;
    return chances;
  }

  function freezeDeep(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.values(value).forEach(freezeDeep);
      Object.freeze(value);
    }
    return value;
  }
  freezeDeep(CASES);
  freezeDeep(SKINS);
  freezeDeep(dropTables);
  freezeDeep(OPEN_QUANTITIES);
  freezeDeep(RARITIES);
  freezeDeep(WEARS);

  const MAX_LEVEL = 20;
  const OPEN_XP = 25;
  const DISCOVERY_XP = 10;
  function getOpeningXP(caseId) {
    const box = caseIndex[caseId];
    if (!box) return { openXP: 0, discoveryXP: 0 };
    const scale = Math.min(1, (box.price + box.keyPrice) / 249);
    return { openXP: Math.max(1, Math.floor(OPEN_XP * scale)), discoveryXP: Math.max(1, Math.floor(DISCOVERY_XP * scale)) };
  }
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
  function finishKey(source) { return `${source.weapon}|${source.name}|${source.phase || ""}`; }
  function countDiscoveries(discovered) {
    return new Set(Object.keys(discovered).filter(id => discovered[id] && skinIndex[id]).map(id => finishKey(skinIndex[id]))).size;
  }
  function levelThreshold(level) { return 100 * (level - 1) + 25 * (level - 1) * (level - 1); }
  function itemPrice(source, wear, stattrak = false, variation = 1) {
    const anchor = source.wearValues && integer(source.wearValues[wear.code]) && source.wearValues[wear.code] > 0 ?
      source.wearValues[wear.code] : source.baseValue * wear.multiplier;
    return Math.max(1, Math.round(anchor * variation * (stattrak ? 1.3 : 1)));
  }
  function supportsStatTrak(source) { return source.stattrak !== false && source.art !== "gloves" && source.weapon !== "Zeus x27"; }
  function availableWear(source, code) {
    const wear = WEARS.find(entry => entry.code === code);
    if (!wear || Boolean(source.noWear) !== (code === "NW")) return null;
    if (!source.noWear && (source.maxFloat <= wear.min || source.minFloat >= wear.max)) return null;
    if (source.wearValues && (!integer(source.wearValues[code]) || source.wearValues[code] < 1)) return null;
    return wear;
  }
  function wearAt(source, wearFloat) {
    return source.noWear ? WEARS.find(wear => wear.code === "NW") : WEARS.find(wear => wear.code !== "NW" && wearFloat >= wear.min && wearFloat < wear.max);
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
      version: 3, balance: START_BALANCE, cases: emptyCounts(), keys: emptyCounts(), inventory: [],
      settings: { sound: true, fast: false },
      stats: { spent: 0, earned: 0, opens: 0, sold: 0, bestDrop: null, workActions: 0, upgradeAttempts: 0, upgradeWins: 0, upgradeLostValue: 0, caseOpens: emptyCounts(), rarities: Object.fromEntries(Object.keys(RARITIES).map(id => [id, 0])) },
      progress: { xp: 0, discovered: {}, claimedMissions: [], claimedCollections: [], legacyAccess: [] },
      dailyClaimed: null, lastWork: 0, workCombo: 0, lastUpgrade: null, storageWarning: null
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
    const guard = saveGuard.createGuard(storage, STORAGE_KEY);

    function validItem(raw, seen, migrating = false) {
      if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || raw.id.length < 1 || raw.id.length > 100 || seen.has(raw.id)) return null;
      const source = skinIndex[raw.skinId];
      if (!source || source.caseId !== raw.caseId || raw.rarity !== source.rarity || !integer(raw.value) || raw.value < 1) return null;
      if (typeof raw.float !== "number" || !Number.isFinite(raw.float) || raw.float < 0 || raw.float > 1) return null;
      const wearFloat = source.noWear ? 0 : migrating ? Math.max(source.minFloat, Math.min(source.maxFloat, raw.float)) : raw.float;
      const wear = wearAt(source, wearFloat);
      if (!wear || !availableWear(source, wear.code) || wearFloat < source.minFloat || wearFloat > source.maxFloat || (!migrating && wear.code !== raw.wearCode)) return null;
      const stattrak = Boolean(raw.stattrak) && supportsStatTrak(source);
      seen.add(raw.id);
      return {
        id: raw.id, skinId: source.id, weapon: source.weapon, name: source.name, rarity: source.rarity,
        wear: wear.label, wearCode: wear.code, float: wearFloat, value: migrating ? itemPrice(source, wear, stattrak) : raw.value, caseId: source.caseId,
        stattrak, locked: raw.locked === true, catalogId: source.sourceId || source.id,
        phase: source.phase || null, displayName: source.displayName || source.name, noWear: Boolean(source.noWear),
        createdAt: timestamp(raw.createdAt) ? raw.createdAt : 0,
        art: source.art, palette: source.palette.slice()
      };
    }

    function restore(raw) {
      if (!raw || typeof raw !== "object" || ![1, 2, 3].includes(raw.version)) throw new Error("Nieobsługiwana wersja zapisu.");
      const next = initialState();
      const migrating = raw.version === 1;
      const expanded = raw.version < 3;
      let repaired = false;
      let walletRepaired = false;
      for (const field of ["balance"]) {
        if (integer(raw[field])) next[field] = raw[field]; else repaired = true;
      }
      for (const group of ["cases", "keys"]) {
        for (const box of CASES) {
          if (raw[group] && integer(raw[group][box.id], MAX_COUNT)) next[group][box.id] = raw[group][box.id];
          else if (!raw[group] || Object.hasOwn(raw[group], box.id) || !expanded) repaired = true;
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
        for (const key of ["spent", "earned", "opens", "sold", "workActions", "upgradeAttempts", "upgradeWins", "upgradeLostValue"]) {
          if (integer(raw.stats[key])) next.stats[key] = raw.stats[key];
          else if (!((migrating && key === "workActions") || (expanded && key.startsWith("upgrade")))) repaired = true;
        }
        for (const box of CASES) {
          if (raw.stats.caseOpens && integer(raw.stats.caseOpens[box.id], MAX_COUNT)) next.stats.caseOpens[box.id] = raw.stats.caseOpens[box.id];
          else if (!expanded || (raw.stats.caseOpens && Object.hasOwn(raw.stats.caseOpens, box.id))) repaired = true;
        }
        for (const rarity of Object.keys(RARITIES)) {
          if (raw.stats.rarities && integer(raw.stats.rarities[rarity], MAX_COUNT)) next.stats.rarities[rarity] = raw.stats.rarities[rarity];
          else if (!expanded || (raw.stats.rarities && Object.hasOwn(raw.stats.rarities, rarity))) repaired = true;
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
          if (Object.hasOwn(next.stats.caseOpens, item.caseId)) next.stats.caseOpens[item.caseId] = Math.min(MAX_COUNT, next.stats.caseOpens[item.caseId] + 1);
          next.stats.rarities[item.rarity] = Math.min(MAX_COUNT, next.stats.rarities[item.rarity] + 1);
        }
      }
      if (raw.dailyClaimed === null || (typeof raw.dailyClaimed === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.dailyClaimed))) next.dailyClaimed = raw.dailyClaimed;
      else repaired = true;
      if (timestamp(raw.lastWork)) next.lastWork = raw.lastWork;
      if (integer(raw.workCombo, 16)) next.workCombo = Math.min(9, raw.workCombo);
      if (raw.lastUpgrade && typeof raw.lastUpgrade === "object") {
        const record = raw.lastUpgrade;
        const source = skinIndex[record.targetSkinId];
        const item = record.item ? validItem(record.item, new Set()) : null;
        if (source && availableWear(source, record.wearCode) && typeof record.won === "boolean" &&
            Number.isFinite(record.chance) && record.chance > 0 && record.chance <= UPGRADE_MAX_CHANCE &&
            integer(record.inputValue) && record.inputValue > 0 && integer(record.targetValue) && record.targetValue > 0 &&
            timestamp(record.createdAt) && (record.won ? Boolean(item) : !record.item)) {
          next.lastUpgrade = { won: record.won, item, chance: record.chance, inputValue: record.inputValue, targetValue: record.targetValue,
            targetSkinId: source.id, wearCode: record.wearCode, createdAt: record.createdAt };
        } else repaired = true;
      }
      // Every legitimate credit (including sales) and debit has been recorded in
      // these counters since v1. Repair edits made before integrity was installed.
      // Saturated or damaged counters cannot reliably reconstruct historic cash.
      if (raw.stats && integer(raw.stats.earned) && integer(raw.stats.spent) &&
          raw.stats.earned < MAX_MONEY && raw.stats.spent < MAX_MONEY) {
        const accountedBalance = Math.max(0, Math.min(MAX_MONEY, START_BALANCE + raw.stats.earned - raw.stats.spent));
        if (next.balance !== accountedBalance) {
          next.balance = accountedBalance;
          walletRepaired = true;
        }
      }
      if (walletRepaired) next.storageWarning = "Saldo nie zgadzało się z historią zarobków i wydatków. Przywrócono poprawną kwotę; ekwipunek i postęp zostały zachowane.";
      else if (repaired) next.storageWarning = "Naprawiono uszkodzone dane zapisu. Poprawne przedmioty i postęp zostały zachowane.";
      else if (migrating) next.storageWarning = "Zapis zaktualizowano: zachowano środki i ekwipunek, wyceny dopasowano do nowego rynku. Album odzyskał skiny z ekwipunku i najlepszy historyczny drop; sprzedanych wcześniej skinów nie da się odtworzyć.";
      return next;
    }

    const recoveryWarning = "Wykryto zmieniony lub uszkodzony zapis. Przywrócono ostatni poprawny stan; saldo, ekwipunek i postęp są zachowane.";
    const initialRead = guard.read();
    let sealOnStartup = false;
    lastPayload = initialRead.payload;
    if (initialRead.kind === "valid" || initialRead.kind === "legacy") {
      try {
        state = restore(initialRead.raw);
        sealOnStartup = initialRead.kind === "legacy" || initialRead.recovered;
        if (initialRead.recovered) state.storageWarning = recoveryWarning;
        else if (initialRead.error) state.storageWarning = initialRead.error;
      } catch (_) {
        state.storageWarning = "Nie udało się odczytać zapisu. Gra działa z nowym stanem; kolejny ruch utworzy nowy zapis.";
      }
    } else if (initialRead.kind === "empty") {
      // Protect a fresh account immediately, before its first purchase or click.
      sealOnStartup = true;
    } else {
      state.storageWarning = initialRead.kind === "invalid" ?
        "Zapis został zmieniony lub uszkodzony i nie ma poprawnej kopii zapasowej. Zachowano pliki zapisu; bieżąca gra rozpoczyna się od nowa." :
        "Zapis lokalny jest niedostępny. Postęp pozostanie tylko do zamknięcia tej strony.";
    }

    function save(preserveWarning = false) {
      const previousWarning = preserveWarning ? state.storageWarning : null;
      const result = guard.write(state);
      if (result.ok) {
        lastPayload = result.payload;
        state.storageWarning = previousWarning || (result.backupOk ? null : result.error);
      } else {
        state.storageWarning = result.error || "Nie udało się zapisać postępu. Zachowaj tę kartę otwartą.";
      }
      return result;
    }
    function notify() {
      for (const listener of listeners) {
        try { listener(clone(state)); } catch (_) { /* A rendering error must not interrupt the economy. */ }
      }
    }
    function fail(error) { return { ok: false, error }; }
    function syncStorage() {
      const previous = JSON.stringify(state);
      const observed = guard.read();
      const accepted = observed.kind === "valid" || observed.kind === "legacy";
      if (accepted) {
        // Retain unsaved in-memory progress when a full disk still contains the
        // previous payload. A repeated invalid blob is never an accepted read.
        if (observed.payload !== lastPayload) {
          try { state = restore(observed.raw); lastPayload = observed.payload; }
          catch (_) {
            state.storageWarning = "Nie udało się odczytać zmienionego zapisu. Zachowano bieżący postęp w tej karcie.";
            return { ok: false, changed: JSON.stringify(state) !== previous, error: state.storageWarning };
          }
        }
        if (observed.recovered) {
          state.storageWarning = recoveryWarning;
          return { ok: false, changed: JSON.stringify(state) !== previous, error: recoveryWarning };
        }
        if (observed.error) state.storageWarning = observed.error;
        return { ok: true, changed: JSON.stringify(state) !== previous };
      }
      if (observed.kind === "empty") return { ok: true, changed: false };
      // Missing, stripped or corrupt protected data cannot replace live state.
      state.storageWarning = observed.kind === "invalid" ? recoveryWarning :
        "Nie udało się odczytać zapisu. Zachowano bieżący postęp w tej karcie.";
      return { ok: false, changed: JSON.stringify(state) !== previous, error: state.storageWarning };
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
    function discover(skinId, xp = DISCOVERY_XP) {
      const fresh = !isDiscovered(skinId);
      state.progress.discovered[skinId] = true;
      if (fresh && xp > 0) addXP(xp);
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
        // A knives-only custom collection still needs actual discoveries to earn a medal.
        const required = box.isCustom || box.category === "custom" || !regular.length ? box.skins : regular;
        const discovered = required.filter(source => finishes.has(finishKey(source))).length;
        return {
          caseId: box.id, name: box.name, discovered, total: required.length, complete: required.length > 0 && discovered === required.length,
          claimed: state.progress.claimedCollections.includes(box.id), percent: required.length ? Math.round(discovered / required.length * 100) : 0,
          requiresRare: box.isCustom || box.category === "custom" || !regular.length,
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
        if (!collection.complete) return fail(collection.requiresRare ? "Odkryj wszystkie skiny tej kolekcji specjalnej." : "Odkryj wszystkie zwykłe skiny z tej kolekcji. Złote dropy są opcjonalne.");
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

    function drawSource(box) {
      if (Array.isArray(box.dropTable) || box.skins.some(source => Number.isFinite(source.dropWeight) && source.dropWeight > 0)) {
        const table = dropTables[box.id];
        const total = table.reduce((sum, row) => sum + row.weight, 0);
        const draw = random() * total;
        let cumulative = 0;
        for (const row of table) {
          cumulative += row.weight;
          if (draw < cumulative) return skinIndex[row.skinId];
        }
        return skinIndex[table[table.length - 1].skinId];
      }
      const available = Object.values(RARITIES).filter(definition => definition.weight > 0 && box.skins.some(source => source.rarity === definition.id));
      const draw = random() * available.reduce((sum, definition) => sum + definition.weight, 0);
      let cumulative = 0;
      let rarity = available[available.length - 1].id;
      for (const definition of available) {
        cumulative += definition.weight;
        if (draw < cumulative) { rarity = definition.id; break; }
      }
      const pool = box.skins.filter(entry => entry.rarity === rarity);
      return pool[Math.floor(random() * pool.length)];
    }
    function randomFloat(minimum, maximum) {
      if (minimum >= maximum) return minimum;
      // Avoid rounding onto an adjacent condition, especially float-capped finishes.
      const value = minimum + random() * (maximum - minimum);
      const rounded = Math.floor(value * 1000000) / 1000000;
      return Math.max(minimum, Math.min(maximum - Number.EPSILON, rounded));
    }
    function itemFromSource(source, wearCode = null, exactValue = null) {
      const requestedWear = wearCode ? availableWear(source, wearCode) : null;
      const wearFloat = source.noWear ? 0 : requestedWear ?
        randomFloat(Math.max(source.minFloat, requestedWear.min), Math.min(source.maxFloat, requestedWear.max, 1)) :
        randomFloat(source.minFloat, source.maxFloat);
      const wear = requestedWear || wearAt(source, wearFloat);
      const stattrak = exactValue === null && supportsStatTrak(source) && random() < 0.1;
      const value = exactValue === null ? itemPrice(source, wear, stattrak, 0.96 + random() * 0.08) : exactValue;
      const timestamp = now();
      sequence += 1;
      let unique;
      try { unique = globalThis.crypto && typeof globalThis.crypto.randomUUID === "function" ? globalThis.crypto.randomUUID() : null; } catch (_) { unique = null; }
      const id = unique || `drop-${timestamp.toString(36)}-${sequence.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      return {
        id, skinId: source.id, weapon: source.weapon, name: source.name, rarity: source.rarity,
        wear: wear.label, wearCode: wear.code, float: wearFloat, value, caseId: source.caseId,
        stattrak, locked: false, catalogId: source.sourceId || source.id, noWear: Boolean(source.noWear),
        phase: source.phase || null, displayName: source.displayName || source.name,
        createdAt: timestamp, art: source.art, palette: source.palette.slice()
      };
    }
    function createItem(box) { return itemFromSource(drawSource(box)); }

    function openCases(caseId, quantity = 1) {
      return transaction(() => {
        const box = caseIndex[caseId];
        if (!box) return fail("Nie znaleziono tej skrzynki.");
        if (!OPEN_QUANTITIES.includes(quantity)) return fail("Wybierz otwarcie 1, 2, 3 lub 5 skrzynek naraz.");
        const access = getCaseAccess(caseId);
        if (!access.unlocked) return fail(`Ta kolekcja odblokuje się na poziomie ${access.requiredLevel}.`);
        if (state.cases[caseId] < quantity) return fail(`Potrzebujesz ${quantity} pasujących skrzynek. Kup brakujące w sklepie.`);
        if (state.keys[caseId] < quantity) return fail(`Potrzebujesz ${quantity} pasujących kluczy do tych skrzynek.`);
        if (state.inventory.length + quantity > MAX_INVENTORY) return fail("Ekwipunek jest pełny. Sprzedaj kilka przedmiotów.");
        const items = Array.from({ length: quantity }, () => createItem(box));
        const openingXP = getOpeningXP(caseId);
        state.cases[caseId] -= quantity;
        state.keys[caseId] -= quantity;
        state.inventory.unshift(...items);
        addStat("opens", quantity);
        state.stats.caseOpens[box.id] = Math.min(MAX_COUNT, state.stats.caseOpens[box.id] + quantity);
        const rewards = items.map(item => {
          state.stats.rarities[item.rarity] = Math.min(MAX_COUNT, state.stats.rarities[item.rarity] + 1);
          addXP(openingXP.openXP);
          const fresh = discover(item.skinId, openingXP.discoveryXP);
          if (!state.stats.bestDrop || item.value > state.stats.bestDrop.value) state.stats.bestDrop = clone(item);
          return { item: clone(item), discovered: fresh, newDiscovery: fresh, xpAwarded: openingXP.openXP + (fresh ? openingXP.discoveryXP : 0) };
        });
        return { ok: true, items: clone(items), rewards, quantity,
          totalValue: items.reduce((sum, item) => sum + item.value, 0),
          xpAwarded: rewards.reduce((sum, reward) => sum + reward.xpAwarded, 0), level: getProgress().level };
      });
    }
    function openCase(caseId) {
      const result = openCases(caseId, 1);
      if (!result.ok) return result;
      const reward = result.rewards[0];
      return { ...result, ...reward, xp: reward.xpAwarded };
    }

    function buildUpgradeQuote(ids, targetSkinId, wearCode) {
      if (!Array.isArray(ids) || ids.length < 1 || ids.length > 5 || ids.some(id => typeof id !== "string")) return fail("Wybierz od 1 do 5 skinów do ulepszenia.");
      const selected = new Set(ids);
      if (selected.size !== ids.length) return fail("Każdy skin można dodać do ulepszenia tylko raz.");
      const inputs = state.inventory.filter(item => selected.has(item.id));
      if (inputs.length !== selected.size) return fail("Co najmniej jeden wybrany skin nie znajduje się już w ekwipunku.");
      if (inputs.some(item => item.locked)) return fail("Ulubione skiny są chronione. Najpierw odznacz gwiazdkę przy przedmiocie.");
      const source = skinIndex[targetSkinId];
      if (!source) return fail("Wybierz docelowy skin z katalogu.");
      const wear = availableWear(source, wearCode);
      if (!wear) return fail("Ten skin nie występuje w wybranym stanie zużycia.");
      const inputValue = inputs.reduce((sum, item) => sum + item.value, 0);
      const targetValue = itemPrice(source, wear, false);
      if (!integer(targetValue) || targetValue < Math.ceil(inputValue * 1.05)) return fail("Docelowy skin musi być wart co najmniej 105% łącznej wartości wkładu.");
      const chance = Math.min(UPGRADE_MAX_CHANCE, inputValue / targetValue * (1 - UPGRADE_HOUSE_EDGE));
      const canonicalId = source.sourceId && canonicalIndex[source.sourceId] ? source.sourceId : source.id;
      const canonical = skinIndex[canonicalId];
      const target = { ...clone(canonical), value: targetValue, wear: wear.label, wearCode: wear.code, stattrak: false, catalogId: source.sourceId || source.id };
      return { ok: true, ids: [...ids], inputValue, targetValue, chance, multiplier: targetValue / inputValue,
        houseEdge: UPGRADE_HOUSE_EDGE, maxChance: UPGRADE_MAX_CHANCE, targetSkinId: canonicalId,
        wearCode: wear.code, target, inputs: clone(inputs) };
    }
    function quoteUpgrade(ids, targetSkinId, wearCode) {
      if (writing) return fail("Poczekaj na zakończenie poprzedniej operacji.");
      refresh();
      return buildUpgradeQuote(ids, targetSkinId, wearCode);
    }
    function upgrade(ids, targetSkinId, wearCode) {
      return transaction(() => {
        // Recalculate from the shared save. A stale quote never spends missing or locked skins.
        const quote = buildUpgradeQuote(ids, targetSkinId, wearCode);
        if (!quote.ok) return quote;
        const roll = random();
        const won = roll < quote.chance;
        const item = won ? itemFromSource(skinIndex[quote.targetSkinId], quote.wearCode, quote.targetValue) : null;
        const selected = new Set(quote.ids);
        state.inventory = state.inventory.filter(input => !selected.has(input.id));
        addStat("upgradeAttempts", 1);
        let fresh = false;
        if (won) {
          state.inventory.unshift(item);
          addStat("upgradeWins", 1);
          fresh = discover(item.skinId, 0);
          if (!state.stats.bestDrop || item.value > state.stats.bestDrop.value) state.stats.bestDrop = clone(item);
        } else addStat("upgradeLostValue", quote.inputValue);
        state.lastUpgrade = { won, item: item ? clone(item) : null, chance: quote.chance, inputValue: quote.inputValue,
          targetValue: quote.targetValue, targetSkinId: quote.targetSkinId, wearCode: quote.wearCode, createdAt: now() };
        return { ...quote, won, roll, item: item ? clone(item) : null, newDiscovery: fresh,
          xpAwarded: 0, quantity: quote.ids.length, level: getProgress().level };
      });
    }

    function getResources() {
      return {
        cases: CASES.filter(box => state.cases[box.id] > 0).map(box => ({ caseId: box.id, count: state.cases[box.id], name: box.name, image: box.image || null })),
        keys: CASES.filter(box => state.keys[box.id] > 0).map(box => ({ caseId: box.id, count: state.keys[box.id], name: `Klucz · ${box.name}`, image: box.keyImage || null })),
        totalCases: Object.values(state.cases).reduce((sum, count) => sum + count, 0),
        totalKeys: Object.values(state.keys).reduce((sum, count) => sum + count, 0)
      };
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

    if (sealOnStartup) save(true);

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
      openCase, openCases,
      previewItem(caseId) { return caseIndex[caseId] ? createItem(caseIndex[caseId]) : null; },
      sellItem: id => sellItems([id]), sellItems, saleValue,
      getWorkStatus, work, getDailyStatus, claimDaily, setSetting, reset,
      getProgress, getCaseAccess, getCampaign, claimMission, getCollections, claimCollection,
      setItemLocked, isDiscovered, quoteUpgrade, upgrade, getResources, getDropChances, getRarityChances, getOpeningXP,
      getSkinValue(skinId, wearCode, stattrak = false) {
        const source = skinIndex[skinId];
        const wear = source && availableWear(source, wearCode);
        if (!source || !wear || typeof stattrak !== "boolean") return null;
        return itemPrice(source, wear, stattrak && supportsStatTrak(source));
      }
    });
  }

  return Object.freeze({ CASES, SKINS, RARITIES, WEARS, STORAGE_KEY, STORAGE_BACKUP_KEY, START_BALANCE, SALE_FEE, DAILY_REWARD, WORK_COOLDOWN, MAX_LEVEL, MAX_INVENTORY,
    OPEN_XP, DISCOVERY_XP, MISSIONS, OPEN_QUANTITIES, UPGRADE_HOUSE_EDGE, UPGRADE_MAX_CHANCE, getDropChances, getRarityChances, getOpeningXP, createGame });
});

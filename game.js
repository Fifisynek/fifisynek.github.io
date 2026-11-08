/* Case Lab — dependency-free game data, economy and durable state. */
(function (root, factory) {
  "use strict";
  const catalog = typeof module === "object" && module.exports ? require("./catalog.js") : root.CaseCatalog;
  const saveGuard = typeof module === "object" && module.exports ? require("./save-guard.js") : root.SaveGuard;
  const patterns = typeof module === "object" && module.exports ? require("./patterns.js") : root.CasePatterns;
  const api = factory(catalog, saveGuard, patterns);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CaseGame = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (catalog, saveGuard, patterns) {
  "use strict";

  const STORAGE_KEY = "case-lab-save-v1";
  const STORAGE_BACKUP_KEY = STORAGE_KEY + ":verified-backup";
  const START_BALANCE = 10000;
  const ECONOMY_VERSION = 2;
  const SALE_FEE = 0.10;
  const DAILY_REWARD = 250;
  const WORK_COOLDOWN = 1000;
  const MAX_MONEY = 999999999999;
  const MAX_COUNT = 1000000;
  const MAX_INVENTORY = 10000;
  const OPEN_QUANTITIES = [1, 2, 3, 5];
  const UPGRADE_HOUSE_EDGE = 0.10;
  const UPGRADE_MAX_CHANCE = 0.75;
  const HISTORY_LIMIT = 200;
  const SHOWCASE_SLOTS = [
    { id: "ak", label: "AK-47" }, { id: "m4", label: "M4A4 / M4A1-S" }, { id: "awp", label: "AWP" },
    { id: "usp", label: "USP-S / P2000" }, { id: "glock", label: "Glock-18" }, { id: "deagle", label: "Desert Eagle" },
    { id: "knife", label: "Nóż" }, { id: "gloves", label: "Rękawice" }, { id: "featured", label: "Twoja perełka" }
  ];
  const SHOWCASE_THEMES = ["carbon", "aurora", "ice", "gold"];
  const WEEKLY_IDS = ["weekly-open", "weekly-visit", "weekly-discover", "weekly-variety"];
  const PISTOL_FAMILIES = {
    "USP-S": "usp", "P2000": "usp", "Glock-18": "glock", "Desert Eagle": "deagle", "P250": "p250",
    "Five-SeveN": "five-seven", "Tec-9": "tec9", "CZ75-Auto": "cz75", "Dual Berettas": "dual", "R8 Revolver": "r8"
  };
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
  if (!patterns || typeof patterns.describe !== "function") throw new Error("Najpierw załaduj obsługę wzorów (patterns.js).");
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
      /AWP|SSG|SCAR|G3SG/.test(entry.weapon) ? "sniper" : /AK-|M4|AUG|SG |FAMAS|Galil/.test(entry.weapon) ? "rifle" :
      /Nova|MAG|XM|Sawed/.test(entry.weapon) ? "shotgun" : /MAC|MP|PP-|P90/.test(entry.weapon) ? "smg" :
      /Negev|M249/.test(entry.weapon) ? "machinegun" : entry.weapon === "Zeus x27" ? "taser" : "pistol";
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
  freezeDeep(SHOWCASE_SLOTS);
  freezeDeep(SHOWCASE_THEMES);

  const MAX_LEVEL = 20;
  const OPEN_XP = 25;
  const DISCOVERY_XP = 10;
  function getOpeningXP(caseId) {
    const box = caseIndex[caseId];
    if (!box) return { openXP: 0, discoveryXP: 0 };
    const scale = Math.min(1, box.price / 249);
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
  function canonicalSkin(source) { return canonicalIndex[source.sourceId || source.id] || source; }
  function editionTable(source, edition) {
    const canonical = canonicalSkin(source);
    return edition === "regular" ? canonical.wearValues || source.wearValues : edition === "stattrak" ? canonical.stattrakValues || source.stattrakValues : canonical.souvenirValues || source.souvenirValues;
  }
  function supportsStatTrak(source) {
    const flag = canonicalSkin(source).stattrak;
    return typeof flag === "boolean" ? flag : source.art !== "gloves" && source.weapon !== "Zeus x27";
  }
  function supportsEdition(source, edition) {
    if (edition === "regular") return true;
    if (edition === "stattrak") return supportsStatTrak(source) && (!editionTable(source, edition) || Object.values(editionTable(source, edition)).some(value => integer(value) && value > 0));
    return edition === "souvenir" && canonicalSkin(source).souvenir === true && Object.values(editionTable(source, edition) || {}).some(value => integer(value) && value > 0);
  }
  function supportsStoredEdition(source, edition) {
    // Ownership does not disappear when a later market snapshot has no offers.
    // New purchases/upgrades still require supportsEdition and a priced table.
    return edition === "regular" || edition === "stattrak" && supportsStatTrak(source) ||
      edition === "souvenir" && (canonicalSkin(source).manifestSouvenir === true || canonicalSkin(source).souvenir === true);
  }
  function getSkinPrice(skinId, wearCode, edition = "regular") {
    const source = skinIndex[skinId];
    if (!source || !["regular", "stattrak", "souvenir"].includes(edition) || !supportsEdition(source, edition)) return null;
    const wear = availableWear(source, wearCode);
    if (!wear) return null;
    const canonical = canonicalSkin(source);
    const table = editionTable(source, edition);
    const listedValue = table && table[wear.code];
    const actual = integer(listedValue) && listedValue > 0;
    // Older catalog imports can lack edition prices. Such a fallback is always
    // labelled estimated; current catalogs provide actual per-edition values.
    const regularValue = canonical.wearValues && canonical.wearValues[wear.code] || source.baseValue * wear.multiplier;
    const value = Math.max(1, Math.round(actual ? listedValue : regularValue * (edition === "stattrak" ? 1.3 : 1)));
    const detail = canonical.priceDetails && canonical.priceDetails[edition] && canonical.priceDetails[edition][wear.code];
    const estimated = !actual || !detail || detail.method === "estimated";
    return {
      value, edition, wearCode: wear.code, source: detail && detail.source || "Migawka symulatora",
      method: detail && detail.method || (actual ? "legacy-snapshot" : "estimated"),
      updatedAt: detail && Number.isFinite(detail.updatedAt) ? detail.updatedAt : null,
      fetchedAt: detail && detail.fetchedAt || canonical.sourceFetchedAt || null,
      quantity: detail && integer(detail.quantity) ? detail.quantity : null,
      url: detail && typeof detail.url === "string" ? detail.url : null,
      phase: source.phase || null, estimated, noOffers: detail ? detail.noOffers === true : null,
      basis: detail && detail.basis || (estimated ? "Szacunek zapisany w katalogu; brak bezpośredniego notowania dla tego wariantu." : detail.method === "min_price" ? "Najniższa oferta w zapisanej migawce Skinport." : "Cena sugerowana przez Skinport; brak aktywnej oferty w migawce."),
      patternPremium: null, appliedPatternPremium: 0
    };
  }
  function itemPrice(source, wear, edition = "regular") {
    const selectedEdition = typeof edition === "boolean" ? edition ? "stattrak" : "regular" : edition;
    const price = getSkinPrice(source.id, wear.code, selectedEdition);
    return price ? price.value : null;
  }
  function savedPriceMetadata(source, wear, edition, value, raw) {
    const snapshot = raw && typeof raw === "object" && !Array.isArray(raw) && raw.value === value && raw.edition === edition && raw.wearCode === wear.code ? raw : null;
    if (!snapshot) return { value, edition, wearCode: wear.code, source: "Zapis historyczny", method: "legacy-snapshot", updatedAt: null, fetchedAt: null,
      quantity: null, url: null, phase: source.phase || null, estimated: true, noOffers: null,
      basis: "Zachowana wycena przedmiotu ze starszego zapisu; bez odtwarzania nieznanego seeda.", patternPremium: null, appliedPatternPremium: 0 };
    return {
      value, edition, wearCode: wear.code,
      source: typeof snapshot.source === "string" ? snapshot.source.slice(0, 200) : "Zapis historyczny",
      method: typeof snapshot.method === "string" ? snapshot.method.slice(0, 80) : "legacy-snapshot",
      updatedAt: integer(snapshot.updatedAt) ? snapshot.updatedAt : null,
      fetchedAt: typeof snapshot.fetchedAt === "string" ? snapshot.fetchedAt.slice(0, 100) : null,
      quantity: integer(snapshot.quantity) ? snapshot.quantity : null,
      url: typeof snapshot.url === "string" && /^https?:\/\//.test(snapshot.url) ? snapshot.url.slice(0, 1000) : null,
      phase: source.phase || null, estimated: snapshot.estimated !== false,
      noOffers: typeof snapshot.noOffers === "boolean" ? snapshot.noOffers : null,
      basis: typeof snapshot.basis === "string" ? snapshot.basis.slice(0, 600) : "Historyczna migawka wyceny przedmiotu.",
      patternPremium: null, appliedPatternPremium: 0
    };
  }
  function getPatternInfo(itemOrSkinId, seed) {
    const reference = typeof itemOrSkinId === "string" ? skinIndex[itemOrSkinId] : itemOrSkinId;
    if (!reference || typeof reference !== "object") return null;
    const source = skinIndex[reference.skinId || reference.id] || reference;
    const requested = typeof seed !== "undefined" ? seed : Object.hasOwn(reference, "paintSeed") ? reference.paintSeed : null;
    return patterns.describe(source, requested);
  }
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
  function showcaseMatches(slotId, item) {
    return slotId === "featured" || slotId === "ak" && item.weapon === "AK-47" ||
      slotId === "m4" && ["M4A4", "M4A1-S"].includes(item.weapon) || slotId === "awp" && item.weapon === "AWP" ||
      slotId === "usp" && ["USP-S", "P2000"].includes(item.weapon) || slotId === "glock" && item.weapon === "Glock-18" ||
      slotId === "deagle" && item.weapon === "Desert Eagle" || slotId === "knife" && item.art === "knife" ||
      slotId === "gloves" && item.art === "gloves";
  }
  function emptyShowcase() {
    return { title: "Moja kolekcja", theme: "carbon", slots: Object.fromEntries(SHOWCASE_SLOTS.map(slot => [slot.id, null])), unlockedThemes: ["carbon"] };
  }
  function weekInfo(at) {
    const start = new Date(at);
    if (!Number.isFinite(start.getTime())) return weekInfo(Date.now());
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { weekId: localDay(start.getTime()), startAt: start.getTime(), endsAt: end.getTime() };
  }
  function emptyWeek(at) {
    return { ...weekInfo(at), opens: 0, caseIds: [], discoveries: [], pistols: [], wears: [], claimed: [] };
  }
  function emptyRecords(at) {
    return { since: at, opens: 0, openingCost: 0, dropValue: 0, netDropValue: 0,
      bestOpening: null, rarestDrop: null, bestFloat: null, bestUpgrade: null };
  }
  function initialState(at = 0) {
    return {
      version: 3, economyVersion: ECONOMY_VERSION, balance: START_BALANCE, cases: emptyCounts(), keys: {}, inventory: [],
      settings: { sound: true, fast: false },
      stats: { spent: 0, earned: 0, opens: 0, sold: 0, bestDrop: null, workActions: 0, upgradeAttempts: 0, upgradeWins: 0, upgradeLostValue: 0, caseOpens: emptyCounts(), rarities: Object.fromEntries(Object.keys(RARITIES).map(id => [id, 0])) },
      progress: { xp: 0, discovered: {}, claimedMissions: [], claimedCollections: [], legacyAccess: [] },
      dailyClaimed: null, lastWork: 0, workCombo: 0, lastUpgrade: null,
      showcase: emptyShowcase(), weekly: emptyWeek(at), history: [], records: emptyRecords(at), storageWarning: null
    };
  }

  function createGame(options = {}) {
    const clock = typeof options.now === "function" ? options.now : Date.now;
    const rng = typeof options.random === "function" ? options.random : Math.random;
    let storage = options.storage;
    let state = initialState(now());
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
      const declaredEdition = Object.hasOwn(raw, "edition");
      const edition = declaredEdition ? raw.edition : raw.stattrak && supportsStoredEdition(source, "stattrak") ? "stattrak" : raw.souvenir && supportsStoredEdition(source, "souvenir") ? "souvenir" : "regular";
      if (!["regular", "stattrak", "souvenir"].includes(edition) || !supportsStoredEdition(source, edition)) return null;
      const paintSeed = Object.hasOwn(raw, "paintSeed") ? raw.paintSeed : null;
      if (paintSeed !== null && (!patterns.isValidSeed(paintSeed) || source.noWear)) return null;
      if (Object.hasOwn(raw, "paintIndex") && raw.paintIndex !== (source.paintIndex ?? null)) return null;
      const stattrak = edition === "stattrak";
      const value = migrating ? itemPrice(source, wear, edition) ?? raw.value : raw.value;
      seen.add(raw.id);
      return {
        id: raw.id, skinId: source.id, weapon: source.weapon, name: source.name, rarity: source.rarity,
        wear: wear.label, wearCode: wear.code, float: wearFloat, value, caseId: source.caseId,
        edition, stattrak, souvenir: edition === "souvenir", paintSeed, paintIndex: source.paintIndex ?? null, defIndex: source.defIndex ?? null,
        patternFamily: patterns.family(source), priceMetadata: savedPriceMetadata(source, wear, edition, value, raw.priceMetadata),
        locked: raw.locked === true, catalogId: source.sourceId || source.id,
        phase: source.phase || null, displayName: source.displayName || source.name, noWear: Boolean(source.noWear),
        createdAt: timestamp(raw.createdAt) ? raw.createdAt : 0,
        art: source.art, palette: source.palette.slice()
      };
    }

    function validOpeningRecord(raw, chanceRequired = false) {
      if (!raw || typeof raw !== "object" || !caseIndex[raw.caseId] || !timestamp(raw.at)) return null;
      const item = validItem(raw.item, new Set());
      if (!item || item.caseId !== raw.caseId) return null;
      if (chanceRequired && (!Number.isFinite(raw.chance) || raw.chance <= 0 || raw.chance > 1)) return null;
      return { item, caseId: raw.caseId, at: raw.at, ...(chanceRequired ? { chance: raw.chance } : {}) };
    }
    function validUpgradeRecord(raw, history = false) {
      if (!raw || typeof raw !== "object" || !timestamp(raw.at) || !integer(raw.inputValue) || raw.inputValue < 1 ||
          !integer(raw.targetValue) || raw.targetValue < 1 || !Number.isFinite(raw.chance) || raw.chance <= 0 || raw.chance > UPGRADE_MAX_CHANCE ||
          !Number.isFinite(raw.multiplier) || raw.multiplier < 1.05 || Math.abs(raw.multiplier - raw.targetValue / raw.inputValue) > 1e-8) return null;
      const won = history ? raw.won : true;
      if (typeof won !== "boolean" || history && (!Number.isSafeInteger(raw.quantity) || raw.quantity < 1 || raw.quantity > 5)) return null;
      const item = raw.item ? validItem(raw.item, new Set()) : null;
      if (won ? !item || item.value !== raw.targetValue : Boolean(raw.item)) return null;
      const targetSkinId = history ? raw.targetSkinId : item.skinId;
      const wearCode = history ? raw.wearCode : item.wearCode;
      const source = skinIndex[targetSkinId];
      const edition = Object.hasOwn(raw, "edition") ? raw.edition : item && item.edition || "regular";
      if (!source || !availableWear(source, wearCode) || !supportsStoredEdition(source, edition) || item && (finishKey(source) !== finishKey(item) || item.wearCode !== wearCode || item.edition !== edition)) return null;
      return { item, at: raw.at, chance: raw.chance, multiplier: raw.multiplier, inputValue: raw.inputValue, targetValue: raw.targetValue,
        edition, ...(history ? { won, targetSkinId, wearCode, quantity: raw.quantity } : {}) };
    }
    function restoreFeatures(raw, next, repair) {
      if (Object.hasOwn(raw, "showcase")) {
        const saved = raw.showcase;
        if (!saved || typeof saved !== "object" || Array.isArray(saved)) repair();
        else {
          if (typeof saved.title === "string" && saved.title.trim() && Array.from(saved.title.trim()).length <= 40) next.showcase.title = saved.title.trim(); else repair();
          if (Array.isArray(saved.unlockedThemes)) {
            next.showcase.unlockedThemes = [...new Set(["carbon", ...saved.unlockedThemes.filter(theme => SHOWCASE_THEMES.includes(theme))])];
            if (saved.unlockedThemes.some(theme => !SHOWCASE_THEMES.includes(theme))) repair();
          } else repair();
          if (SHOWCASE_THEMES.includes(saved.theme) && next.showcase.unlockedThemes.includes(saved.theme)) next.showcase.theme = saved.theme; else repair();
          const used = new Set();
          if (!saved.slots || typeof saved.slots !== "object" || Array.isArray(saved.slots)) repair();
          else for (const slot of SHOWCASE_SLOTS) {
            const id = saved.slots[slot.id];
            if (id == null) continue;
            const item = next.inventory.find(entry => entry.id === id);
            if (typeof id === "string" && item && showcaseMatches(slot.id, item) && !used.has(id)) {
              next.showcase.slots[slot.id] = id;
              used.add(id);
            } else repair();
          }
        }
      }
      if (Object.hasOwn(raw, "weekly")) {
        const saved = raw.weekly;
        const date = saved && typeof saved.weekId === "string" && /^\d{4}-\d{2}-\d{2}$/.test(saved.weekId) ? new Date(saved.weekId + "T00:00:00Z") : null;
        const calendarTime = value => Number.isSafeInteger(value) && Math.abs(value) <= 8640000000000000;
        if (!saved || !date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== saved.weekId || date.getUTCDay() !== 1 ||
            !calendarTime(saved.startAt) || !calendarTime(saved.endsAt) || saved.endsAt - saved.startAt < 6 * 86400000 || saved.endsAt - saved.startAt > 8 * 86400000 || !integer(saved.opens, MAX_COUNT)) repair();
        else {
          const week = { weekId: saved.weekId, startAt: saved.startAt, endsAt: saved.endsAt, opens: saved.opens, caseIds: [], discoveries: [], pistols: [], wears: [], claimed: [] };
          for (const [field, allowed] of [["caseIds", Object.keys(caseIndex)], ["pistols", Object.values(PISTOL_FAMILIES)], ["wears", WEARS.filter(wear => wear.code !== "NW").map(wear => wear.code)], ["claimed", WEEKLY_IDS]]) {
            if (!Array.isArray(saved[field])) { repair(); continue; }
            week[field] = [...new Set(saved[field].filter(value => typeof value === "string" && allowed.includes(value)))];
            if (week[field].length !== saved[field].length) repair();
          }
          if (Array.isArray(saved.discoveries)) {
            const seen = new Set();
            for (const id of saved.discoveries.slice(0, SKINS.length)) {
              const source = skinIndex[id];
              if (source && !seen.has(finishKey(source))) { week.discoveries.push(id); seen.add(finishKey(source)); }
              else repair();
            }
            if (saved.discoveries.length > SKINS.length) repair();
          } else repair();
          for (const field of ["caseIds", "discoveries", "pistols", "wears"]) {
            if (week[field].length > week.opens) { week[field] = week[field].slice(0, week.opens); repair(); }
          }
          next.weekly = week;
        }
      }
      if (Object.hasOwn(raw, "history")) {
        if (!Array.isArray(raw.history)) repair();
        else {
          const used = new Set();
          for (const entry of raw.history.slice(0, HISTORY_LIMIT)) {
            if (!entry || typeof entry.id !== "string" || !entry.id || entry.id.length > 200 || used.has(entry.id)) { repair(); continue; }
            let valid = null;
            if (entry.type === "opening" && integer(entry.cost) && entry.cost > 0) {
              const record = validOpeningRecord(entry);
              if (record) valid = { id: entry.id, type: "opening", ...record, cost: entry.cost };
            } else if (entry.type === "upgrade") {
              const record = validUpgradeRecord(entry, true);
              if (record) valid = { id: entry.id, type: "upgrade", ...record };
            }
            if (valid) { next.history.push(valid); used.add(valid.id); } else repair();
          }
          if (raw.history.length > HISTORY_LIMIT) repair();
        }
      }
      if (Object.hasOwn(raw, "records")) {
        const saved = raw.records;
        if (!saved || typeof saved !== "object" || Array.isArray(saved)) repair();
        else {
          if (timestamp(saved.since)) next.records.since = saved.since; else repair();
          for (const field of ["opens", "openingCost", "dropValue", "netDropValue"]) {
            if (integer(saved[field])) next.records[field] = saved[field]; else repair();
          }
          for (const field of ["bestOpening", "rarestDrop"]) {
            if (saved[field] == null) continue;
            const record = validOpeningRecord(saved[field], field === "rarestDrop");
            if (record) next.records[field] = record; else repair();
          }
          if (saved.bestFloat != null) {
            const item = validItem(saved.bestFloat.item, new Set());
            if (item && !item.noWear && timestamp(saved.bestFloat.at)) next.records.bestFloat = { item, at: saved.bestFloat.at }; else repair();
          }
          if (saved.bestUpgrade != null) {
            const record = validUpgradeRecord(saved.bestUpgrade);
            if (record) next.records.bestUpgrade = record; else repair();
          }
        }
      }
    }

    function restore(raw) {
      if (!raw || typeof raw !== "object" || ![1, 2, 3].includes(raw.version)) throw new Error("Nieobsługiwana wersja zapisu.");
      if (Object.hasOwn(raw, "economyVersion") && ![1, ECONOMY_VERSION].includes(raw.economyVersion)) throw new Error("Nieobsługiwana wersja gospodarki.");
      const next = initialState(now());
      const migrating = raw.version === 1;
      const expanded = raw.version < 3;
      const economyMigrating = raw.economyVersion !== ECONOMY_VERSION;
      const legacyKeys = emptyCounts();
      let repaired = false;
      let walletRepaired = false;
      for (const field of ["balance"]) {
        if (integer(raw[field])) next[field] = raw[field]; else repaired = true;
      }
      for (const box of CASES) {
        if (raw.cases && integer(raw.cases[box.id], MAX_COUNT)) next.cases[box.id] = raw.cases[box.id];
        else if (!raw.cases || Object.hasOwn(raw.cases, box.id) || !expanded) repaired = true;
        if (economyMigrating) {
          if (raw.keys && integer(raw.keys[box.id], MAX_COUNT)) legacyKeys[box.id] = raw.keys[box.id];
          else if (!raw.keys || Object.hasOwn(raw.keys, box.id) || !expanded) repaired = true;
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
        next.progress.legacyAccess = CASES.filter(box => next.cases[box.id] || legacyKeys[box.id]).map(box => box.id);
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
        const edition = Object.hasOwn(record, "edition") ? record.edition : item && item.edition || "regular";
        if (source && availableWear(source, record.wearCode) && typeof record.won === "boolean" &&
            supportsStoredEdition(source, edition) &&
            Number.isFinite(record.chance) && record.chance > 0 && record.chance <= UPGRADE_MAX_CHANCE &&
            integer(record.inputValue) && record.inputValue > 0 && integer(record.targetValue) && record.targetValue > 0 &&
            timestamp(record.createdAt) && (record.won ? Boolean(item) : !record.item)) {
          next.lastUpgrade = { won: record.won, item, chance: record.chance, inputValue: record.inputValue, targetValue: record.targetValue,
            targetSkinId: source.id, wearCode: record.wearCode, edition, createdAt: record.createdAt };
        } else repaired = true;
      }
      restoreFeatures(raw, next, () => { repaired = true; });
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
      // restore() only receives a payload accepted by the integrity guard. Old
      // keys are valued at the last key price, then exchanged once for cash.
      // The marker, empty keys and matching ledger credit are sealed together.
      const keyRefund = economyMigrating ? CASES.reduce((sum, box) => sum + legacyKeys[box.id] * (box.legacyKeyPrice || 0), 0) : 0;
      if (keyRefund) {
        next.balance = Math.min(MAX_MONEY, next.balance + keyRefund);
        next.stats.earned = Math.min(MAX_MONEY, next.stats.earned + keyRefund);
      }
      if (walletRepaired) next.storageWarning = "Saldo nie zgadzało się z historią zarobków i wydatków. Przywrócono poprawną kwotę; ekwipunek i postęp zostały zachowane.";
      else if (repaired) next.storageWarning = "Naprawiono uszkodzone dane zapisu. Poprawne przedmioty i postęp zostały zachowane.";
      else if (migrating) next.storageWarning = "Zapis zaktualizowano: zachowano środki i ekwipunek, wyceny dopasowano do nowego rynku. Album odzyskał skiny z ekwipunku i najlepszy historyczny drop; sprzedanych wcześniej skinów nie da się odtworzyć.";
      if (keyRefund) next.storageWarning = (next.storageWarning ? next.storageWarning + " " : "") + `Usunięto klucze. Zwrócono ich wartość: $${(keyRefund / 100).toFixed(2)}. Posiadane skrzynki otworzysz bez dodatkowej opłaty.`;
      return next;
    }

    const recoveryWarning = "Wykryto zmieniony lub uszkodzony zapis. Przywrócono ostatni poprawny stan; saldo, ekwipunek i postęp są zachowane.";
    const initialRead = guard.read();
    let sealOnStartup = false;
    lastPayload = initialRead.payload;
    if (initialRead.kind === "valid" || initialRead.kind === "legacy") {
      try {
        state = restore(initialRead.raw);
        sealOnStartup = initialRead.kind === "legacy" || initialRead.recovered || initialRead.raw.economyVersion !== ECONOMY_VERSION;
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
          try {
            state = restore(observed.raw);
            lastPayload = observed.payload;
            // Commit migration even when the next requested action is rejected.
            // A failed disk write retains the same in-memory migrated state;
            // rereading the unchanged old payload never credits it a second time.
            if (observed.raw.economyVersion !== ECONOMY_VERSION) save(true);
          }
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
        if (result.ok) { ensureCurrentWeek(); save(); }
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
    function effectiveWeek(at = now()) {
      const current = weekInfo(at);
      return current.weekId > state.weekly.weekId ? emptyWeek(at) : state.weekly;
    }
    function ensureCurrentWeek(at = now()) {
      const week = effectiveWeek(at);
      if (week !== state.weekly) state.weekly = week;
      return state.weekly;
    }
    function weeklyView(week) {
      let hash = 2166136261;
      for (const character of week.weekId) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
      const ordinal = Math.floor(Date.parse(week.weekId + "T00:00:00Z") / (7 * 86400000));
      const pistolWeek = (ordinal % 2 + 2) % 2 === 0;
      const cosmetic = SHOWCASE_THEMES[1 + (ordinal % 3 + 3) % 3];
      const definitions = [
        { id: "weekly-open", title: "Cotygodniowy rytuał", description: "Otwórz skrzynki w tym tygodniu.", current: week.opens, target: 12 + hash % 7, caseId: "dnm", count: 1, xp: 30 },
        { id: "weekly-visit", title: "Zmień scenerię", description: "Otwórz skrzynki z różnych kolekcji w tym tygodniu.", current: week.caseIds.length, target: 3 + (hash >>> 3) % 2, caseId: "revolution", count: 1, xp: 40 },
        { id: "weekly-discover", title: "Nowe strony albumu", description: "Odkryj po raz pierwszy nowe warianty, otwierając skrzynki w tym tygodniu.", current: week.discoveries.length, target: 6 + (hash >>> 5) % 5, caseId: "budgetrun", count: 2, xp: 40 },
        { id: "weekly-variety", title: pistolWeek ? "Pistoletowy arsenał" : "Trzy oblicza skina", description: pistolWeek ? "Wylosuj trzy różne rodziny pistoletów w skrzynkach w tym tygodniu." : "Wylosuj skiny w trzech różnych stanach zużycia w tym tygodniu.", current: pistolWeek ? week.pistols.length : week.wears.length, target: 3, caseId: "gallery", count: 1, xp: 60, cosmetic }
      ];
      const missions = definitions.map(definition => ({
        id: definition.id, title: definition.title, description: definition.description,
        current: Math.min(definition.current, definition.target), target: definition.target,
        completed: definition.current >= definition.target, claimed: week.claimed.includes(definition.id),
        reward: { cases: { [definition.caseId]: definition.count }, xp: definition.xp, cosmetic: definition.cosmetic || null }
      }));
      return { weekId: week.weekId, startAt: week.startAt, endsAt: week.endsAt, missions,
        claimedCount: missions.filter(mission => mission.claimed).length, total: missions.length };
    }
    function getWeekly() { return weeklyView(effectiveWeek()); }
    function claimWeekly(id) {
      return transaction(() => {
        const week = effectiveWeek();
        const mission = weeklyView(week).missions.find(entry => entry.id === id);
        if (!mission) return fail("Nie znaleziono tego zadania tygodniowego.");
        if (mission.claimed) return fail("Nagroda za to zadanie tygodniowe jest już odebrana.");
        if (!mission.completed) return fail("To zadanie tygodniowe nie jest jeszcze ukończone.");
        for (const [caseId, count] of Object.entries(mission.reward.cases)) {
          if (!caseIndex[caseId] || state.cases[caseId] + count > MAX_COUNT) return fail("Brak miejsca na skrzynki z nagrody. Otwórz kilka posiadanych skrzynek.");
        }
        state.weekly = week;
        for (const [caseId, count] of Object.entries(mission.reward.cases)) state.cases[caseId] += count;
        addXP(mission.reward.xp);
        if (mission.reward.cosmetic && !state.showcase.unlockedThemes.includes(mission.reward.cosmetic)) state.showcase.unlockedThemes.push(mission.reward.cosmetic);
        state.weekly.claimed.push(mission.id);
        return { ok: true, id: mission.id, weekId: week.weekId, reward: clone(mission.reward), xp: mission.reward.xp };
      });
    }
    function isItemEquipped(id) { return typeof id === "string" && Object.values(state.showcase.slots).includes(id); }
    function getShowcase() {
      const slots = SHOWCASE_SLOTS.map(slot => {
        const item = state.inventory.find(entry => entry.id === state.showcase.slots[slot.id]) || null;
        return { ...slot, item: item ? clone(item) : null, itemId: item ? item.id : null };
      });
      return { title: state.showcase.title, theme: state.showcase.theme, slots, unlockedThemes: state.showcase.unlockedThemes.slice(),
        totalValue: slots.reduce((sum, slot) => sum + (slot.item ? slot.item.value : 0), 0), filled: slots.filter(slot => slot.item).length, totalSlots: slots.length };
    }
    function getShowcaseCandidates(slotId) {
      if (!SHOWCASE_SLOTS.some(slot => slot.id === slotId)) return [];
      return clone(state.inventory.filter(item => showcaseMatches(slotId, item)).sort((left, right) => right.value - left.value));
    }
    function setShowcaseSlot(slotId, itemId) {
      return transaction(() => {
        if (!SHOWCASE_SLOTS.some(slot => slot.id === slotId)) return fail("Nie znaleziono tego miejsca w gablocie.");
        if (itemId !== null && typeof itemId !== "string") return fail("Wybierz przedmiot lub opróżnij miejsce w gablocie.");
        if (itemId !== null) {
          const item = state.inventory.find(entry => entry.id === itemId);
          if (!item) return fail("Ten skin nie znajduje się już w ekwipunku.");
          if (!showcaseMatches(slotId, item)) return fail("Ten typ przedmiotu nie pasuje do wybranego miejsca w gablocie.");
          for (const slot of SHOWCASE_SLOTS) if (state.showcase.slots[slot.id] === itemId) state.showcase.slots[slot.id] = null;
        }
        state.showcase.slots[slotId] = itemId;
        return { ok: true, slotId, itemId };
      });
    }
    function setShowcaseTitle(title) {
      return transaction(() => {
        if (typeof title !== "string" || !title.trim() || Array.from(title.trim()).length > 40) return fail("Nazwa gabloty powinna mieć od 1 do 40 znaków.");
        state.showcase.title = title.trim();
        return { ok: true, title: state.showcase.title };
      });
    }
    function setShowcaseTheme(theme) {
      return transaction(() => {
        if (!SHOWCASE_THEMES.includes(theme)) return fail("Nie znaleziono tego motywu gabloty.");
        if (!state.showcase.unlockedThemes.includes(theme)) return fail("Odblokuj ten motyw, wykonując zadania tygodniowe.");
        state.showcase.theme = theme;
        return { ok: true, theme };
      });
    }
    function addHistory(entry) {
      state.history.unshift(clone(entry));
      if (state.history.length > HISTORY_LIMIT) state.history.length = HISTORY_LIMIT;
    }
    function recordFloat(item, at) {
      if (item.noWear) return;
      const previous = state.records.bestFloat;
      if (!previous || item.float < previous.item.float || item.float === previous.item.float && item.value > previous.item.value) state.records.bestFloat = { item: clone(item), at };
    }
    function recordOpening(box, item, fresh) {
      const at = item.createdAt;
      const cost = box.price;
      const records = state.records;
      records.opens = Math.min(MAX_MONEY, records.opens + 1);
      records.openingCost = Math.min(MAX_MONEY, records.openingCost + cost);
      records.dropValue = Math.min(MAX_MONEY, records.dropValue + item.value);
      records.netDropValue = Math.min(MAX_MONEY, records.netDropValue + saleValue(item.value));
      if (!records.bestOpening || item.value > records.bestOpening.item.value) records.bestOpening = { item: clone(item), caseId: box.id, at };
      const chance = dropTables[box.id].filter(row => row.skinId === item.skinId).reduce((sum, row) => sum + row.chance, 0);
      if (!records.rarestDrop || chance < records.rarestDrop.chance || chance === records.rarestDrop.chance && item.value > records.rarestDrop.item.value) records.rarestDrop = { item: clone(item), caseId: box.id, chance, at };
      recordFloat(item, at);
      addHistory({ id: `opening-${item.id}`, type: "opening", at, caseId: box.id, item, cost });
      const week = ensureCurrentWeek();
      week.opens = Math.min(MAX_COUNT, week.opens + 1);
      if (!week.caseIds.includes(box.id)) week.caseIds.push(box.id);
      if (fresh) week.discoveries.push(item.skinId);
      const family = PISTOL_FAMILIES[item.weapon];
      if (family && !week.pistols.includes(family)) week.pistols.push(family);
      if (item.wearCode !== "NW" && !week.wears.includes(item.wearCode)) week.wears.push(item.wearCode);
    }
    function recordUpgrade(quote, won, item) {
      const at = now();
      sequence += 1;
      const id = `upgrade-${at.toString(36)}-${sequence.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      const record = { at, item: item ? clone(item) : null, won, chance: quote.chance, inputValue: quote.inputValue,
        targetValue: quote.targetValue, multiplier: quote.multiplier, targetSkinId: quote.targetSkinId, wearCode: quote.wearCode, edition: quote.edition, quantity: quote.ids.length };
      addHistory({ id, type: "upgrade", ...record });
      if (!won) return;
      recordFloat(item, at);
      const previous = state.records.bestUpgrade;
      if (!previous || quote.chance < previous.chance || quote.chance === previous.chance && item.value > previous.item.value) {
        state.records.bestUpgrade = { item: clone(item), at, chance: quote.chance, multiplier: quote.multiplier, inputValue: quote.inputValue, targetValue: quote.targetValue, edition: quote.edition };
      }
    }
    function getHistory() { return clone(state.history); }
    function getRecords() { return { ...clone(state.records), balance: state.records.netDropValue - state.records.openingCost }; }
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

    function buy(caseId, quantity) {
      return transaction(() => {
        const box = caseIndex[caseId];
        if (!box) return fail("Nie znaleziono tej skrzynki.");
        const access = getCaseAccess(caseId);
        if (!access.unlocked) return fail(`Ta kolekcja odblokuje się na poziomie ${access.requiredLevel}. Zdobywaj XP, otwierając skrzynki i wykonując zadania.`);
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) return fail("Wybierz liczbę od 1 do 999.");
        if (state.cases[caseId] + quantity > MAX_COUNT) return fail("Masz już maksymalną liczbę tych skrzynek.");
        const total = box.price * quantity;
        if (state.balance < total) return fail("Za mało środków. Zajrzyj do panelu zarabiania.");
        state.balance -= total;
        state.cases[caseId] += quantity;
        addStat("spent", total);
        return { ok: true, quantity, total, caseId, kind: "cases" };
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
    function itemFromSource(source, wearCode = null, exactValue = null, requestedEdition = null) {
      const requestedWear = wearCode ? availableWear(source, wearCode) : null;
      const wearFloat = source.noWear ? 0 : requestedWear ?
        randomFloat(Math.max(source.minFloat, requestedWear.min), Math.min(source.maxFloat, requestedWear.max, 1)) :
        randomFloat(source.minFloat, source.maxFloat);
      const wear = requestedWear || wearAt(source, wearFloat);
      const stattrakRoll = requestedEdition === null && exactValue === null && supportsEdition(source, "stattrak") && random() < 0.1;
      const edition = requestedEdition || (stattrakRoll ? "stattrak" : "regular");
      const stattrak = edition === "stattrak";
      const priceMetadata = getSkinPrice(source.id, wear.code, edition);
      const value = exactValue === null ? priceMetadata.value : exactValue;
      // Keep the former price-spread draw in the established RNG sequence, but
      // prices now exactly match their per-wear, phase and edition snapshot.
      if (exactValue === null) random();
      const paintSeed = source.noWear ? null : Math.floor(random() * 1000);
      const timestamp = now();
      sequence += 1;
      let unique;
      try { unique = globalThis.crypto && typeof globalThis.crypto.randomUUID === "function" ? globalThis.crypto.randomUUID() : null; } catch (_) { unique = null; }
      const id = unique || `drop-${timestamp.toString(36)}-${sequence.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      return {
        id, skinId: source.id, weapon: source.weapon, name: source.name, rarity: source.rarity,
        wear: wear.label, wearCode: wear.code, float: wearFloat, value, caseId: source.caseId,
        edition, stattrak, souvenir: edition === "souvenir", paintSeed, paintIndex: source.paintIndex ?? null, defIndex: source.defIndex ?? null,
        patternFamily: patterns.family(source), priceMetadata: { ...priceMetadata, value },
        locked: false, catalogId: source.sourceId || source.id, noWear: Boolean(source.noWear),
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
        if (state.inventory.length + quantity > MAX_INVENTORY) return fail("Ekwipunek jest pełny. Sprzedaj kilka przedmiotów.");
        const items = Array.from({ length: quantity }, () => createItem(box));
        const openingXP = getOpeningXP(caseId);
        state.cases[caseId] -= quantity;
        state.inventory.unshift(...items);
        addStat("opens", quantity);
        state.stats.caseOpens[box.id] = Math.min(MAX_COUNT, state.stats.caseOpens[box.id] + quantity);
        const rewards = items.map(item => {
          state.stats.rarities[item.rarity] = Math.min(MAX_COUNT, state.stats.rarities[item.rarity] + 1);
          addXP(openingXP.openXP);
          const fresh = discover(item.skinId, openingXP.discoveryXP);
          if (!state.stats.bestDrop || item.value > state.stats.bestDrop.value) state.stats.bestDrop = clone(item);
          recordOpening(box, item, fresh);
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

    function buildUpgradeQuote(ids, targetSkinId, wearCode, edition = "regular") {
      if (!Array.isArray(ids) || ids.length < 1 || ids.length > 5 || ids.some(id => typeof id !== "string")) return fail("Wybierz od 1 do 5 skinów do ulepszenia.");
      const selected = new Set(ids);
      if (selected.size !== ids.length) return fail("Każdy skin można dodać do ulepszenia tylko raz.");
      const inputs = state.inventory.filter(item => selected.has(item.id));
      if (inputs.length !== selected.size) return fail("Co najmniej jeden wybrany skin nie znajduje się już w ekwipunku.");
      if (inputs.some(item => item.locked)) return fail("Ulubione skiny są chronione. Najpierw odznacz gwiazdkę przy przedmiocie.");
      if (inputs.some(item => isItemEquipped(item.id))) return fail("Skiny wystawione w gablocie są chronione. Najpierw zdejmij je z gabloty.");
      const source = skinIndex[targetSkinId];
      if (!source) return fail("Wybierz docelowy skin z katalogu.");
      const wear = availableWear(source, wearCode);
      if (!wear) return fail("Ten skin nie występuje w wybranym stanie zużycia.");
      const targetPrice = getSkinPrice(source.id, wear.code, edition);
      if (!targetPrice) return fail("Ta edycja skina nie ma dostępnej wyceny w wybranym stanie.");
      const inputValue = inputs.reduce((sum, item) => sum + item.value, 0);
      const targetValue = targetPrice.value;
      if (!integer(targetValue) || targetValue < Math.ceil(inputValue * 1.05)) return fail("Docelowy skin musi być wart co najmniej 105% łącznej wartości wkładu.");
      const chance = Math.min(UPGRADE_MAX_CHANCE, inputValue / targetValue * (1 - UPGRADE_HOUSE_EDGE));
      const canonicalId = source.sourceId && canonicalIndex[source.sourceId] ? source.sourceId : source.id;
      const canonical = skinIndex[canonicalId];
      const target = { id: canonical.id, skinId: canonical.id, catalogId: source.sourceId || source.id,
        weapon: source.weapon, name: source.name, displayName: source.displayName || source.name, phase: source.phase || null,
        rarity: source.rarity, art: source.art, palette: source.palette.slice(), image: source.image || null,
        value: targetValue, wear: wear.label, wearCode: wear.code, edition, stattrak: edition === "stattrak", souvenir: edition === "souvenir",
        noWear: Boolean(source.noWear), paintIndex: source.paintIndex ?? null, defIndex: source.defIndex ?? null, patternFamily: patterns.family(source), priceMetadata: targetPrice };
      return { ok: true, ids: [...ids], inputValue, targetValue, chance, multiplier: targetValue / inputValue,
        houseEdge: UPGRADE_HOUSE_EDGE, maxChance: UPGRADE_MAX_CHANCE, targetSkinId: canonicalId,
        wearCode: wear.code, edition, target, inputs: clone(inputs) };
    }
    function quoteUpgrade(ids, targetSkinId, wearCode, edition = "regular") {
      if (writing) return fail("Poczekaj na zakończenie poprzedniej operacji.");
      refresh();
      return buildUpgradeQuote(ids, targetSkinId, wearCode, edition);
    }
    function upgrade(ids, targetSkinId, wearCode, edition = "regular") {
      return transaction(() => {
        // Recalculate from the shared save. A stale quote never spends missing or locked skins.
        const quote = buildUpgradeQuote(ids, targetSkinId, wearCode, edition);
        if (!quote.ok) return quote;
        const roll = random();
        const won = roll < quote.chance;
        const item = won ? itemFromSource(skinIndex[quote.targetSkinId], quote.wearCode, quote.targetValue, quote.edition) : null;
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
          targetValue: quote.targetValue, targetSkinId: quote.targetSkinId, wearCode: quote.wearCode, edition: quote.edition, createdAt: now() };
        recordUpgrade(quote, won, item);
        return { ...quote, won, roll, item: item ? clone(item) : null, newDiscovery: fresh,
          xpAwarded: 0, quantity: quote.ids.length, level: getProgress().level };
      });
    }

    function getResources() {
      return {
        cases: CASES.filter(box => state.cases[box.id] > 0).map(box => ({ caseId: box.id, count: state.cases[box.id], name: box.name, image: box.image || null })),
        keys: [],
        totalCases: Object.values(state.cases).reduce((sum, count) => sum + count, 0),
        totalKeys: 0
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
        if (found.some(item => isItemEquipped(item.id))) return fail("Przedmioty w gablocie są chronione. Najpierw zdejmij je z gabloty.");
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
        state = initialState(now());
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
      buyCase: (caseId, quantity = 1) => buy(caseId, quantity),
      buyKey: () => fail("System kluczy został usunięty. Do otwarcia wystarczy skrzynka."),
      openCase, openCases,
      previewItem(caseId) { return caseIndex[caseId] ? createItem(caseIndex[caseId]) : null; },
      sellItem: id => sellItems([id]), sellItems, saleValue,
      getWorkStatus, work, getDailyStatus, claimDaily, setSetting, reset,
      getProgress, getCaseAccess, getCampaign, claimMission, getCollections, claimCollection,
      setItemLocked, isDiscovered, quoteUpgrade, upgrade, getResources, getDropChances, getRarityChances, getOpeningXP,
      getShowcase, getShowcaseCandidates, setShowcaseSlot, setShowcaseTitle, setShowcaseTheme, isItemEquipped,
      getWeekly, claimWeekly, getHistory, getRecords,
      getSkinPrice, getPatternInfo, getPriceMetadata: () => clone(catalog.META || {}),
      getSkinValue(skinId, wearCode, edition = false) {
        if (typeof edition !== "boolean" && typeof edition !== "string") return null;
        const price = getSkinPrice(skinId, wearCode, typeof edition === "boolean" ? edition ? "stattrak" : "regular" : edition);
        return price ? price.value : null;
      }
    });
  }

  return Object.freeze({ CASES, SKINS, RARITIES, WEARS, STORAGE_KEY, STORAGE_BACKUP_KEY, START_BALANCE, ECONOMY_VERSION, SALE_FEE, DAILY_REWARD, WORK_COOLDOWN, MAX_LEVEL, MAX_INVENTORY,
    OPEN_XP, DISCOVERY_XP, MISSIONS, OPEN_QUANTITIES, UPGRADE_HOUSE_EDGE, UPGRADE_MAX_CHANCE, SHOWCASE_SLOTS, SHOWCASE_THEMES, HISTORY_LIMIT,
    getDropChances, getRarityChances, getOpeningXP, getSkinPrice, getPatternInfo, createGame });
});

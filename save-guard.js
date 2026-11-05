/*
 * SKINLAB save integrity and recovery.
 * This checksum detects edits and accidental corruption on the client. It is not
 * cryptographic authentication: a fully controlled browser cannot keep a secret
 * from its owner. Authoritative balances require a trusted server.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SaveGuard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const BACKUP_SUFFIX = ':verified-backup';
  const FORMAT = 1;
  const LEGACY_VERSIONS = [1, 2, 3];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function canonical(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  function checksum(body, revision) {
    const text = 'SKINLAB_SAVE_GUARD|' + FORMAT + '|' + revision + '|' + canonical(body);
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < text.length; index++) {
      const code = text.charCodeAt(index);
      first = Math.imul(first ^ code, 0x01000193) >>> 0;
      second = Math.imul(second ^ code, 0x85ebca6b) >>> 0;
      second = (second ^ (second >>> 13)) >>> 0;
    }
    return first.toString(16).padStart(8, '0') + second.toString(16).padStart(8, '0');
  }
  function inspect(payload) {
    if (payload === null) return { kind: 'empty', payload: null, raw: null };
    let raw;
    try { raw = JSON.parse(payload); }
    catch (_) { return { kind: 'invalid', payload, raw: null, sealed: false }; }
    if (!object(raw)) return { kind: 'invalid', payload, raw: null, sealed: false };
    const sealed = Object.prototype.hasOwnProperty.call(raw, 'integrity');
    if (!sealed) return { kind: LEGACY_VERSIONS.includes(raw.version) ? 'legacy' : 'invalid', payload, raw, sealed: false };
    const integrity = raw.integrity;
    if (!object(integrity) || integrity.format !== FORMAT || !Number.isSafeInteger(integrity.revision) || integrity.revision < 1 ||
        typeof integrity.checksum !== 'string' || !/^[0-9a-f]{16}$/.test(integrity.checksum)) {
      return { kind: 'invalid', payload, raw: null, sealed: true };
    }
    const body = { ...raw };
    delete body.integrity;
    try {
      if (checksum(body, integrity.revision) !== integrity.checksum) return { kind: 'invalid', payload, raw: null, sealed: true };
    } catch (_) { return { kind: 'invalid', payload, raw: null, sealed: true }; }
    return { kind: 'valid', payload, raw, revision: integrity.revision, sealed: true };
  }

  function createGuard(storage, key) {
    if (typeof key !== 'string' || !key) throw new TypeError('Podaj klucz zapisu gry.');
    const backupKey = key + BACKUP_SUFFIX;
    let protectedSave = false;
    let trusted = null;
    let maxRevision = 0;
    const inspections = new Map();

    function remember(payload, verdict) {
      inspections.delete(payload);
      inspections.set(payload, verdict);
      if (inspections.size > 4) inspections.delete(inspections.keys().next().value);
      return verdict;
    }
    function inspectCached(payload) {
      if (payload === null) return inspect(null);
      const cached = inspections.get(payload);
      // Cache the complete verdict, including failures. Identical damaged data
      // never turns into a trusted save merely because it was observed before.
      return cached ? remember(payload, cached) : remember(payload, inspect(payload));
    }

    function result(kind, candidate, recovered = false, error) {
      return {
        kind, payload: candidate ? candidate.payload : null, raw: candidate ? clone(candidate.raw) : null,
        revision: candidate ? candidate.revision || 0 : maxRevision, recovered,
        ...(error ? { error } : {})
      };
    }
    function read() {
      if (!storage || typeof storage.getItem !== 'function') return result('unavailable', null, false, 'Zapis lokalny jest niedostępny.');
      let primary = null;
      let backup = null;
      let primaryError = false;
      let backupError = false;
      try {
        const value = storage.getItem(key);
        primary = value == null ? null : String(value);
      } catch (_) { primaryError = true; }
      try {
        const value = storage.getItem(backupKey);
        backup = value == null ? null : String(value);
      } catch (_) { backupError = true; }
      const main = inspectCached(primary);
      const reserve = inspectCached(backup);
      // A backup slot is reserved for sealed saves. Even damaged backup data is
      // evidence that unsigned migration must not be silently enabled again.
      if (main.sealed || reserve.sealed || backup !== null) protectedSave = true;
      const candidates = [];
      if (main.kind === 'valid') candidates.push({ ...main, primary: true });
      if (reserve.kind === 'valid') candidates.push({ ...reserve, primary: false });
      candidates.sort((left, right) => right.revision - left.revision || Number(right.primary) - Number(left.primary));
      const stored = candidates[0];
      if (stored) {
        maxRevision = Math.max(maxRevision, stored.revision);
        protectedSave = true;
        // Reject a rollback while this game instance still knows a newer valid
        // save. This also preserves local progress after partial storage failures.
        if (trusted && trusted.revision > stored.revision) {
          return result('valid', trusted, true, 'Zachowano nowszy, poprawny zapis z tej karty.');
        }
        trusted = { payload: stored.payload, raw: clone(stored.raw), revision: stored.revision };
        const recovered = !stored.primary;
        const error = primaryError || backupError ? 'Nie udało się odczytać jednej z kopii zapisu.' :
          recovered ? 'Przywrócono ostatni poprawny zapis z kopii zapasowej.' : null;
        return result('valid', trusted, recovered, error);
      }
      if (primaryError || backupError) return result('unavailable', null, false, 'Nie udało się odczytać zapisu lokalnego. Zachowano bieżący postęp w tej karcie.');
      if (primary === null && backup === null && !protectedSave) return result('empty', null);
      if (main.kind === 'legacy' && backup === null && !protectedSave) return result('legacy', main);
      // Never return an edited/unsigned object to the economy. A live instance
      // may expose only its already verified in-memory copy to aid recovery.
      return result('invalid', trusted, Boolean(trusted), trusted ?
        'Wykryto zmieniony lub uszkodzony zapis. Zachowano ostatni poprawny stan tej karty.' :
        'Zapis został zmieniony lub uszkodzony i nie ma poprawnej kopii zapasowej.');
    }

    function write(state) {
      if (!storage || typeof storage.setItem !== 'function' || typeof storage.getItem !== 'function') {
        return { ok: false, error: 'Zapis lokalny jest niedostępny.' };
      }
      // Observe revisions written by other tabs before issuing the next one.
      // The game itself is responsible for merging the newly read game state.
      const observed = read();
      if (observed.kind === 'unavailable') return { ok: false, error: observed.error };
      if (maxRevision >= Number.MAX_SAFE_INTEGER) return { ok: false, error: 'Osiągnięto limit wersji zapisu.' };
      let body;
      let payload;
      let raw;
      const revision = maxRevision + 1;
      try {
        if (!object(state)) throw new TypeError('Nieprawidłowy stan gry.');
        body = clone(state);
        delete body.integrity;
        body.storageWarning = null;
        raw = { ...body, integrity: { format: FORMAT, revision, checksum: checksum(body, revision) } };
        payload = JSON.stringify(raw);
      } catch (_) { return { ok: false, error: 'Nie udało się przygotować poprawnego zapisu gry.' }; }
      try { storage.setItem(key, payload); }
      catch (_) { return { ok: false, error: 'Nie udało się zapisać postępu. Zachowaj tę kartę otwartą.' }; }
      // Once the primary write succeeds, its state is committed even if the
      // backup later exceeds the quota. Never roll back a successful primary.
      trusted = { payload, raw: clone(raw), revision };
      maxRevision = revision;
      protectedSave = true;
      remember(payload, { kind: 'valid', payload, raw, revision, sealed: true });
      try {
        storage.setItem(backupKey, payload);
        return { ok: true, payload, revision, backupOk: true };
      } catch (_) {
        return { ok: true, payload, revision, backupOk: false,
          error: 'Postęp zapisano, ale nie udało się odświeżyć kopii zapasowej. Zachowaj tę kartę otwartą.' };
      }
    }
    return Object.freeze({ read, write, get protected() { return protectedSave; } });
  }
  return Object.freeze({ BACKUP_SUFFIX, createGuard });
});

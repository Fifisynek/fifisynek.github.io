/* Deterministic descriptions from licensed community pattern tables.
 * Coverage and Fade percentages are community metrics, not official Valve grades.
 * No seed is assigned a fabricated monetary premium or an invented Blue Gem tier.
 */
(function (root, factory) {
  'use strict';
  const data = typeof module === 'object' && module.exports ? require('./pattern-data.js') : root.CasePatternData;
  const api = factory(data);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CasePatterns = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (data) {
  'use strict';
  if (!data || data.format !== 1) throw new Error('Najpierw załaduj tabele wzorów (pattern-data.js).');
  const clone = value => JSON.parse(JSON.stringify(value));
  const validSeed = seed => Number.isSafeInteger(seed) && seed >= 0 && seed <= 1000;
  const format = value => value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const labels = { 'case-hardened': 'Case Hardened', 'heat-treated': 'Heat Treated', fade: 'Fade', 'marble-fade': 'Marble Fade', doppler: 'Doppler', 'gamma-doppler': 'Gamma Doppler', 'tiger-tooth': 'Tiger Tooth', slaughter: 'Slaughter', 'crimson-web': 'Crimson Web', other: 'Wzór malowania', vanilla: 'Bez malowania' };
  function family(skin = {}) {
    if (skin.noWear) return 'vanilla';
    const name = String(skin.patternName || skin.name || '').toLowerCase();
    if (name.includes('heat treated')) return 'heat-treated';
    if (name.includes('case hardened')) return 'case-hardened';
    if (name.includes('gamma doppler')) return 'gamma-doppler';
    if (name.includes('doppler')) return 'doppler';
    if (name.includes('marble fade')) return 'marble-fade';
    if (/^(?:amber |acid )?fade$/.test(name)) return 'fade';
    if (name.includes('tiger tooth')) return 'tiger-tooth';
    if (name.includes('slaughter')) return 'slaughter';
    if (name.includes('crimson web')) return 'crimson-web';
    return labels[skin.patternFamily] ? skin.patternFamily : 'other';
  }
  function describe(skin = {}, requestedSeed = skin.paintSeed) {
    const seed = validSeed(requestedSeed) ? requestedSeed : null;
    const kind = family(skin);
    const paintIndex = Number.isSafeInteger(skin.paintIndex) ? skin.paintIndex : null;
    const phase = skin.phase || data.phases[String(paintIndex)]?.phase || null;
    const result = { seed, family: kind, label: labels[kind], defIndex: Number.isSafeInteger(skin.defIndex) ? skin.defIndex : null, paintIndex,
      fadePercent: null, bluePercent: null, purplePercent: null, goldPercent: null,
      backside: { bluePercent: null, purplePercent: null, goldPercent: null }, patternTier: null, phase,
      sourceUrl: null, approximate: false, dataMatched: false, metric: null };
    if (kind === 'vanilla') { result.seed = null; return result; }
    if (kind === 'doppler' || kind === 'gamma-doppler') {
      result.label += phase ? ' · ' + phase : '';
      result.sourceUrl = data.metadata.sources.phases.url;
      result.dataMatched = Boolean(phase);
      result.metric = phase ? 'paint-index-phase' : null;
      return result;
    }
    if (seed === null) { result.label += ' · seed nieznany'; return result; }
    if (kind === 'fade') {
      const name = String(skin.patternName || skin.name || '').toLowerCase();
      const fadeFamily = name.includes('amber fade') ? 'amber-fade' : name.includes('acid fade') ? 'acid-fade' : 'fade';
      const weapon = String(skin.weapon || '').replace(/^★\s*/, '').trim();
      const percentage = data.fade[fadeFamily]?.[weapon]?.[seed];
      if (Number.isFinite(percentage)) {
        result.fadePercent = percentage;
        result.label = (fadeFamily === 'amber-fade' ? 'Amber Fade' : fadeFamily === 'acid-fade' ? 'Acid Fade' : 'Fade') + ' · ' + format(percentage) + '%';
        result.sourceUrl = data.metadata.sources[fadeFamily === 'amber-fade' ? 'amber' : fadeFamily === 'acid-fade' ? 'acid' : 'fade'].url;
        result.approximate = true;
        result.dataMatched = true;
        result.metric = 'community-calculated-fade';
        return result;
      }
    }
    if (kind === 'case-hardened' || kind === 'heat-treated') {
      const coverage = data.coverage[`${skin.defIndex}:${paintIndex}`]?.[seed];
      if (coverage) {
        [result.bluePercent, result.backside.bluePercent, result.purplePercent, result.backside.purplePercent, result.goldPercent, result.backside.goldPercent] = coverage;
        result.label += result.bluePercent === null ? ' · seed #' + seed : ' · ' + format(result.bluePercent) + '% niebieskiego';
        result.sourceUrl = data.metadata.sources.coverage.url;
        result.approximate = true;
        result.dataMatched = true;
        result.metric = 'community-playside-colour-coverage';
        return result;
      }
    }
    result.label += ' · seed #' + seed;
    return result;
  }
  return Object.freeze({ family, describe, isValidSeed: validSeed, getMetadata: () => clone(data.metadata) });
});

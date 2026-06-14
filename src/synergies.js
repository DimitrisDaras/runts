/**
 * @fileoverview Tribe synergy calculations — pure functions, no DOM access.
 */

/** @type {Object.<string,{icon:string,label:string}>} */
const TRIBE_META = {
  warrior: { icon: '⚔️', label: 'Warrior' },
  mage:    { icon: '🔮', label: 'Mage'    },
  beast:   { icon: '🐾', label: 'Beast'   },
  rogue:   { icon: '🗡️', label: 'Rogue'  },
  support: { icon: '💚', label: 'Support' },
};

/**
 * @typedef {{
 *   atkMult: number,
 *   aoeChance: number,
 *   hpMult: number,
 *   synergyRegen: number,
 *   healPerRound: number,
 *   critChance: number,
 *   blockBonus: number,
 *   active: Array<{icon:string, name:string, desc:string}>
 * }} Synergies
 */

/**
 * Count tribe members in an array of minions.
 * @param {Object[]} minions
 * @returns {Object.<string,number>}
 */
function countTribes(minions) {
  const counts = {};
  for (const m of minions) {
    if (m.tribe) counts[m.tribe] = (counts[m.tribe] || 0) + 1;
  }
  return counts;
}

/**
 * Calculate all active synergy bonuses for a given ally roster.
 * @param {Object[]} allies
 * @returns {Synergies}
 */
function calcSynergies(allies) {
  const t = countTribes(allies);

  const bonuses = {
    atkMult:      1.0,
    aoeChance:    0.30,
    hpMult:       1.0,
    synergyRegen: 0,
    healPerRound: 0,
    critChance:   0.30,
    blockBonus:   0.0,
    active:       [],
  };

  const w = t.warrior || 0;
  if (w >= 3) {
    bonuses.atkMult = 1.30;
    bonuses.active.push({ icon: '⚔️', name: 'Warrior ×3', desc: '+30% ATK' });
  } else if (w >= 2) {
    bonuses.atkMult = 1.15;
    bonuses.active.push({ icon: '⚔️', name: 'Warrior ×2', desc: '+15% ATK' });
  }

  const m = t.mage || 0;
  if (m >= 2) {
    bonuses.aoeChance = 0.55;
    bonuses.active.push({ icon: '🔮', name: 'Mage ×2', desc: 'AOE 55%' });
  }

  const b = t.beast || 0;
  if (b >= 3) {
    bonuses.hpMult       = 1.35;
    bonuses.synergyRegen = 3;
    bonuses.active.push({ icon: '🐾', name: 'Beast ×3', desc: '+35% HP + Regen 3' });
  } else if (b >= 2) {
    bonuses.hpMult = 1.20;
    bonuses.active.push({ icon: '🐾', name: 'Beast ×2', desc: '+20% HP' });
  }

  const r = t.rogue || 0;
  if (r >= 2) {
    bonuses.critChance = 0.50;
    bonuses.active.push({ icon: '🗡️', name: 'Rogue ×2', desc: 'Crit 50%' });
  }

  const s = t.support || 0;
  if (s >= 3) {
    bonuses.healPerRound = 6;
    bonuses.blockBonus   = 0.15;
    bonuses.active.push({ icon: '💚', name: 'Support ×3', desc: 'Heal 6/rnd + Block +15%' });
  } else if (s >= 2) {
    bonuses.healPerRound = 3;
    bonuses.active.push({ icon: '💚', name: 'Support ×2', desc: 'Heal 3/rnd' });
  }

  return bonuses;
}

/**
 * Apply temporary synergy stat boosts to allies before a battle.
 * Saves originals in `m._base` for restoration via restoreSynergies.
 * Also heals allies to their boosted max HP.
 * @param {Object[]} allies
 * @param {Synergies} syn
 */
function applyTempSynergies(allies, syn) {
  for (const m of allies) {
    m._base = { atk: m.atk, maxHp: m.maxHp };
    if (syn.atkMult !== 1.0) m.atk   = Math.round(m.atk   * syn.atkMult);
    if (syn.hpMult  !== 1.0) m.maxHp = Math.round(m.maxHp * syn.hpMult);
    // HP is NOT reset to max — injury system carries HP between waves.
    // Rest heal (20%) is applied separately in advanceToNextWave.
  }
}

/**
 * Restore ally base stats that were boosted by applyTempSynergies.
 * @param {Object[]} allies
 */
function restoreSynergies(allies) {
  for (const m of allies) {
    if (!m._base) continue;
    m.atk   = m._base.atk;
    m.maxHp = m._base.maxHp;
    // Cap HP if it somehow exceeded restored maxHp (e.g. regen during Beast HP boost)
    if (m.hp > m.maxHp) m.hp = m.maxHp;
    delete m._base;
  }
}

/**
 * Return a hint string if adding `candidate` to `allies` unlocks or upgrades a synergy.
 * @param {Object[]} allies
 * @param {Object} candidate
 * @returns {string}  e.g. "🐾 Beast ×2!" or ''
 */
function recruitSynergyHint(allies, candidate) {
  const beforeNames = new Set(calcSynergies(allies).active.map(s => s.name));
  const newOnes = calcSynergies([...allies, candidate]).active.filter(s => !beforeNames.has(s.name));
  return newOnes.map(s => `${s.icon} ${s.name}!`).join(' ');
}

/**
 * Recompute skillTier and activeSkillId for every ally based on duplicate counts.
 * Returns minions that just crossed from tier 1 → tier 2 (newly evolved this call).
 * @param {Object[]} allies
 * @returns {Object[]} newly evolved allies
 */
function updateSkillTiers(allies) {
  const counts = {};
  for (const a of allies) counts[a.name] = (counts[a.name] || 0) + 1;

  const evolved = [];
  for (const a of allies) {
    if (!a.skill) continue;
    const wasT1   = (a.skillTier || 1) < 2;
    const newTier = counts[a.name] >= 2 ? 2 : 1;
    if (wasT1 && newTier === 2) evolved.push(a);
    a.skillTier     = newTier;
    a.activeSkillId = newTier === 2 ? a.skill.tier2.id : a.skill.tier1.id;
  }
  return evolved;
}

/**
 * Return the active skill object (tier1 or tier2) for a minion based on the roster.
 * @param {Object} minion
 * @param {Object[]} allies
 * @returns {{ name:string, id:string, desc:string }|null}
 */
function getActiveSkill(minion, allies) {
  if (!minion.skill) return null;
  const count = allies.filter(a => a.name === minion.name).length;
  return count >= 2 ? minion.skill.tier2 : minion.skill.tier1;
}

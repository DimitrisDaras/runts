/**
 * @fileoverview Pure combat logic. No DOM access. No `def` stat.
 * Shield absorbs damage before HP; burn bypasses shield.
 * Range enemies bypass the melee-shields-range rule (can hit back row directly).
 */

// ── Skill helpers ────────────────────────────────────────────────────────────

/** @param {Object} m @returns {string} */
function skillOf(m) {
  return m.activeSkillId || m.trait || 'none';
}

/**
 * Block probability. Only skill-based blocking; no enemy trait fallback.
 * @param {Object} m @returns {number}
 */
function blockChance(m) {
  const sid = m.activeSkillId;
  if (sid === 'fortress')    return 0.40;
  if (sid === 'hibernation') return 0.45;
  if (sid === 'guard')       return 0.25;
  return 0;
}

/** @param {Object} m @returns {number} */
function effectiveAtk(m) {
  let atk = m.atk;
  const sid   = skillOf(m);
  const below = m.hp < m.maxHp * 0.5;
  if (sid === 'frenzy' && below) atk = Math.round(atk * 1.25);
  else if (sid === 'rage' && below) atk = Math.round(atk * 1.10);
  const slow = m.statuses?.slow || 0;
  if (slow) atk = Math.round(atk * (1 - slow));
  return Math.max(1, atk);
}

// ── Damage resolution ────────────────────────────────────────────────────────

/**
 * Compute raw hit damage. No DEF — damage = effectiveAtk, ±crit, ±block.
 * shadow_kill: crit ×2.2 at 55% floor chance.
 * @returns {{ damage:number, isCrit:boolean, isBlocked:boolean }}
 */
function calcDamage(attacker, defender, critChance) {
  const sid     = skillOf(attacker);
  const bChance = blockChance(defender);
  const isBlocked = bChance > 0 && Math.random() < bChance;

  let dmg    = effectiveAtk(attacker);
  let isCrit = false;

  const isShadow    = sid === 'shadow_kill';
  const critIds     = ['backstab', 'assassinate', 'shadow_kill', 'crit'];
  const critMult    = isShadow ? 2.2 : 1.8;
  const effCritChance = isShadow ? Math.max(critChance, 0.55) : critChance;

  if (critIds.includes(sid) || critIds.includes(attacker.trait)) {
    if (Math.random() < effCritChance) { dmg = Math.round(dmg * critMult); isCrit = true; }
  }

  if (isBlocked) dmg = Math.max(1, Math.round(dmg * 0.4));
  return { damage: Math.max(1, dmg), isCrit, isBlocked };
}

/**
 * Apply `rawDmg` to target, absorbing into shield first (unless ignoreShield).
 * Burn bypasses shield — callers pass ignoreShield=true for burn.
 * Returns shield events only; HP mutation is done here too.
 * @returns {Object[]}
 */
function applyDamage(target, rawDmg, ignoreShield) {
  const events  = [];
  let remaining = rawDmg;

  if (!ignoreShield && target.shield > 0) {
    const absorbed = Math.min(remaining, target.shield);
    target.shield -= absorbed;
    remaining     -= absorbed;
    events.push({ type: 'shield_absorb', minion: target, amount: absorbed });
    if (target.shield === 0) events.push({ type: 'shield_break', minion: target });
  }

  if (remaining > 0) target.hp -= remaining;
  return events;
}

// ── Burn ─────────────────────────────────────────────────────────────────────

function applyBurn(target, dmg, turns, events) {
  target.statuses.burn      = Math.max(target.statuses.burn || 0, dmg);
  target.statuses.burnTurns = Math.max(target.statuses.burnTurns || 0, turns);
  events.push({ type: 'burn_apply', target, dmg, turns });
}

// ── Debuffs ──────────────────────────────────────────────────────────────────

function applyHitDebuffs(attacker, target, events) {
  const sid = skillOf(attacker);
  if (sid === 'blizzard') {
    target.statuses.slow = Math.min(0.75, (target.statuses.slow || 0) + 0.25);
    events.push({ type: 'slow', target, amount: 0.25 });
    if (Math.random() < 0.20) { target.statuses.frozen = true; events.push({ type: 'freeze', target }); }
  } else if (sid === 'slow') {
    target.statuses.slow = Math.min(0.75, (target.statuses.slow || 0) + 0.10);
    events.push({ type: 'slow', target, amount: 0.10 });
  }
}

// ── Defense-side effects ─────────────────────────────────────────────────────

function applyDefenseEffects(defender, damage, isBlocked, attackers, events) {
  const sid = skillOf(defender);
  if (sid === 'fortress' && isBlocked) {
    const alive = attackers.filter(m => m.alive);
    if (alive.length) {
      const weakest    = alive.reduce((a, b) => a.hp < b.hp ? a : b);
      const reflectDmg = Math.max(1, Math.round(damage * 0.20));
      events.push({ type: 'reflect', source: defender, target: weakest, damage: reflectDmg });
      events.push(...applyDamage(weakest, reflectDmg, false));
      if (weakest.hp <= 0 && weakest.alive) {
        weakest.hp = 0; weakest.alive = false;
        events.push({ type: 'death', minion: weakest });
      }
    }
  }
  if (sid === 'hibernation' && !isBlocked) {
    const surge = Math.round(damage * 0.50);
    defender.hp = Math.min(defender.maxHp, defender.hp + surge);
    events.push({ type: 'hibernate', minion: defender, amount: surge });
  }
}

// ── Single hit ───────────────────────────────────────────────────────────────

/**
 * @param {boolean} isAoe
 * @param {Object[]} defenderAllies  alive list on ATTACKING side (for fortress reflect)
 */
function doSingleHit(attacker, target, critChance, isAoe, defenderAllies) {
  const events       = [];
  const sid          = skillOf(attacker);
  const ignoreShield = sid === 'assassinate' || sid === 'shadow_kill';
  const { damage, isCrit, isBlocked } = calcDamage(attacker, target, critChance);

  events.push({ type: isAoe ? 'aoe' : isCrit ? 'crit' : 'hit',
                attacker, target, damage, isCrit, isBlocked, isAoe });

  events.push(...applyDamage(target, damage, ignoreShield));

  if (target.hp <= 0) {
    target.hp = 0; target.alive = false;
    events.push({ type: 'death', minion: target });
  } else {
    applyDefenseEffects(target, damage, isBlocked, defenderAllies, events);
  }
  return events;
}

// ── Targeting ────────────────────────────────────────────────────────────────

/**
 * Return ordered primary targets for an attacker.
 * - Enemy melee: must hit ally melee first (range only reachable when melee all dead)
 * - Enemy range: can snipe any ally directly (bypasses melee shield)
 * - Ally melee: prefers enemy melee
 * - Ally range: snipes any enemy by lowest HP
 * @param {Object} attacker
 * @param {Object[]} defenders  alive only
 * @param {boolean} isAllyTurn
 * @returns {Object[]}
 */
function getTargetPool(attacker, defenders, isAllyTurn) {
  const byHp  = (a, b) => a.hp - b.hp;
  const melee = defenders.filter(d => d.type === 'melee');

  if (!isAllyTurn) {
    if (attacker.type === 'range') {
      // Enemy range: bypasses melee shield, targets any ally by lowest HP
      return defenders.slice().sort(byHp);
    }
    // Enemy melee: must hit ally melee first
    return (melee.length ? melee : defenders).slice().sort(byHp);
  }

  if (attacker.type === 'range') {
    return defenders.slice().sort(byHp);
  }
  return (melee.length ? melee : defenders).slice().sort(byHp);
}

/**
 * Return all valid AOE targets for an attacker.
 * - Enemy range AOE: hits any ally (no melee shield)
 * - Enemy melee AOE: blocked by melee shield (only hits melee when alive)
 * - Ally AOE: hits all enemies
 * @param {Object} attacker
 * @param {Object[]} defenders  alive only
 * @param {boolean} isAllyTurn
 * @returns {Object[]}
 */
function getAoeTargets(attacker, defenders, isAllyTurn) {
  if (!isAllyTurn) {
    if (attacker.type === 'range') return defenders.slice();
    const melee = defenders.filter(d => d.type === 'melee');
    return melee.length ? melee : defenders;
  }
  return defenders.slice();
}

// ── Full attack dispatch ──────────────────────────────────────────────────────

/**
 * @param {Object} attacker
 * @param {Object[]} primaryTargets  from getTargetPool
 * @param {Object[]} aoeTargets      from getAoeTargets
 * @param {Object[]} defenderAllies  alive on ATTACKING side (for fortress reflect)
 * @param {number} critChance
 * @param {Object|null} syn
 * @returns {Object[]}
 */
function doAttack(attacker, primaryTargets, aoeTargets, defenderAllies, critChance, syn) {
  const events = [];
  const sid    = skillOf(attacker);

  if (!primaryTargets.length) return events;

  if (attacker.statuses.frozen) {
    delete attacker.statuses.frozen;
    events.push({ type: 'frozen_skip', minion: attacker });
    return events;
  }

  const target = primaryTargets[0];

  // AOE family
  const isNapalm = sid === 'napalm';
  const isMeteor = sid === 'meteor';
  const isAoe30  = sid === 'aoe_30' || sid === 'aoe';
  const aoeBase  = isNapalm ? 0.55 : isMeteor ? 0.60 : isAoe30 ? 0.30 : 0;
  if (aoeBase > 0 && Math.random() < aoeBase + (syn?.aoeChance || 0)) {
    for (const t of aoeTargets) {
      if (!t.alive) continue;
      events.push(...doSingleHit(attacker, t, critChance, true, defenderAllies));
      if (isNapalm && t.alive) applyBurn(t, 3, 2, events);
      if (isMeteor && t.alive) applyBurn(t, 2, 2, events);
    }
    return events;
  }

  // Cleave: hit primary twice + 50% splash
  if (sid === 'cleave') {
    events.push(...doSingleHit(attacker, target, critChance, false, defenderAllies));
    if (target.alive)
      events.push(...doSingleHit(attacker, target, critChance, false, defenderAllies));
    const second = primaryTargets[1] || aoeTargets.find(t => t !== target && t.alive);
    if (second?.alive) {
      const splashDmg = Math.max(1, Math.round(effectiveAtk(attacker) * 0.5));
      events.push({ type: 'splash', attacker, target: second, damage: splashDmg });
      events.push(...applyDamage(second, splashDmg, false));
      if (second.hp <= 0) {
        second.hp = 0; second.alive = false;
        events.push({ type: 'death', minion: second });
      }
    }
    return events;
  }

  // Slash: 20% to attack twice
  if (sid === 'slash') {
    events.push(...doSingleHit(attacker, target, critChance, false, defenderAllies));
    if (Math.random() < 0.20 && target.alive)
      events.push(...doSingleHit(attacker, target, critChance, false, defenderAllies));
    return events;
  }

  // Volley: first strike + 30% second shot
  if (sid === 'volley') {
    events.push(...doSingleHit(attacker, target, critChance, false, defenderAllies));
    if (Math.random() < 0.30) {
      const others = aoeTargets.filter(t => t !== target && t.alive);
      if (others.length) {
        const t2 = others[Math.floor(Math.random() * others.length)];
        events.push(...doSingleHit(attacker, t2, critChance, false, defenderAllies));
      }
    }
    return events;
  }

  // Default single hit
  events.push(...doSingleHit(attacker, target, critChance, false, defenderAllies));
  applyHitDebuffs(attacker, target, events);
  return events;
}

// ── Per-turn status ticks ────────────────────────────────────────────────────

/** Burn bypasses shield — hits HP directly. */
function applyStatusTick(minions) {
  const events = [];
  for (const m of minions) {
    if (!m.alive) continue;
    const burn = m.statuses.burn || 0;
    if (burn > 0) {
      m.hp -= burn;
      events.push({ type: 'burn_tick', minion: m, damage: burn });
      m.statuses.burnTurns = (m.statuses.burnTurns || 1) - 1;
      if (m.statuses.burnTurns <= 0) { delete m.statuses.burn; delete m.statuses.burnTurns; }
      if (m.hp <= 0) {
        m.hp = 0; m.alive = false;
        events.push({ type: 'death', minion: m });
      }
    }
  }
  return events;
}

// ── Regen tick ───────────────────────────────────────────────────────────────

function applyRegen(allies, syn) {
  const events = [];
  let bloomer  = null;

  for (const m of allies) {
    if (!m.alive) continue;
    const sid = skillOf(m);
    if (sid === 'bloom') {
      bloomer = m;
      const h = Math.min(5, m.maxHp - m.hp); m.hp += h;
      if (h > 0) events.push({ type: 'regen', minion: m, amount: h });
    } else if (sid === 'regen_2') {
      const h = Math.min(2, m.maxHp - m.hp); m.hp += h;
      if (h > 0) events.push({ type: 'regen', minion: m, amount: h });
    }
    if (sid === 'frenzy' && m.hp < m.maxHp * 0.5) {
      const h = Math.min(3, m.maxHp - m.hp); m.hp += h;
      if (h > 0) events.push({ type: 'regen', minion: m, amount: h });
    }
  }

  if (bloomer) {
    const others  = allies.filter(m => m.alive && m !== bloomer);
    const weakest = others.length ? others.reduce((a, b) => a.hp < b.hp ? a : b) : null;
    if (weakest) {
      const h = Math.min(3, weakest.maxHp - weakest.hp);
      if (h > 0) { weakest.hp += h; events.push({ type: 'bloom_heal', healer: bloomer, target: weakest, amount: h }); }
    }
  }

  if (syn?.synergyRegen) {
    for (const m of allies) {
      if (!m.alive) continue;
      const h = Math.min(syn.synergyRegen, m.maxHp - m.hp);
      if (h > 0) { m.hp += h; events.push({ type: 'synregen', minion: m, amount: h }); }
    }
  }

  if (syn?.healPerRound) {
    const alive   = allies.filter(m => m.alive);
    const weakest = alive.length ? alive.reduce((a, b) => a.hp < b.hp ? a : b) : null;
    if (weakest) {
      const h = Math.min(syn.healPerRound, weakest.maxHp - weakest.hp);
      if (h > 0) { weakest.hp += h; events.push({ type: 'synheal', minion: weakest, amount: h }); }
    }
  }

  return events;
}

// ── Sort ─────────────────────────────────────────────────────────────────────

function sortByFirst(minions) {
  const firstIds = ['first_strike', 'volley', 'first'];
  return minions.slice().sort((a, b) => {
    const aF = firstIds.includes(skillOf(a)) ? 0 : 1;
    const bF = firstIds.includes(skillOf(b)) ? 0 : 1;
    return aF - bF;
  });
}

// ── Turn resolution ──────────────────────────────────────────────────────────

/**
 * @param {Object[]} allies
 * @param {Object[]} enemies
 * @param {Object|null} syn
 * @returns {Object[]}
 */
function resolveTurn(allies, enemies, syn) {
  const events     = [];
  const critChance = 0.20 + (syn?.critChance || 0);

  const aliveAllies  = () => allies.filter(m => m.alive);
  const aliveEnemies = () => enemies.filter(m => m.alive);

  events.push(...applyStatusTick([...allies, ...enemies]));
  if (getBattleResult(allies, enemies)) return events;

  for (const a of sortByFirst(aliveAllies())) {
    const alive = aliveEnemies();
    if (!alive.length) break;
    events.push(...doAttack(a, getTargetPool(a, alive, true), getAoeTargets(a, alive, true), aliveAllies(), critChance, syn));
    if (!aliveEnemies().length) break;
  }
  if (getBattleResult(allies, enemies)) return events;

  for (const e of sortByFirst(aliveEnemies())) {
    const alive = aliveAllies();
    if (!alive.length) break;
    events.push(...doAttack(e, getTargetPool(e, alive, false), getAoeTargets(e, alive, false), aliveEnemies(), 0.20, null));
    if (!aliveAllies().length) break;
  }

  events.push(...applyRegen(aliveAllies(), syn));
  return events;
}

// ── Win/loss check ───────────────────────────────────────────────────────────

/**
 * @returns {'ally'|'enemy'|null}
 */
function getBattleResult(allies, enemies) {
  const ae = allies.every(m => !m.alive);
  const ee = enemies.every(m => !m.alive);
  if (ee && ae) return 'enemy';
  if (ee) return 'ally';
  if (ae) return 'enemy';
  return null;
}

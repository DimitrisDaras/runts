/**
 * @fileoverview Game state, orchestration, and all screen flow logic.
 */

const state = {
  wave:              1,
  score:             0,
  totalTurns:        0,
  allies:            [],
  nextId:            0,
  graveyard:         [],
  graveyardCount:    0,       // combat deaths only (not retirements)
  graveyardAtkMult:  1.0,     // cumulative permanent ATK multiplier
  graveyardBonusTier: 0,      // how many 3-death bonus tiers have triggered
  currentEnemies:    [],      // pre-generated enemies shown as wave preview
};

/** @param {number} ms @returns {Promise<void>} */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function nextId() { return state.nextId++; }

// ── Recruit pool (wave-gated by rarity) ───────────────────────────────────────

/**
 * Return the subset of ALLY_POOL available at the given wave.
 * Draft always uses common only (wave 1).
 * @param {number} wave
 * @returns {Object[]}
 */
function getRecruitPool(wave) {
  if (wave <= 3)  return ALLY_POOL.filter(m => m.rarity === 'common');
  if (wave <= 6)  return ALLY_POOL.filter(m => ['common', 'uncommon'].includes(m.rarity));
  if (wave <= 10) return ALLY_POOL.filter(m => ['common', 'uncommon', 'rare'].includes(m.rarity));
  return ALLY_POOL;
}

// ── Graveyard bonus ───────────────────────────────────────────────────────────

/**
 * Record a minion death/retirement in the graveyard.
 * Combat deaths (retired=false) count toward the +5% ATK bonus.
 * Returns true if a new bonus tier was triggered.
 * @param {Object} m
 * @param {number} wave
 * @param {boolean} retired  true = player-removed, not killed
 * @returns {boolean}
 */
function addToGraveyard(m, wave, retired = false) {
  state.graveyard.push({ id: m.id, name: m.name, emoji: m.emoji, wave, retired });
  if (retired) return false;

  state.graveyardCount++;
  const newTier = Math.floor(state.graveyardCount / 3);
  if (newTier > state.graveyardBonusTier) {
    state.graveyardBonusTier = newTier;
    state.graveyardAtkMult   = Math.pow(1.05, newTier);
    // Apply +5% ATK to every current alive ally (restoreSynergies already ran)
    for (const ally of state.allies) {
      ally.atk = Math.round(ally.atk * 1.05);
    }
    return true;
  }
  return false;
}

// ── Rest heal ─────────────────────────────────────────────────────────────────

/** Heal all alive allies 20% of their base maxHp (called after each recruit phase). */
function applyRestHeal() {
  for (const ally of state.allies) {
    if (!ally.alive) continue;
    const healAmt = Math.round(ally.maxHp * 0.2);
    ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
  }
}

// ── Draft ────────────────────────────────────────────────────────────────────

function initGame() {
  state.wave              = 1;
  state.score             = 0;
  state.totalTurns        = 0;
  state.nextId            = 0;
  state.allies            = [];
  state.graveyard         = [];
  state.graveyardCount    = 0;
  state.graveyardAtkMult  = 1.0;
  state.graveyardBonusTier = 0;
  state.currentEnemies    = [];
  startDraft();
}

const draft = { pool: [], pickedEmojis: [] };

function startDraft() {
  // Draft always uses common-only pool
  const commonPool = ALLY_POOL.filter(m => m.rarity === 'common');
  draft.pool         = pickRandom(commonPool, 5).map(tpl => spawnMinion(tpl, 'ally', 1, nextId()));
  draft.pickedEmojis = [];
  renderDraftScreen(draft.pool, 0, [], onDraftPick);
  showScreen('draft');
}

function onDraftPick(idx) {
  const chosen = draft.pool.splice(idx, 1)[0];
  state.allies.push(chosen);
  draft.pickedEmojis.push(chosen.emoji);

  updateSkillTiers(state.allies);

  if (state.allies.length >= 3) {
    // Draft complete — pre-generate wave 1 enemies and show battle screen
    state.currentEnemies = buildEnemyWave();
    const syn = calcSynergies(state.allies);
    renderHud(state.wave, state.score);
    renderBattlefield(state.allies, state.currentEnemies);
    renderSynergyBar(syn);
    renderBossWarning(state.wave % 5 === 0);
    clearLog();
    if (state.wave % 5 === 0) logLine('⚠️ BOSS WAVE — Prepare yourself!', 'log-death');
    logLine(`⚔️ Squad assembled! ${state.currentEnemies.length} enemies await.`, 'log-wave');
    document.getElementById('btn-battle').disabled = false;
    showScreen('battle');
    return;
  }

  renderDraftScreen(draft.pool, state.allies.length, draft.pickedEmojis, onDraftPick);
}

// ── Wave setup ────────────────────────────────────────────────────────────────

/**
 * Build the enemy wave scaled to the current wave number.
 * Wave 1-3: melee enemies only.
 * Wave 4+: all enemies.
 * Boss every 5 waves.
 * @returns {Object[]}
 */
function buildEnemyWave() {
  if (state.wave % 5 === 0) {
    const bossTpl = getBossTemplate(state.wave);
    const boss    = spawnMinion(bossTpl, 'enemy', state.wave, nextId());
    boss.statuses = {};
    return [boss];
  }

  const pool  = state.wave <= 3
    ? ENEMY_POOL.filter(e => e.type === 'melee')
    : ENEMY_POOL;
  const count = Math.min(2 + Math.floor(state.wave / 2), 6);
  return pickRandom(pool, Math.min(count, pool.length)).map(tpl => {
    const m = spawnMinion(tpl, 'enemy', state.wave, nextId());
    m.statuses = {};
    return m;
  });
}

// ── Advance to next wave ──────────────────────────────────────────────────────

/**
 * Apply rest heal, increment wave, pre-generate enemies, show battle screen.
 * Called after every recruit phase (pick, skip, or manage squad cancel).
 */
function advanceToNextWave() {
  applyRestHeal();
  state.wave++;
  state.currentEnemies = buildEnemyWave();

  const syn = calcSynergies(state.allies);
  renderHud(state.wave, state.score);
  renderBattlefield(state.allies, state.currentEnemies);
  renderSynergyBar(syn);
  renderBossWarning(state.wave % 5 === 0);
  renderGraveyardCounter(state.graveyardCount, state.graveyardBonusTier);
  clearLog();

  if (state.wave % 5 === 0) logLine('⚠️ BOSS WAVE — Prepare yourself!', 'log-death');
  logLine(`⏭ Wave ${state.wave} — ${state.currentEnemies.length} enemies incoming.`, 'log-wave');
  if (syn.active.length)
    logLine(`⬡ Active: ${syn.active.map(s => `${s.icon} ${s.name}`).join(' · ')}`, 'log-wave');

  document.getElementById('btn-battle').disabled = false;
  showScreen('battle');
}

// ── Battle ────────────────────────────────────────────────────────────────────

async function runBattle() {
  document.getElementById('btn-battle').disabled = true;
  clearLog();

  // Reset only status effects — HP/shield carry over (injury system)
  for (const ally of state.allies) {
    ally.statuses = {};
  }

  const syn = calcSynergies(state.allies);
  applyTempSynergies(state.allies, syn);   // boost stats but do NOT heal to full

  const enemies = state.currentEnemies;
  for (const e of enemies) { e.alive = true; e.statuses = {}; }

  renderBattlefield(state.allies, enemies);
  renderSynergyBar(syn);
  renderBossWarning(false);  // hide warning once battle starts

  logLine(`⚡ Wave ${state.wave} begins!${enemies[0]?.isBoss ? ' 👹 BOSS!' : ` ${enemies.length} enemies approach.`}`, 'log-wave');
  if (syn.active.length)
    logLine(`⬡ Synergies: ${syn.active.map(s => `${s.icon} ${s.name}`).join(' · ')}`, 'log-wave');

  await sleep(400);

  let turn = 1;
  while (true) {
    logLine(`— Turn ${turn} —`, 'log-wave');
    await sleep(200);

    const events = resolveTurn(state.allies, enemies, syn);
    state.totalTurns++;

    for (const ev of events) {
      renderCombatEvent(ev);
      await sleep(300);
    }

    const result = getBattleResult(state.allies, enemies);

    if (result === 'ally') {
      restoreSynergies(state.allies);

      // Remove dead allies permanently
      const fallen = state.allies.filter(m => !m.alive);
      state.allies  = state.allies.filter(m => m.alive);

      let bonusTriggered = 0;
      for (const m of fallen) {
        if (addToGraveyard(m, state.wave)) bonusTriggered++;
      }

      await sleep(300);
      logLine('🏆 Victory!', 'log-wave');

      if (bonusTriggered > 0) {
        logLine(`💀 Graveyard power rises! +5% ATK (${state.graveyardBonusTier * 5}% total bonus)`, 'log-wave');
        renderGraveyardCounter(state.graveyardCount, state.graveyardBonusTier);
        // Refresh battlefield cards to show updated ATK values
        renderBattlefield(state.allies, []);
      }

      state.score = state.wave * 10 + state.totalTurns;
      renderHud(state.wave, state.score);
      await sleep(600);
      startRecruit();
      return;
    }

    if (result === 'enemy') {
      restoreSynergies(state.allies);
      await sleep(300);
      logLine('💀 Defeated...', 'log-wave');
      await sleep(800);
      renderGameOver(state.wave - 1, state.score);
      return;
    }

    turn++;
    await sleep(150);
  }
}

// ── Recruit ───────────────────────────────────────────────────────────────────

function startRecruit() {
  // Work with alive allies only for composition checks
  const aliveAllies = state.allies.filter(m => m.alive);

  const pool      = getRecruitPool(state.wave);
  const ownedNames = new Set(aliveAllies.map(m => m.name));
  const avail     = pool.filter(tpl => !ownedNames.has(tpl.name));
  const finalPool = avail.length >= 3 ? avail : pool;
  const options   = pickRandom(finalPool, 3).map(tpl => spawnMinion(tpl, 'ally', 1, nextId()));

  function onSkip() {
    advanceToNextWave();
  }

  function onPick(idx) {
    const chosen   = options[idx];
    const sameType = aliveAllies.filter(m => m.type === chosen.type);

    if (sameType.length >= 3) {
      // Type slot limit reached — show manage screen for same type only
      const typeName = chosen.type === 'range' ? 'range' : 'melee';
      renderManageSquadScreen(
        sameType,
        chosen,
        `Too many ${typeName} units — remove one`,
        (removeIdx) => {
          const removed = sameType[removeIdx];
          state.allies  = state.allies.filter(m => m !== removed);
          addToGraveyard(removed, state.wave, true);
          finishRecruit(chosen);
        },
        () => advanceToNextWave()
      );
      showScreen('manage');
      return;
    }

    finishRecruit(chosen);
  }

  renderRecruitScreen(options, aliveAllies, onPick, onSkip);
  showScreen('recruit');
}

/**
 * Add the chosen recruit, apply graveyard ATK bonus, handle evolutions,
 * then advance to the next wave (which applies rest heal).
 * @param {Object} chosen  spawned minion instance
 */
function finishRecruit(chosen) {
  // Apply cumulative graveyard ATK bonus to the new recruit
  if (state.graveyardAtkMult > 1.0) {
    chosen.atk = Math.round(chosen.atk * state.graveyardAtkMult);
  }

  state.allies.push(chosen);
  const evolved = updateSkillTiers(state.allies);

  // Log evolutions (battlefield will be re-rendered in advanceToNextWave)
  for (const m of evolved) {
    m.lastEvolution = true; // flag for post-render animation
  }

  // advanceToNextWave applies rest heal, increments wave, pre-generates enemies
  advanceToNextWave();

  // Announce recruit + evolutions in the now-active battle screen log
  logLine(`✅ ${chosen.emoji} ${chosen.name} joined your team!`, 'log-heal');
  for (const m of evolved) {
    logLine(`⬆ ${m.emoji} ${m.name} evolved to Tier 2 — ${m.skill.tier2.name} unlocked!`, 'log-wave');
    animateEvolution(m);
    delete m.lastEvolution;
  }
}

// ── Button wiring ─────────────────────────────────────────────────────────────

document.getElementById('btn-start').addEventListener('click', initGame);
document.getElementById('btn-battle').addEventListener('click', runBattle);
document.getElementById('btn-restart').addEventListener('click', initGame);

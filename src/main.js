/**
 * @fileoverview Game state, orchestration, and all screen flow logic.
 */

const state = {
  wave:             1,
  score:            0,
  totalTurns:       0,
  allies:           [],
  nextId:           0,
  graveyard:        [],
  deathTokens:      0,      // spendable tokens; each combat death +1
  atkBuffTier:      0,      // how many +5% ATK buffs have been applied
  graveyardAtkMult: 1.0,    // 1.05^atkBuffTier; applied to new recruits
  currentEnemies:   [],     // pre-generated enemies shown as wave preview
  gold:             20,     // starting gold
  goldHistory:      [],     // [{ wave, earned }]
};

/** @param {number} ms @returns {Promise<void>} */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function nextId() { return state.nextId++; }

// ── Recruit pool (wave-gated by rarity) ───────────────────────────────────────

function getRecruitPool(wave) {
  if (wave <= 3)  return ALLY_POOL.filter(m => m.rarity === 'common');
  if (wave <= 6)  return ALLY_POOL.filter(m => ['common', 'uncommon'].includes(m.rarity));
  if (wave <= 10) return ALLY_POOL.filter(m => ['common', 'uncommon', 'rare'].includes(m.rarity));
  return ALLY_POOL;
}

// ── XP system ────────────────────────────────────────────────────────────────

/**
 * Grant 1 XP to a surviving unit. Returns true if the unit leveled up.
 * Level-up: +15% to maxHp, ATK, and maxShield; also gains the stat increase.
 * @param {Object} unit
 * @returns {boolean}
 */
function grantXP(unit) {
  unit.xp++;
  if (unit.xp < 3) return false;

  unit.xp = 0;
  unit.level++;

  const newMaxHp = Math.round(unit.maxHp * 1.15);
  unit.hp        = Math.min(unit.hp + (newMaxHp - unit.maxHp), newMaxHp);
  unit.maxHp     = newMaxHp;

  unit.atk = Math.round(unit.atk * 1.15);

  if (unit.maxShield > 0) {
    const newMaxShield = Math.round(unit.maxShield * 1.15);
    unit.shield        = Math.min(unit.shield + (newMaxShield - unit.maxShield), newMaxShield);
    unit.maxShield     = newMaxShield;
  }

  return true;
}

// ── Gold system ───────────────────────────────────────────────────────────────

/**
 * Award gold at the end of a wave. Boss waves give double.
 * Formula: base 5 + wave×2; boss waves ×2.
 * @param {number} wave
 * @returns {number} amount earned
 */
function earnGold(wave) {
  const base   = 5 + wave * 2;
  const earned = (wave % 5 === 0) ? base * 2 : base;
  state.gold  += earned;
  state.goldHistory.push({ wave, earned });
  return earned;
}

// ── Death token system ────────────────────────────────────────────────────────

function addToGraveyard(m, wave, retired = false) {
  state.graveyard.push({ id: m.id, name: m.name, emoji: m.emoji, wave, retired });
  if (!retired) state.deathTokens++;
}

function applyAtkBuff() {
  if (state.deathTokens < 3) return;
  state.deathTokens -= 3;
  state.atkBuffTier++;
  state.graveyardAtkMult = Math.pow(1.05, state.atkBuffTier);
  for (const ally of state.allies) ally.atk = Math.round(ally.atk * 1.05);
  renderTokenUI(state.deathTokens);
  renderBattlefield(state.allies, state.currentEnemies);
  logLine(`💪 +5% ATK buff activated! (${state.atkBuffTier * 5}% total bonus)`, 'log-wave');
}

function reviveUnit(entry) {
  if (state.deathTokens < 3) return;
  state.deathTokens -= 3;
  entry.revived = true;

  const tpl = [...ALLY_POOL, ...BOSS_POOL].find(m => m.name === entry.name);
  if (!tpl) return;

  const m  = spawnMinion(tpl, 'ally', 1, nextId());
  m.hp     = Math.round(m.maxHp * 0.4);
  m.shield = 0;
  if (state.graveyardAtkMult > 1.0) m.atk = Math.round(m.atk * state.graveyardAtkMult);
  state.allies.push(m);
  updateSkillTiers(state.allies);

  renderTokenUI(state.deathTokens);
  renderBattlefield(state.allies, state.currentEnemies);
  logLine(`⚡ ${m.emoji} ${m.name} has been revived at 40% HP!`, 'log-heal');
}

function openReviveScreen() {
  const revivable = state.graveyard.filter(e => !e.retired && !e.revived);

  function onPick(idx) {
    const entry = revivable[idx];
    renderReviveConfirm(
      entry,
      () => { reviveUnit(entry); showScreen('battle'); },
      () => showScreen('revive')
    );
    showScreen('revive-confirm');
  }

  renderReviveScreen(revivable, onPick, () => showScreen('battle'));
  showScreen('revive');
}

// ── Rest heal ─────────────────────────────────────────────────────────────────

function applyRestHeal() {
  for (const ally of state.allies) {
    if (!ally.alive) continue;
    ally.hp = Math.min(ally.maxHp, ally.hp + Math.round(ally.maxHp * 0.2));
  }
}

// ── Draft ────────────────────────────────────────────────────────────────────

function initGame() {
  state.wave             = 1;
  state.score            = 0;
  state.totalTurns       = 0;
  state.nextId           = 0;
  state.allies           = [];
  state.graveyard        = [];
  state.deathTokens      = 0;
  state.atkBuffTier      = 0;
  state.graveyardAtkMult = 1.0;
  state.currentEnemies   = [];
  state.gold             = 20;
  state.goldHistory      = [];
  startDraft();
}

const draft = { pool: [], pickedEmojis: [] };

function startDraft() {
  const commonPool   = ALLY_POOL.filter(m => m.rarity === 'common');
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
    state.currentEnemies = buildEnemyWave();
    const syn = calcSynergies(state.allies);
    renderHud(state.wave, state.score);
    renderGold(state.gold);
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

function advanceToNextWave() {
  applyRestHeal();
  state.wave++;
  state.currentEnemies = buildEnemyWave();

  const syn = calcSynergies(state.allies);
  renderHud(state.wave, state.score);
  renderGold(state.gold);
  renderBattlefield(state.allies, state.currentEnemies);
  renderSynergyBar(syn);
  renderBossWarning(state.wave % 5 === 0);
  renderTokenUI(state.deathTokens);
  clearLog();

  if (state.wave % 5 === 0) logLine('⚠️ BOSS WAVE — Prepare yourself!', 'log-death');
  logLine(`⏭ Wave ${state.wave} — ${state.currentEnemies.length} enemies incoming.`, 'log-wave');
  if (syn.active.length)
    logLine(`⬡ Active: ${syn.active.map(s => `${s.icon} ${s.name}`).join(' · ')}`, 'log-wave');

  document.getElementById('btn-battle').disabled = false;
  showScreen('battle');
}

/**
 * Called after every recruit phase (normal or boss).
 * Shows the shop if this was a shop wave (wave % 3 === 0), otherwise advances.
 */
function finishRecruitPhase() {
  if (state.wave % 3 === 0) {
    startShop();
  } else {
    advanceToNextWave();
  }
}

// ── Battle ────────────────────────────────────────────────────────────────────

async function runBattle() {
  document.getElementById('btn-battle').disabled = true;

  const tokenEl = document.getElementById('token-actions');
  if (tokenEl) tokenEl.style.pointerEvents = 'none';

  clearLog();

  for (const ally of state.allies) ally.statuses = {};

  const syn = calcSynergies(state.allies);
  applyTempSynergies(state.allies, syn);

  const enemies = state.currentEnemies;
  for (const e of enemies) { e.alive = true; e.statuses = {}; }

  renderBattlefield(state.allies, enemies);
  renderSynergyBar(syn);
  renderBossWarning(false);

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

      const fallen = state.allies.filter(m => !m.alive);
      state.allies  = state.allies.filter(m => m.alive);

      // Grant XP to survivors (after synergy restore, on base stats)
      const xpResults = state.allies.map(ally => ({ ally, leveled: grantXP(ally) }));

      for (const m of fallen) addToGraveyard(m, state.wave);

      const earned = earnGold(state.wave);

      if (tokenEl) tokenEl.style.pointerEvents = '';

      await sleep(300);
      logLine('🏆 Victory!', 'log-wave');
      logLine(`🪙 +${earned} gold earned! (Total: ${state.gold})`, 'log-wave');
      renderGold(state.gold);
      renderBattlefield(state.allies, []); // refresh cards to show updated XP/level

      for (const { ally, leveled } of xpResults) {
        if (leveled) {
          logLine(`🌟 ${ally.emoji} ${ally.name} leveled up! Now Lv.${ally.level}`, 'log-wave');
        } else {
          logLine(`⬆️ ${ally.emoji} ${ally.name} gained XP! (${ally.xp}/3)`, 'log-heal');
        }
      }

      if (fallen.length > 0) {
        logLine(`💀 ${state.deathTokens} token${state.deathTokens !== 1 ? 's' : ''} available${state.deathTokens >= 3 ? ' — revive or buff!' : ''}`, 'log-wave');
        renderTokenUI(state.deathTokens);
      }

      state.score = state.wave * 10 + state.totalTurns;
      renderHud(state.wave, state.score);
      await sleep(600);

      if (state.wave % 5 === 0) {
        startBossRecruit();
      } else {
        startRecruit();
      }
      return;
    }

    if (result === 'enemy') {
      restoreSynergies(state.allies);
      if (tokenEl) tokenEl.style.pointerEvents = '';
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

// ── Normal recruit ────────────────────────────────────────────────────────────

function startRecruit() {
  const aliveAllies = state.allies.filter(m => m.alive);
  const pool        = getRecruitPool(state.wave);
  const ownedNames  = new Set(aliveAllies.map(m => m.name));
  const avail       = pool.filter(tpl => !ownedNames.has(tpl.name));
  const finalPool   = avail.length >= 3 ? avail : pool;
  const options     = pickRandom(finalPool, 3).map(tpl => spawnMinion(tpl, 'ally', 1, nextId()));

  function onSkip() { finishRecruitPhase(); }

  function onPick(idx) {
    const chosen   = options[idx];
    const sameType = aliveAllies.filter(m => m.type === chosen.type);

    if (sameType.length >= 3) {
      const typeName = chosen.type === 'range' ? 'range' : 'melee';
      renderManageSquadScreen(
        sameType, chosen, `Too many ${typeName} units — remove one`,
        (removeIdx) => {
          const removed = sameType[removeIdx];
          state.allies  = state.allies.filter(m => m !== removed);
          addToGraveyard(removed, state.wave, true);
          finishRecruit(chosen);
        },
        () => finishRecruitPhase()
      );
      showScreen('manage');
      return;
    }

    finishRecruit(chosen);
  }

  renderRecruitScreen(options, aliveAllies, onPick, onSkip);
  showScreen('recruit');
}

function finishRecruit(chosen) {
  if (state.graveyardAtkMult > 1.0) {
    chosen.atk = Math.round(chosen.atk * state.graveyardAtkMult);
  }

  state.allies.push(chosen);
  const evolved = updateSkillTiers(state.allies);

  finishRecruitPhase(); // may show shop or advance

  logLine(`✅ ${chosen.emoji} ${chosen.name} joined your team!`, 'log-heal');
  for (const m of evolved) {
    logLine(`⬆ ${m.emoji} ${m.name} evolved to Tier 2 — ${m.skill.tier2.name} unlocked!`, 'log-wave');
    animateEvolution(m);
  }
}

// ── Boss recruit ──────────────────────────────────────────────────────────────

function startBossRecruit() {
  const aliveAllies   = state.allies.filter(m => m.alive);
  const bossDrop      = pickRandom(BOSS_POOL, 1).map(tpl => spawnMinion(tpl, 'ally', 1, nextId()))[0];
  const pool          = getRecruitPool(state.wave);
  const ownedNames    = new Set(aliveAllies.map(m => m.name));
  const avail         = pool.filter(tpl => !ownedNames.has(tpl.name));
  const finalPool     = avail.length >= 3 ? avail : pool;
  const normalOptions = pickRandom(finalPool, 3).map(tpl => spawnMinion(tpl, 'ally', 1, nextId()));

  function onNormalPick(idx) { finishBossRecruit(bossDrop, normalOptions[idx]); }
  function onSkip()          { finishBossRecruit(bossDrop, null); }

  renderBossRecruitScreen(bossDrop, normalOptions, aliveAllies, onNormalPick, onSkip);
  showScreen('boss-recruit');
}

let _bossQueue    = [];
let _bossQueueIdx = 0;
let _bossAdded    = [];

function finishBossRecruit(bossDrop, normalPick) {
  _bossQueue    = [bossDrop, normalPick].filter(Boolean);
  _bossQueueIdx = 0;
  _bossAdded    = [];
  processNextBossUnit();
}

function processNextBossUnit() {
  if (_bossQueueIdx >= _bossQueue.length) {
    const added   = _bossAdded;
    _bossQueue    = [];
    _bossQueueIdx = 0;
    _bossAdded    = [];
    const evolved = updateSkillTiers(state.allies);
    finishRecruitPhase(); // may show shop or advance
    for (const m of added)   logLine(`✅ ${m.emoji} ${m.name} joined your team!`, 'log-heal');
    for (const m of evolved) logLine(`⬆ ${m.emoji} ${m.name} evolved to Tier 2 — ${m.skill.tier2.name} unlocked!`, 'log-wave');
    return;
  }

  const chosen      = _bossQueue[_bossQueueIdx++];
  const aliveAllies = state.allies.filter(m => m.alive);
  const sameType    = aliveAllies.filter(m => m.type === chosen.type);

  if (sameType.length >= 3) {
    const typeName = chosen.type === 'range' ? 'range' : 'melee';
    renderManageSquadScreen(
      sameType, chosen, `Too many ${typeName} units — remove one`,
      (removeIdx) => {
        const removed = sameType[removeIdx];
        state.allies  = state.allies.filter(m => m !== removed);
        addToGraveyard(removed, state.wave, true);
        doAddRecruit(chosen);
        processNextBossUnit();
      },
      () => processNextBossUnit()
    );
    showScreen('manage');
    return;
  }

  doAddRecruit(chosen);
  processNextBossUnit();
}

function doAddRecruit(chosen) {
  if (state.graveyardAtkMult > 1.0) chosen.atk = Math.round(chosen.atk * state.graveyardAtkMult);
  state.allies.push(chosen);
  _bossAdded.push(chosen);
}

// ── Shop ─────────────────────────────────────────────────────────────────────

function startShop() {
  const offers = generateShopOffers();
  renderShopScreen(
    offers,
    state.allies.filter(m => m.alive),
    state.gold,
    state.wave,
    onShopBuy,
    onShopSkip
  );
  showScreen('shop');
}

function onShopBuy(offer, target) {
  if (state.gold < offer.cost) return;
  state.gold -= offer.cost;
  const msg = applyShopOffer(offer, target, state.allies.filter(m => m.alive));
  advanceToNextWave(); // clears log, transitions to battle screen
  logLine(msg, 'log-heal');
  renderGold(state.gold);
}

function onShopSkip() {
  advanceToNextWave();
}

// ── Button wiring ─────────────────────────────────────────────────────────────

document.getElementById('btn-start').addEventListener('click', initGame);
document.getElementById('btn-battle').addEventListener('click', runBattle);
document.getElementById('btn-restart').addEventListener('click', initGame);
document.getElementById('btn-open-revive').addEventListener('click', openReviveScreen);
document.getElementById('btn-take-buff').addEventListener('click', applyAtkBuff);

/**
 * @fileoverview All DOM rendering. Reads state only, never writes to it.
 */

// ── Screen management ────────────────────────────────────────────────────────

/** @param {string} name */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
}

// ── HUD ──────────────────────────────────────────────────────────────────────

function renderHud(wave, score) {
  document.getElementById('hud-wave').textContent  = `Wave ${wave}`;
  document.getElementById('hud-score').textContent = `Score: ${score}`;
}

/**
 * Show small counter (tokens < 3) or full action panel (tokens >= 3).
 * @param {number} tokens
 */
function renderTokenUI(tokens) {
  const counterEl = document.getElementById('hud-graveyard');
  const actionsEl = document.getElementById('token-actions');
  const countEl   = document.getElementById('token-count');

  if (tokens === 0) {
    if (counterEl) counterEl.hidden = true;
    if (actionsEl) actionsEl.hidden = true;
    return;
  }

  if (tokens >= 3) {
    if (counterEl) counterEl.hidden = true;
    if (actionsEl) actionsEl.hidden = false;
    if (countEl)   countEl.textContent = `💀 ${tokens} token${tokens !== 1 ? 's' : ''} — revive a unit or gain +5% ATK:`;
  } else {
    if (counterEl) { counterEl.textContent = `💀 ${tokens} token${tokens !== 1 ? 's' : ''}`; counterEl.hidden = false; }
    if (actionsEl) actionsEl.hidden = true;
  }
}

function renderBossWarning(isBoss) {
  const el = document.getElementById('boss-warning');
  if (el) el.hidden = !isBoss;
}

/** @param {number} gold */
function renderGold(gold) {
  const el = document.getElementById('hud-gold');
  if (el) el.textContent = `🪙 ${gold}`;
}

/** Render active relics row below the synergy bar. Hidden when no relics held. */
function renderRelicBar(relics) {
  const el = document.getElementById('relic-bar');
  if (!el) return;
  if (!relics?.length) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = relics.map(r =>
    `<span class="relic-chip" title="${r.name}: ${r.desc}">${r.emoji}<span class="relic-name">${r.name}</span></span>`
  ).join('');
}

// ── Minion cards ─────────────────────────────────────────────────────────────

/** @param {Object} minion @returns {HTMLElement} */
function buildMinionCard(minion) {
  const card = document.createElement('div');
  const rarityClass = minion.rarity ? ` rarity-${minion.rarity}` : '';
  card.className = `minion-card ${minion.side}${rarityClass}${minion.alive ? '' : ' dead'}`;
  card.id = `minion-${minion.id}`;

  if (minion._justLeveled) card.classList.add('level-up-glow');

  const hpPct     = Math.max(0, (minion.hp / minion.maxHp) * 100);
  const shPct     = minion.maxShield > 0
    ? Math.max(0, (minion.shield / minion.maxShield) * 100) : 0;
  const tribeMeta = TRIBE_META[minion.tribe] || { icon: '?', label: minion.tribe };
  const typeIcon  = minion.type === 'range' ? '🏹' : '⚔️';

  let skillBadge = '';
  if (minion.skill) {
    const skillObj  = minion.skillTier === 2 ? minion.skill.tier2 : minion.skill.tier1;
    const tierLabel = minion.skillTier === 2 ? '✦T2' : 'T1';
    skillBadge = `<span class="minion-skill${minion.skillTier === 2 ? ' t2' : ''}">${skillObj.name} <em>${tierLabel}</em></span>`;
  } else {
    skillBadge = `<span class="minion-trait">${minion.trait}</span>`;
  }

  const rarityBadge = minion.rarity
    ? `<span class="minion-rarity rarity-badge-${minion.rarity}">${minion.rarity}</span>` : '';

  const bossBadge = minion.isBoss
    ? `<span class="minion-trait" style="color:#ef4444">BOSS</span>` : '';

  const level  = minion.level ?? 1;
  const xp     = minion.xp    ?? 0;
  const xpDots = [0, 1, 2].map(i =>
    `<span class="xp-dot${i < xp ? ' filled' : ''}"></span>`
  ).join('');

  card.innerHTML = `
    <span class="minion-emoji">${minion.emoji}</span>
    <span class="minion-name">${minion.name}</span>
    <div class="card-lv-row">
      <span class="minion-tribe">${typeIcon} ${tribeMeta.icon} ${tribeMeta.label}</span>
      <span class="lv-badge">Lv.${level}</span>
    </div>
    <div class="xp-bar-wrap">${xpDots}</div>
    ${rarityBadge}${bossBadge}${skillBadge}
    <div class="shield-bar-wrap"><div class="shield-bar" style="width:${shPct}%"></div></div>
    <div class="hp-bar-wrap"><div class="hp-bar${hpPct < 30 ? ' low' : ''}" style="width:${hpPct}%"></div></div>
    <div class="minion-stats">
      <span>⚔️${minion.atk}</span>
      <span>🛡${minion.shield}</span>
      <span>❤️${minion.hp}</span>
    </div>
  `;
  return card;
}

/**
 * Re-render HP bar, shield bar, and dead state on an existing card without rebuilding it.
 * @param {Object} minion
 */
function refreshMinionCard(minion) {
  const card = document.getElementById(`minion-${minion.id}`);
  if (!card) return;
  if (!minion.alive) card.classList.add('dead');

  const hpPct = Math.max(0, (minion.hp / minion.maxHp) * 100);
  const hpBar = card.querySelector('.hp-bar');
  if (hpBar) { hpBar.style.width = hpPct + '%'; hpBar.classList.toggle('low', hpPct < 30); }

  const shPct = minion.maxShield > 0 ? Math.max(0, (minion.shield / minion.maxShield) * 100) : 0;
  const shBar = card.querySelector('.shield-bar');
  if (shBar) shBar.style.width = shPct + '%';

  const stats = card.querySelectorAll('.minion-stats span');
  if (stats[1]) stats[1].textContent = `🛡${Math.max(0, minion.shield)}`;
  if (stats[2]) stats[2].textContent = `❤️${Math.max(0, minion.hp)}`;
}

// ── Animations ───────────────────────────────────────────────────────────────

function animateAttackStart(attacker) {
  const card = document.getElementById(`minion-${attacker.id}`);
  if (card) { card.classList.add('attacking'); setTimeout(() => card.classList.remove('attacking'), 350); }
}

function animateTargetHit(target) {
  const card = document.getElementById(`minion-${target.id}`);
  if (card) { card.classList.add('hit'); setTimeout(() => card.classList.remove('hit'), 400); }
}

function animateAttack(attacker, target) {
  animateAttackStart(attacker);
  animateTargetHit(target);
}

function animateEvolution(minion) {
  const card = document.getElementById(`minion-${minion.id}`);
  if (!card) return;
  const newCard = buildMinionCard(minion);
  newCard.classList.add('evolved');
  card.replaceWith(newCard);
  setTimeout(() => newCard.classList.remove('evolved'), 800);
}

// ── Damage number popups ──────────────────────────────────────────────────────

/**
 * Show a floating number above a unit's card.
 * @param {Object} target   minion object
 * @param {string} value    text to show  (e.g. "-12", "+5", "-3🛡")
 * @param {string} cssClass 'hp' | 'shield' | 'heal' | 'crit' | 'burn' | 'block'
 */
function showDamagePopup(target, value, cssClass) {
  const card = document.getElementById(`minion-${target.id}`);
  if (!card) return;
  const el = document.createElement('div');
  el.className = `dmg-popup ${cssClass}`;
  el.textContent = value;
  card.appendChild(el);
  setTimeout(() => el.remove(), 650);
}

// ── Battlefield (3×2 grid) ───────────────────────────────────────────────────

function buildGridRow(minions, isFront) {
  const row = document.createElement('div');
  row.className = `grid-row ${isFront ? 'front-row' : 'back-row'}`;
  for (let col = 0; col < 3; col++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    if (minions[col]) {
      cell.appendChild(buildMinionCard(minions[col]));
    } else {
      const empty = document.createElement('div');
      empty.className = 'empty-slot';
      cell.appendChild(empty);
    }
    row.appendChild(cell);
  }
  return row;
}

/**
 * Enemy: range on top, melee on bottom (closer to VS).
 * Ally: melee on top (closer to VS), range on bottom.
 */
function renderBattleGrid(container, minions, side) {
  container.innerHTML = '';
  const melee = minions.filter(m => m.type === 'melee');
  const range = minions.filter(m => m.type === 'range');
  if (side === 'enemy') {
    container.appendChild(buildGridRow(range, false));
    container.appendChild(buildGridRow(melee, true));
  } else {
    container.appendChild(buildGridRow(melee, true));
    container.appendChild(buildGridRow(range, false));
  }
}

function renderBattlefield(allies, enemies) {
  renderBattleGrid(document.getElementById('ally-grid'),  allies,  'ally');
  renderBattleGrid(document.getElementById('enemy-grid'), enemies, 'enemy');
}

// ── Combat log ───────────────────────────────────────────────────────────────

function logLine(text, cssClass = '') {
  const entries = document.getElementById('log-entries');
  const p = document.createElement('p');
  if (cssClass) p.className = cssClass;
  p.textContent = text;
  entries.appendChild(p);
  document.getElementById('combat-log').scrollTop = entries.scrollHeight;
}

function clearLog() {
  document.getElementById('log-entries').innerHTML = '';
}

// ── Combat event renderer (async — handles its own animation timing) ──────────

/**
 * Render a single combat event with correct animation ordering.
 * Sequence for attack events:
 *   1. Attacker pop animation starts
 *   2. sleep(150) — animation peaks
 *   3. Target flash animation starts
 *   4. sleep(120) — flash peaks
 *   5. refreshMinionCard() + popup + log line
 *   6. sleep(80) — brief pause
 *
 * Damage is already applied to unit objects by combat.js.
 * We animate first, then reveal the stat change.
 * @param {Object} ev
 * @returns {Promise<void>}
 */
async function renderCombatEvent(ev) {
  switch (ev.type) {

    case 'hit':
      animateAttackStart(ev.attacker);
      await sleep(150);
      animateTargetHit(ev.target);
      await sleep(120);
      refreshMinionCard(ev.target);
      showDamagePopup(ev.target, `-${ev.damage}`, ev.isBlocked ? 'block' : 'hp');
      logLine(
        `${ev.attacker.emoji} ${ev.attacker.name} hits ${ev.target.emoji} ${ev.target.name} for ${ev.damage}${ev.isBlocked ? ' (blocked!)' : ''} dmg`,
        ev.isBlocked ? 'log-block' : 'log-hit'
      );
      await sleep(80);
      break;

    case 'crit':
      animateAttackStart(ev.attacker);
      await sleep(180);
      animateTargetHit(ev.target);
      await sleep(120);
      refreshMinionCard(ev.target);
      showDamagePopup(ev.target, `-${ev.damage}`, 'crit');
      logLine(`💥 CRIT! ${ev.attacker.emoji} ${ev.attacker.name} crushes ${ev.target.emoji} ${ev.target.name} for ${ev.damage} dmg!`, 'log-crit');
      await sleep(80);
      break;

    case 'aoe':
      animateAttackStart(ev.attacker);
      await sleep(150);
      animateTargetHit(ev.target);
      await sleep(120);
      refreshMinionCard(ev.target);
      showDamagePopup(ev.target, `-${ev.damage}`, 'hp');
      logLine(`🌀 AOE! ${ev.attacker.emoji} ${ev.attacker.name} blasts ${ev.target.emoji} ${ev.target.name} for ${ev.damage} dmg`, 'log-aoe');
      await sleep(80);
      break;

    case 'splash':
      animateTargetHit(ev.target);
      await sleep(80);
      refreshMinionCard(ev.target);
      showDamagePopup(ev.target, `-${ev.damage}`, 'hp');
      logLine(`💢 Splash! ${ev.attacker.emoji} ${ev.attacker.name} splashes ${ev.target.emoji} ${ev.target.name} for ${ev.damage} dmg`, 'log-aoe');
      await sleep(80);
      break;

    case 'death':
      logLine(`💀 ${ev.minion.emoji} ${ev.minion.name} is defeated!`, 'log-death');
      refreshMinionCard(ev.minion);
      await sleep(80);
      break;

    case 'regen':
      showDamagePopup(ev.minion, `+${ev.amount}`, 'heal');
      logLine(`💚 ${ev.minion.emoji} ${ev.minion.name} regens ${ev.amount} HP`, 'log-heal');
      refreshMinionCard(ev.minion);
      await sleep(60);
      break;

    case 'bloom_heal':
      showDamagePopup(ev.target, `+${ev.amount}`, 'heal');
      logLine(`🌸 ${ev.healer.emoji} ${ev.healer.name} blooms → heals ${ev.target.emoji} ${ev.target.name} ${ev.amount} HP`, 'log-heal');
      refreshMinionCard(ev.target);
      await sleep(60);
      break;

    case 'burn_apply':
      logLine(`🔥 ${ev.target.emoji} ${ev.target.name} is burning! (${ev.dmg}/turn × ${ev.turns})`, 'log-crit');
      await sleep(50);
      break;

    case 'burn_tick':
      showDamagePopup(ev.minion, `-${ev.damage}`, 'burn');
      logLine(`🔥 ${ev.minion.emoji} ${ev.minion.name} takes ${ev.damage} burn dmg`, 'log-hit');
      refreshMinionCard(ev.minion);
      await sleep(80);
      break;

    case 'shield_absorb':
      showDamagePopup(ev.minion, `-${ev.amount}🛡`, 'shield');
      logLine(`🛡 ${ev.minion.emoji} ${ev.minion.name} absorbs ${ev.amount} into shield`, 'log-block');
      refreshMinionCard(ev.minion);
      await sleep(60);
      break;

    case 'shield_break':
      logLine(`💔 Shield broken! ${ev.minion.emoji} ${ev.minion.name} is exposed!`, 'log-death');
      refreshMinionCard(ev.minion);
      await sleep(80);
      break;

    case 'shield_regen':
      showDamagePopup(ev.minion, `+${ev.amount}🛡`, 'shield');
      logLine(`🛡 ${ev.minion.emoji} ${ev.minion.name} regens ${ev.amount} shield (Druid)`, 'log-block');
      refreshMinionCard(ev.minion);
      await sleep(60);
      break;

    case 'lifesteal_heal':
      showDamagePopup(ev.minion, `+${ev.amount}`, 'heal');
      logLine(`🩸 ${ev.minion.emoji} ${ev.minion.name} drains ${ev.amount} HP`, 'log-heal');
      refreshMinionCard(ev.minion);
      await sleep(60);
      break;

    case 'slow':
      logLine(`🧊 ${ev.target.emoji} ${ev.target.name} slowed! ATK −${Math.round(ev.amount * 100)}%`, 'log-block');
      await sleep(50);
      break;

    case 'freeze':
      logLine(`❄️ ${ev.target.emoji} ${ev.target.name} is frozen! (skips next turn)`, 'log-block');
      await sleep(50);
      break;

    case 'frozen_skip':
      animateAttack(ev.minion, ev.minion);
      logLine(`❄️ ${ev.minion.emoji} ${ev.minion.name} is frozen and skips their turn!`, 'log-block');
      await sleep(100);
      break;

    case 'reflect':
      animateTargetHit(ev.target);
      await sleep(80);
      refreshMinionCard(ev.target);
      showDamagePopup(ev.target, `-${ev.damage}`, 'hp');
      logLine(`🛡️ Fortress! ${ev.source.emoji} ${ev.source.name} reflects ${ev.damage} dmg to ${ev.target.emoji} ${ev.target.name}`, 'log-block');
      await sleep(80);
      break;

    case 'hibernate':
      showDamagePopup(ev.minion, `+${ev.amount}`, 'heal');
      logLine(`🐻 Hibernation! ${ev.minion.emoji} ${ev.minion.name} surges +${ev.amount} HP!`, 'log-heal');
      refreshMinionCard(ev.minion);
      await sleep(60);
      break;

    case 'synregen':
      showDamagePopup(ev.minion, `+${ev.amount}`, 'heal');
      logLine(`🐾 ${ev.minion.emoji} ${ev.minion.name} regens ${ev.amount} HP (Beast)`, 'log-heal');
      refreshMinionCard(ev.minion);
      await sleep(60);
      break;

    case 'synheal':
      showDamagePopup(ev.minion, `+${ev.amount}`, 'heal');
      logLine(`💚 ${ev.minion.emoji} ${ev.minion.name} healed ${ev.amount} HP (Support)`, 'log-heal');
      refreshMinionCard(ev.minion);
      await sleep(60);
      break;

    default:
      await sleep(30);
  }
}

// ── Synergy bar ──────────────────────────────────────────────────────────────

function renderSynergyBar(syn) {
  const bar = document.getElementById('synergy-bar');
  if (!syn || !syn.active.length) { bar.innerHTML = ''; bar.hidden = true; return; }
  bar.hidden = false;
  bar.innerHTML = syn.active.map(s =>
    `<span class="syn-chip">${s.icon} <strong>${s.name}</strong> <em>${s.desc}</em></span>`
  ).join('');
}

// ── Draft screen ─────────────────────────────────────────────────────────────

function renderDraftScreen(options, pickedCount, pickedEmojis, onPick) {
  document.getElementById('draft-pick-num').textContent = pickedCount + 1;
  document.getElementById('draft-picked').innerHTML =
    pickedEmojis.map(e => `<span class="draft-picked-emoji">${e}</span>`).join('');

  const container = document.getElementById('draft-cards');
  container.innerHTML = '';

  options.forEach((m, i) => {
    const tribeMeta = TRIBE_META[m.tribe] || { icon: '?', label: m.tribe };
    const typeIcon  = m.type === 'range' ? '🏹' : '⚔️';
    const card = document.createElement('div');
    const rarityClass = m.rarity ? ` rarity-${m.rarity}` : '';
    card.className = `draft-card${rarityClass}`;
    card.innerHTML = `
      <span class="r-emoji">${m.emoji}</span>
      <span class="r-name">${m.name}</span>
      <span class="r-tribe">${typeIcon} ${tribeMeta.icon} ${tribeMeta.label}</span>
      ${m.rarity ? `<span class="rarity-badge-${m.rarity} r-rarity">${m.rarity}</span>` : ''}
      <span class="draft-skill-name">${m.skill.tier1.name}</span>
      <span class="draft-skill-desc">${m.skill.tier1.desc}</span>
      <span class="r-stats">⚔️${m.atk} 🛡${m.shield} ❤️${m.maxHp}</span>
    `;
    card.addEventListener('click', () => onPick(i));
    container.appendChild(card);
  });
}

// ── Recruit screen ───────────────────────────────────────────────────────────

function renderRecruitScreen(options, allies, onPick, onSkip) {
  const container = document.getElementById('recruit-cards');
  container.innerHTML = '';

  options.forEach((m, i) => {
    const synHint   = recruitSynergyHint(allies, m);
    const isDupe    = allies.some(a => a.name === m.name);
    const tribeMeta = TRIBE_META[m.tribe] || { icon: '?', label: m.tribe };
    const typeIcon  = m.type === 'range' ? '🏹' : '⚔️';
    const rarityClass = m.rarity ? ` rarity-${m.rarity}` : '';

    const card = document.createElement('div');
    card.className = `recruit-card${rarityClass}${synHint || isDupe ? ' synergy-new' : ''}`;
    card.innerHTML = `
      <span class="r-emoji">${m.emoji}</span>
      <span class="r-name">${m.name}</span>
      <span class="r-tribe">${typeIcon} ${tribeMeta.icon} ${tribeMeta.label}</span>
      ${m.rarity ? `<span class="rarity-badge-${m.rarity} r-rarity">${m.rarity}</span>` : ''}
      <span class="r-stats">⚔️${m.atk} 🛡${m.maxShield} ❤️${m.maxHp}</span>
      ${isDupe  ? `<span class="syn-hint">⬆ Evolves to Tier 2!</span>` : ''}
      ${synHint ? `<span class="syn-hint">${synHint}</span>`           : ''}
    `;
    card.addEventListener('click', () => onPick(i));
    container.appendChild(card);
  });

  const skipBtn = document.getElementById('btn-skip');
  if (skipBtn) {
    skipBtn.onclick = null;
    skipBtn.addEventListener('click', onSkip);
  }
}

// ── Manage Squad screen ──────────────────────────────────────────────────────

function renderManageSquadScreen(filteredCurrent, newRecruit, message, onRemove, onCancel) {
  const subEl = document.querySelector('#screen-manage .manage-sub');
  if (subEl) subEl.textContent = message;

  const container = document.getElementById('manage-minions');
  container.innerHTML = '';

  filteredCurrent.forEach((m, i) => {
    const card = document.createElement('div');
    card.className = 'manage-card';
    const tribeMeta = TRIBE_META[m.tribe] || { icon: '?', label: m.tribe };
    const typeIcon  = m.type === 'range' ? '🏹' : '⚔️';
    const skillObj  = m.skillTier === 2 ? m.skill?.tier2 : m.skill?.tier1;
    card.innerHTML = `
      <span class="manage-emoji">${m.emoji}</span>
      <div class="manage-info">
        <span class="manage-name">${m.name}</span>
        <span class="manage-role">${typeIcon} ${tribeMeta.label}${skillObj ? ` · ${skillObj.name}` : ''}</span>
        <span class="manage-stats">⚔️${m.atk} 🛡${m.shield}/${m.maxShield} ❤️${m.hp}/${m.maxHp}</span>
      </div>
      <button class="btn-remove">Remove</button>
    `;
    card.querySelector('.btn-remove').addEventListener('click', () => onRemove(i));
    container.appendChild(card);
  });

  const preview = document.createElement('div');
  preview.className = 'manage-recruit-preview';
  const tribeMeta = TRIBE_META[newRecruit.tribe] || { icon: '?', label: newRecruit.tribe };
  const typeIcon  = newRecruit.type === 'range' ? '🏹' : '⚔️';
  preview.innerHTML = `
    <p class="manage-incoming">Incoming: ${newRecruit.emoji} <strong>${newRecruit.name}</strong>
      <span class="r-tribe">${typeIcon} ${tribeMeta.label}</span>
      ${newRecruit.rarity ? `<span class="rarity-badge-${newRecruit.rarity}">${newRecruit.rarity}</span>` : ''}
      ⚔️${newRecruit.atk} 🛡${newRecruit.maxShield} ❤️${newRecruit.maxHp}
    </p>
  `;
  container.appendChild(preview);

  const cancelBtn = document.getElementById('btn-manage-cancel');
  if (cancelBtn) {
    cancelBtn.onclick = null;
    cancelBtn.addEventListener('click', onCancel);
  }
}

// ── Boss Recruit screen ───────────────────────────────────────────────────────

function renderBossRecruitScreen(bossDrop, normalOptions, allies, onNormalPick, onSkip) {
  const dropContainer = document.getElementById('boss-drop-card');
  dropContainer.innerHTML = '';
  const bd         = bossDrop;
  const bdTribe    = TRIBE_META[bd.tribe] || { icon: '?', label: bd.tribe };
  const bdTypeIcon = bd.type === 'range' ? '🏹' : '⚔️';
  const bdRarity   = bd.rarity ? ` rarity-${bd.rarity}` : '';
  const dropCard   = document.createElement('div');
  dropCard.className = `recruit-card${bdRarity} boss-drop-unit`;
  dropCard.innerHTML = `
    <span class="r-emoji">${bd.emoji}</span>
    <span class="r-name">${bd.name}</span>
    <span class="r-tribe">${bdTypeIcon} ${bdTribe.icon} ${bdTribe.label}</span>
    ${bd.rarity ? `<span class="rarity-badge-${bd.rarity} r-rarity">${bd.rarity}</span>` : ''}
    <span class="r-stats">⚔️${bd.atk} 🛡${bd.maxShield} ❤️${bd.maxHp}</span>
    ${bd.skill ? `<span class="draft-skill-name">${bd.skill.tier1.name}</span><span class="draft-skill-desc">${bd.skill.tier1.desc}</span>` : ''}
  `;
  dropContainer.appendChild(dropCard);

  const normalContainer = document.getElementById('boss-normal-cards');
  normalContainer.innerHTML = '';
  normalOptions.forEach((m, i) => {
    const synHint   = recruitSynergyHint(allies, m);
    const isDupe    = allies.some(a => a.name === m.name);
    const tribeMeta = TRIBE_META[m.tribe] || { icon: '?', label: m.tribe };
    const typeIcon  = m.type === 'range' ? '🏹' : '⚔️';
    const rarityClass = m.rarity ? ` rarity-${m.rarity}` : '';
    const card = document.createElement('div');
    card.className = `recruit-card${rarityClass}${synHint || isDupe ? ' synergy-new' : ''}`;
    card.innerHTML = `
      <span class="r-emoji">${m.emoji}</span>
      <span class="r-name">${m.name}</span>
      <span class="r-tribe">${typeIcon} ${tribeMeta.icon} ${tribeMeta.label}</span>
      ${m.rarity ? `<span class="rarity-badge-${m.rarity} r-rarity">${m.rarity}</span>` : ''}
      <span class="r-stats">⚔️${m.atk} 🛡${m.maxShield} ❤️${m.maxHp}</span>
      ${isDupe  ? `<span class="syn-hint">⬆ Evolves to Tier 2!</span>` : ''}
      ${synHint ? `<span class="syn-hint">${synHint}</span>` : ''}
    `;
    card.addEventListener('click', () => onNormalPick(i));
    normalContainer.appendChild(card);
  });

  const skipBtn = document.getElementById('btn-boss-skip');
  if (skipBtn) {
    skipBtn.onclick = null;
    skipBtn.addEventListener('click', onSkip);
  }
}

// ── Revive screens ────────────────────────────────────────────────────────────

function renderReviveScreen(revivable, onPick, onCancel) {
  const container = document.getElementById('revive-list');
  container.innerHTML = '';

  if (!revivable.length) {
    const empty = document.createElement('p');
    empty.className = 'revive-empty';
    empty.textContent = 'No units available to revive';
    container.appendChild(empty);
  } else {
    revivable.forEach((entry, i) => {
      const card = document.createElement('div');
      card.className = 'manage-card';
      card.innerHTML = `
        <span class="manage-emoji">${entry.emoji}</span>
        <div class="manage-info">
          <span class="manage-name">${entry.name}</span>
          <span class="manage-role">Fell in Wave ${entry.wave}</span>
          <span class="manage-stats">Returns at 40% HP, 0 shield</span>
        </div>
        <button class="btn-revive-pick">⚡ Pick</button>
      `;
      card.querySelector('.btn-revive-pick').addEventListener('click', () => onPick(i));
      container.appendChild(card);
    });
  }

  const cancelBtn = document.getElementById('btn-revive-cancel');
  if (cancelBtn) {
    cancelBtn.onclick = null;
    cancelBtn.addEventListener('click', onCancel);
  }
}

function renderReviveConfirm(entry, onConfirm, onCancel) {
  const info = document.getElementById('revive-confirm-info');
  info.innerHTML = `
    <div class="revive-confirm-unit">
      <span style="font-size:40px">${entry.emoji}</span>
      <div>
        <strong style="font-size:16px">${entry.name}</strong><br>
        <span style="font-size:11px;color:#94a3b8">Fell in Wave ${entry.wave}</span>
      </div>
    </div>
  `;
  document.getElementById('btn-revive-yes').onclick = onConfirm;
  document.getElementById('btn-revive-no').onclick  = onCancel;
}

// ── Shop screen ───────────────────────────────────────────────────────────────

function renderShopScreen(offers, allies, gold, wave, onBuy, onSkip) {
  const goldEl = document.getElementById('shop-gold-display');
  const subEl  = document.getElementById('shop-sub');
  if (goldEl) goldEl.textContent = `🪙 ${gold}`;
  if (subEl)  subEl.textContent  = `Wave ${wave} complete — spend wisely`;

  const offersEl = document.getElementById('shop-offers');
  const pickerEl = document.getElementById('shop-picker');
  offersEl.innerHTML = '';
  offersEl.hidden    = false;
  pickerEl.hidden    = true;

  function showPicker(offer) {
    offersEl.hidden = true;
    pickerEl.hidden = false;
    document.getElementById('shop-picker-label').textContent = `${offer.label} — pick a unit:`;

    const unitsEl = document.getElementById('shop-picker-units');
    unitsEl.innerHTML = '';

    const targetable = offer.id === 'unlock_tier2'
      ? allies.filter(a => a.alive && a.skill?.tier2 && a.skillTier < 2)
      : allies.filter(a => a.alive);

    if (!targetable.length) {
      const p = document.createElement('p');
      p.textContent = 'No eligible units.';
      p.style.cssText = 'color:var(--text-dim);font-size:13px;padding:16px 0;text-align:center';
      unitsEl.appendChild(p);
    } else {
      targetable.forEach(ally => {
        const card = document.createElement('div');
        card.className = 'manage-card';
        card.innerHTML = `
          <span class="manage-emoji">${ally.emoji}</span>
          <div class="manage-info">
            <span class="manage-name">${ally.name} <span class="lv-badge">Lv.${ally.level ?? 1}</span></span>
            <span class="manage-stats">⚔️${ally.atk} 🛡${ally.shield}/${ally.maxShield} ❤️${ally.hp}/${ally.maxHp}</span>
          </div>
          <button class="btn-shop-pick">Pick</button>
        `;
        card.querySelector('.btn-shop-pick').addEventListener('click', () => onBuy(offer, ally));
        unitsEl.appendChild(card);
      });
    }

    document.getElementById('btn-shop-back').onclick = () => {
      offersEl.hidden = false;
      pickerEl.hidden = true;
    };
  }

  offers.forEach((offer, i) => {
    const canAfford = gold >= offer.cost;
    const card = document.createElement('div');
    card.className = `shop-card${canAfford ? '' : ' shop-card-disabled'}`;
    card.style.animationDelay = `${i * 0.07}s`;
    card.innerHTML = `
      <span class="shop-offer-label">${offer.label}</span>
      <span class="shop-offer-desc">${offer.desc}</span>
      <span class="shop-offer-cost${canAfford ? '' : ' shop-cant-afford'}">
        🪙 ${offer.cost}${canAfford ? '' : ' — Not enough gold'}
      </span>
    `;
    if (canAfford) {
      card.addEventListener('click', () => {
        if (offer.needsTarget) {
          showPicker(offer);
        } else {
          onBuy(offer, null);
        }
      });
    }
    offersEl.appendChild(card);
  });

  const skipBtn = document.getElementById('btn-shop-skip');
  if (skipBtn) {
    skipBtn.onclick = null;
    skipBtn.addEventListener('click', onSkip);
  }
}

// ── Game Over ────────────────────────────────────────────────────────────────

function renderGameOver(waves, score) {
  document.getElementById('go-waves').textContent = waves;
  document.getElementById('go-score').textContent = score;
  showScreen('gameover');
}

/**
 * @fileoverview All DOM rendering. Reads state only, never writes to it.
 */

// ── Screen management ────────────────────────────────────────────────────────

/** @param {'title'|'draft'|'battle'|'recruit'|'manage'|'gameover'} name */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
}

// ── HUD ──────────────────────────────────────────────────────────────────────

function renderHud(wave, score) {
  document.getElementById('hud-wave').textContent  = `Wave ${wave}`;
  document.getElementById('hud-score').textContent = `Score: ${score}`;
}

function renderGraveyardCounter(count, bonusTier) {
  const el = document.getElementById('hud-graveyard');
  if (!el) return;
  if (count === 0) { el.hidden = true; return; }
  const nextAt = (bonusTier + 1) * 3;
  el.textContent = `💀 ${count} fallen — next +ATK at ${nextAt}`;
  el.hidden = false;
}

function renderBossWarning(isBoss) {
  const el = document.getElementById('boss-warning');
  if (el) el.hidden = !isBoss;
}

// ── Minion cards ─────────────────────────────────────────────────────────────

/** @param {Object} minion @returns {HTMLElement} */
function buildMinionCard(minion) {
  const card = document.createElement('div');
  const rarityClass = minion.rarity ? ` rarity-${minion.rarity}` : '';
  card.className = `minion-card ${minion.side}${rarityClass}${minion.alive ? '' : ' dead'}`;
  card.id = `minion-${minion.id}`;

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

  card.innerHTML = `
    <span class="minion-emoji">${minion.emoji}</span>
    <span class="minion-name">${minion.name}</span>
    <span class="minion-tribe">${typeIcon} ${tribeMeta.icon} ${tribeMeta.label}</span>
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
 * Re-render HP bar, shield bar, and dead state on an existing card.
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

function animateAttack(attacker, target) {
  const aCard = document.getElementById(`minion-${attacker.id}`);
  const tCard = document.getElementById(`minion-${target.id}`);
  if (aCard) { aCard.classList.add('attacking'); setTimeout(() => aCard.classList.remove('attacking'), 350); }
  if (tCard) { tCard.classList.add('hit');       setTimeout(() => tCard.classList.remove('hit'), 400); }
}

function animateEvolution(minion) {
  const card = document.getElementById(`minion-${minion.id}`);
  if (!card) return;
  const newCard = buildMinionCard(minion);
  newCard.classList.add('evolved');
  card.replaceWith(newCard);
  setTimeout(() => newCard.classList.remove('evolved'), 800);
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

function renderCombatEvent(ev) {
  switch (ev.type) {
    case 'hit':
      animateAttack(ev.attacker, ev.target);
      logLine(`${ev.attacker.emoji} ${ev.attacker.name} hits ${ev.target.emoji} ${ev.target.name} for ${ev.damage}${ev.isBlocked ? ' (blocked!)' : ''} dmg`,
              ev.isBlocked ? 'log-block' : 'log-hit');
      refreshMinionCard(ev.target);
      break;
    case 'crit':
      animateAttack(ev.attacker, ev.target);
      logLine(`💥 CRIT! ${ev.attacker.emoji} ${ev.attacker.name} crushes ${ev.target.emoji} ${ev.target.name} for ${ev.damage} dmg!`, 'log-crit');
      refreshMinionCard(ev.target);
      break;
    case 'aoe':
      animateAttack(ev.attacker, ev.target);
      logLine(`🌀 AOE! ${ev.attacker.emoji} ${ev.attacker.name} blasts ${ev.target.emoji} ${ev.target.name} for ${ev.damage} dmg`, 'log-aoe');
      refreshMinionCard(ev.target);
      break;
    case 'splash':
      logLine(`💢 Splash! ${ev.attacker.emoji} ${ev.attacker.name} splashes ${ev.target.emoji} ${ev.target.name} for ${ev.damage} dmg`, 'log-aoe');
      refreshMinionCard(ev.target);
      break;
    case 'death':
      logLine(`💀 ${ev.minion.emoji} ${ev.minion.name} is defeated!`, 'log-death');
      refreshMinionCard(ev.minion);
      break;
    case 'regen':
      logLine(`💚 ${ev.minion.emoji} ${ev.minion.name} regens ${ev.amount} HP`, 'log-heal');
      refreshMinionCard(ev.minion);
      break;
    case 'bloom_heal':
      logLine(`🌸 ${ev.healer.emoji} ${ev.healer.name} blooms → heals ${ev.target.emoji} ${ev.target.name} ${ev.amount} HP`, 'log-heal');
      refreshMinionCard(ev.target);
      break;
    case 'burn_apply':
      logLine(`🔥 ${ev.target.emoji} ${ev.target.name} is burning! (${ev.dmg}/turn × ${ev.turns})`, 'log-crit');
      break;
    case 'burn_tick':
      logLine(`🔥 ${ev.minion.emoji} ${ev.minion.name} takes ${ev.damage} burn dmg`, 'log-hit');
      refreshMinionCard(ev.minion);
      break;
    case 'shield_absorb':
      logLine(`🛡 ${ev.minion.emoji} ${ev.minion.name} absorbs ${ev.amount} into shield`, 'log-block');
      refreshMinionCard(ev.minion);
      break;
    case 'shield_break':
      logLine(`💔 Shield broken! ${ev.minion.emoji} ${ev.minion.name} is exposed!`, 'log-death');
      refreshMinionCard(ev.minion);
      break;
    case 'slow':
      logLine(`🧊 ${ev.target.emoji} ${ev.target.name} slowed! ATK −${Math.round(ev.amount * 100)}%`, 'log-block');
      break;
    case 'freeze':
      logLine(`❄️ ${ev.target.emoji} ${ev.target.name} is frozen! (skips next turn)`, 'log-block');
      break;
    case 'frozen_skip':
      animateAttack(ev.minion, ev.minion);
      logLine(`❄️ ${ev.minion.emoji} ${ev.minion.name} is frozen and skips their turn!`, 'log-block');
      break;
    case 'reflect':
      logLine(`🛡️ Fortress! ${ev.source.emoji} ${ev.source.name} reflects ${ev.damage} dmg to ${ev.target.emoji} ${ev.target.name}`, 'log-block');
      refreshMinionCard(ev.target);
      break;
    case 'hibernate':
      logLine(`🐻 Hibernation! ${ev.minion.emoji} ${ev.minion.name} surges +${ev.amount} HP!`, 'log-heal');
      refreshMinionCard(ev.minion);
      break;
    case 'synregen':
      logLine(`🐾 ${ev.minion.emoji} ${ev.minion.name} regens ${ev.amount} HP (Beast)`, 'log-heal');
      refreshMinionCard(ev.minion);
      break;
    case 'synheal':
      logLine(`💚 ${ev.minion.emoji} ${ev.minion.name} healed ${ev.amount} HP (Support)`, 'log-heal');
      refreshMinionCard(ev.minion);
      break;
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

/**
 * @param {Object[]} options
 * @param {Object[]} allies
 * @param {Function} onPick
 * @param {Function} onSkip
 */
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

/**
 * @param {Object[]} filteredCurrent  pre-filtered list (same type as recruit, or all if total-limit)
 * @param {Object}   newRecruit       the chosen recruit
 * @param {string}   message          subtitle shown above the minion list
 * @param {Function} onRemove         callback(index into filteredCurrent)
 * @param {Function} onCancel
 */
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

  // Incoming recruit preview
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

// ── Game Over ────────────────────────────────────────────────────────────────

function renderGameOver(waves, score) {
  document.getElementById('go-waves').textContent = waves;
  document.getElementById('go-score').textContent = score;
  showScreen('gameover');
}

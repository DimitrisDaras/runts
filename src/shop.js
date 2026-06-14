/**
 * @fileoverview Shop offer pool and effect application.
 * Uses pickRandom from minions.js (loaded before this file).
 */

const SHOP_POOL = [
  {
    id: 'upgrade_atk',
    label: '⚔️ Upgrade Unit',
    desc:  '+20% ATK permanently to one unit',
    cost:  15,
    needsTarget: true,
  },
  {
    id: 'reinforce',
    label: '🛡 Reinforce Unit',
    desc:  '+15 max shield permanently to one unit',
    cost:  10,
    needsTarget: true,
  },
  {
    id: 'heal_unit',
    label: '💊 Heal Unit',
    desc:  'Restore 60% max HP to one unit',
    cost:  8,
    needsTarget: true,
  },
  {
    id: 'full_rest',
    label: '✨ Full Rest',
    desc:  'All units: +30% HP and +10 shield',
    cost:  20,
    needsTarget: false,
  },
  {
    id: 'relic',
    label: '📦 Relic',
    desc:  'Get a random relic (coming soon)',
    cost:  25,
    needsTarget: false,
  },
  {
    id: 'unlock_tier2',
    label: '🔓 Unlock Tier 2',
    desc:  'Force-unlock Tier 2 skill on one unit',
    cost:  30,
    needsTarget: true,
  },
];

/**
 * Pick 3 random offers from SHOP_POOL.
 * @returns {Object[]}
 */
function generateShopOffers() {
  return pickRandom(SHOP_POOL, 3);
}

/**
 * Apply a shop offer to the game state.
 * @param {Object}      offer   from SHOP_POOL
 * @param {Object|null} target  the chosen ally unit (null for non-targeted offers)
 * @param {Object[]}    allies  all alive allies (for full_rest)
 * @returns {string}  log message describing what happened
 */
function applyShopOffer(offer, target, allies) {
  switch (offer.id) {
    case 'upgrade_atk': {
      target.atk = Math.round(target.atk * 1.20);
      return `⚔️ ${target.emoji} ${target.name}'s ATK boosted to ${target.atk}!`;
    }
    case 'reinforce': {
      target.maxShield += 15;
      target.shield    += 15;
      return `🛡 ${target.emoji} ${target.name}'s shield reinforced (+15)!`;
    }
    case 'heal_unit': {
      const h = Math.round(target.maxHp * 0.6);
      target.hp = Math.min(target.maxHp, target.hp + h);
      return `💊 ${target.emoji} ${target.name} healed ${h} HP!`;
    }
    case 'full_rest': {
      for (const ally of allies) {
        if (!ally.alive) continue;
        const h = Math.round(ally.maxHp * 0.3);
        ally.hp     = Math.min(ally.maxHp,     ally.hp + h);
        if (ally.maxShield > 0)
          ally.shield = Math.min(ally.maxShield, ally.shield + 10);
      }
      return `✨ All units refreshed! +30% HP and +10 shield.`;
    }
    case 'relic': {
      return `📦 Relic system coming soon! (Gold spent anyway)`;
    }
    case 'unlock_tier2': {
      if (target.skill?.tier2 && target.skillTier < 2) {
        target.skillTier     = 2;
        target.activeSkillId = target.skill.tier2.id;
        return `🔓 ${target.emoji} ${target.name} unlocked ${target.skill.tier2.name}!`;
      }
      return `🔓 ${target.emoji} ${target.name} already at Tier 2.`;
    }
    default:
      return 'Shop offer applied.';
  }
}

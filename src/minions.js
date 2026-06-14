/**
 * @fileoverview Minion data pool. Shield replaces def. Type controls grid position.
 * Rarity gates when a minion appears in the recruit pool.
 * Legendary Venom Dart has 1.5× base stats and the shadow_kill T2 skill.
 */

/** @type {Object[]} */
const ALLY_POOL = [
  // ── Common (5) ────────────────────────────────────────────────────────────
  {
    name: 'Shieldling', emoji: '🛡️', hp: 22, atk: 5, shield: 22,
    rarity: 'common', trait: 'none', tribe: 'warrior', type: 'melee',
    skill: {
      tier1: { name: 'Guard',    id: 'guard',    desc: 'Block 25% of incoming hits' },
      tier2: { name: 'Fortress', id: 'fortress', desc: 'Block 40%, reflect 20% dmg on block' },
    },
  },
  {
    name: 'Boomblast', emoji: '💣', hp: 12, atk: 8, shield: 0,
    rarity: 'common', trait: 'aoe', tribe: 'mage', type: 'range',
    skill: {
      tier1: { name: 'Detonate', id: 'aoe_30', desc: '30% chance to hit all enemies' },
      tier2: { name: 'Napalm',   id: 'napalm', desc: 'AOE 55%, burns 3/turn for 2 turns' },
    },
  },
  {
    name: 'Mosswarden', emoji: '🌿', hp: 18, atk: 5, shield: 3,
    rarity: 'common', trait: 'regen', tribe: 'support', type: 'range',
    skill: {
      tier1: { name: 'Regrowth', id: 'regen_2', desc: 'Regen 2 HP per turn' },
      tier2: { name: 'Bloom',    id: 'bloom',   desc: 'Regen 5 HP, heals weakest ally 3/turn' },
    },
  },
  {
    name: 'Quickpaw', emoji: '🐱', hp: 10, atk: 10, shield: 8,
    rarity: 'common', trait: 'first', tribe: 'beast', type: 'melee',
    skill: {
      tier1: { name: 'Rage',   id: 'rage',   desc: '+10% ATK when below 50% HP' },
      tier2: { name: 'Frenzy', id: 'frenzy', desc: '+25% ATK <50% HP, Regen 3/turn' },
    },
  },

  {
    name: 'Thornback', emoji: '🦔', hp: 14, atk: 9, shield: 10,
    rarity: 'common', trait: 'none', tribe: 'rogue', type: 'melee',
    skill: {
      tier1: { name: 'Backstab',    id: 'backstab',    desc: 'Crit ×1.8 at 30% chance' },
      tier2: { name: 'Assassinate', id: 'assassinate', desc: 'Crit ×1.8 at 50%, bypasses shield' },
    },
  },
  // ── Uncommon (3) ──────────────────────────────────────────────────────────
  {
    name: 'Inkshade', emoji: '🐙', hp: 14, atk: 8, shield: 12,
    rarity: 'uncommon', trait: 'aoe', tribe: 'beast', type: 'melee',
    skill: {
      tier1: { name: 'Ink Spray', id: 'aoe_30', desc: '30% chance to hit all enemies' },
      tier2: { name: 'Napalm',    id: 'napalm', desc: 'AOE 55%, burns 3/turn for 2 turns' },
    },
  },
  {
    name: 'Flameling', emoji: '🔥', hp: 13, atk: 8, shield: 0,
    rarity: 'uncommon', trait: 'aoe', tribe: 'mage', type: 'range',
    skill: {
      tier1: { name: 'Spark',  id: 'aoe_30', desc: '30% chance to hit all enemies' },
      tier2: { name: 'Meteor', id: 'meteor', desc: 'AOE 60%, burns 2/turn for 2 turns' },
    },
  },
  {
    name: 'Lichlet', emoji: '💀', hp: 16, atk: 6, shield: 3,
    rarity: 'uncommon', trait: 'regen', tribe: 'support', type: 'range',
    skill: {
      tier1: { name: 'Drain', id: 'regen_2', desc: 'Regen 2 HP per turn' },
      tier2: { name: 'Bloom', id: 'bloom',   desc: 'Regen 5 HP, heals weakest ally 3/turn' },
    },
  },

  // ── Rare (3) ──────────────────────────────────────────────────────────────
  {
    name: 'Stonehide', emoji: '🪨', hp: 28, atk: 4, shield: 25,
    rarity: 'rare', trait: 'none', tribe: 'warrior', type: 'melee',
    skill: {
      tier1: { name: 'Slash',  id: 'slash',  desc: '20% chance to attack twice' },
      tier2: { name: 'Cleave', id: 'cleave', desc: 'Always hits twice + 50% splash to 2nd enemy' },
    },
  },
  {
    name: 'Sparrowbolt', emoji: '⚡', hp: 9, atk: 12, shield: 0,
    rarity: 'rare', trait: 'first', tribe: 'beast', type: 'range',
    skill: {
      tier1: { name: 'Swift Strike', id: 'first_strike', desc: 'Always attacks first' },
      tier2: { name: 'Volley',       id: 'volley',       desc: 'First strike + 30% hits random 2nd enemy' },
    },
  },
  {
    name: 'Frostcap', emoji: '❄️', hp: 15, atk: 7, shield: 5,
    rarity: 'rare', trait: 'none', tribe: 'support', type: 'range',
    skill: {
      tier1: { name: 'Chill',    id: 'slow',     desc: 'Hits reduce enemy ATK by 10%' },
      tier2: { name: 'Blizzard', id: 'blizzard', desc: 'Hit foes lose 25% ATK, 20% chance to freeze' },
    },
  },

  // ── Legendary (1) — 1.5× base stats, premium T2 ──────────────────────────
  {
    name: 'Venom Dart', emoji: '🐍', hp: 17, atk: 17, shield: 3,
    rarity: 'legendary', trait: 'crit', tribe: 'rogue', type: 'range',
    skill: {
      tier1: { name: 'Backstab',    id: 'backstab',    desc: 'Crit ×1.8 at 30% chance' },
      tier2: { name: 'Shadow Kill', id: 'shadow_kill', desc: 'Crit ×2.2 at 55%, bypasses shield' },
    },
  },
];

/** Enemies have no skill or rarity system; combat uses their trait for dispatch. */
const ENEMY_POOL = [
  { name: 'Goblin',    emoji: '👺', hp: 10, atk: 5,  shield: 5,  trait: 'none',  tribe: 'rogue',   type: 'melee' },
  { name: 'Orc Brute', emoji: '👹', hp: 18, atk: 8,  shield: 18, trait: 'none',  tribe: 'warrior', type: 'melee' },
  { name: 'Skeleton',  emoji: '💀', hp: 8,  atk: 7,  shield: 0,  trait: 'first', tribe: 'warrior', type: 'melee' },
  { name: 'Slime',     emoji: '🫧', hp: 20, atk: 4,  shield: 12, trait: 'regen', tribe: 'beast',   type: 'melee' },
  { name: 'Bat Swarm', emoji: '🦇', hp: 7,  atk: 9,  shield: 0,  trait: 'aoe',   tribe: 'beast',   type: 'range' },
  { name: 'Troll',     emoji: '🧌', hp: 24, atk: 6,  shield: 18, trait: 'regen', tribe: 'support', type: 'melee' },
  { name: 'Dark Mage', emoji: '🧙', hp: 11, atk: 10, shield: 3,  trait: 'crit',  tribe: 'mage',    type: 'range' },
];

/**
 * Build a boss template based on a random enemy, scaled to 3× HP and 2× ATK.
 * The spawnMinion wave-scaling is then applied on top.
 * @param {number} wave
 * @returns {Object} template (no id/side/statuses yet)
 */
function getBossTemplate(wave) {
  const base  = pickRandom(ENEMY_POOL, 1)[0];
  const traits = ['aoe', 'regen', 'first', 'none'];
  const trait  = traits[Math.floor(Math.random() * traits.length)];
  return {
    name:   `${base.name} Lord`,
    emoji:  base.emoji,
    hp:     base.hp     * 3,
    atk:    base.atk    * 2,
    shield: (base.shield || 0) * 2,
    trait,
    tribe:  base.tribe,
    type:   'melee',
    isBoss: true,
  };
}

/**
 * Pick `n` unique random items from an array.
 * @template T
 * @param {T[]} arr
 * @param {number} n
 * @returns {T[]}
 */
function pickRandom(arr, n) {
  const copy = [...arr];
  const out  = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

/**
 * Clone a template into a live minion instance scaled to the given wave.
 * @param {Object} tpl
 * @param {'ally'|'enemy'} side
 * @param {number} wave
 * @param {number} id
 * @returns {Object}
 */
function spawnMinion(tpl, side, wave, id) {
  const scale     = side === 'enemy' ? Math.pow(1.2, wave - 1) : 1;
  const maxHp     = Math.round(tpl.hp * scale);
  const maxShield = Math.round((tpl.shield || 0) * scale);
  return {
    id,
    name:          tpl.name,
    emoji:         tpl.emoji,
    trait:         tpl.trait,
    tribe:         tpl.tribe,
    type:          tpl.type,
    rarity:        tpl.rarity  || null,
    isBoss:        tpl.isBoss  || false,
    skill:         tpl.skill   || null,
    skillTier:     1,
    activeSkillId: tpl.skill?.tier1?.id || null,
    side,
    maxHp,
    hp:        maxHp,
    maxShield,
    shield:    maxShield,
    atk:       Math.round(tpl.atk * scale),
    alive:     true,
    statuses:  {},
  };
}

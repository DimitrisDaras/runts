/**
 * @fileoverview Relic pool. Relics provide passive bonuses applied in main.js and combat.js.
 * No duplicate relics can be owned. Effects are keyed by id.
 */

const RELIC_POOL = [
  {
    id:    'blood_pact',
    name:  'Blood Pact',
    emoji: '🩸',
    desc:  'Each unit that dies gives all survivors +3 ATK permanently.',
  },
  {
    id:    'crystal_orb',
    name:  'Crystal Orb',
    emoji: '🔮',
    desc:  'All AOE skills trigger 20% more often.',
  },
  {
    id:    'thunder_core',
    name:  'Thunder Core',
    emoji: '⚡',
    desc:  'All current units immediately gain +8 ATK.',
  },
  {
    id:    'iron_will',
    name:  'Iron Will',
    emoji: '🛡',
    desc:  'All units gain +10 shield at the start of each battle.',
  },
  {
    id:    'natures_blessing',
    name:  "Nature's Blessing",
    emoji: '🌿',
    desc:  'All units regen 2 HP per combat turn.',
  },
  {
    id:    'death_shroud',
    name:  'Death Shroud',
    emoji: '💀',
    desc:  'Every 2 combat deaths grant 3 bonus death tokens.',
  },
  {
    id:    'inferno_crest',
    name:  'Inferno Crest',
    emoji: '🔥',
    desc:  'All burn effects deal +3 damage per tick.',
  },
  {
    id:    'void_shard',
    name:  'Void Shard',
    emoji: '🌑',
    desc:  'All current units immediately gain +2 ATK (void piercing).',
  },
  {
    id:    'war_banner',
    name:  'War Banner',
    emoji: '⚔️',
    desc:  'All allies attack twice on the first turn of each battle.',
  },
  {
    id:    'lucky_charm',
    name:  'Lucky Charm',
    emoji: '🍀',
    desc:  'Shop offers one extra item every visit.',
  },
];

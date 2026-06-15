# ⚔️ Runts — Auto-Battler Roguelike

A mobile-friendly auto-battler roguelike built with vanilla HTML, CSS, and JavaScript. Draft a squad, build synergies, survive escalating waves, and face off against powerful bosses — no installs, no frameworks, just open and play.

🔗 **[Play Live](https://dimitrisdaras.github.io/runts)**

---

## 🎮 How to Play

1. **Draft** — pick 3 minions from a pool of 5 to start your squad
2. **Battle** — watch your team auto-fight a wave of enemies; combat is fully hands-off
3. **Recruit** — after each win, pick a new minion to add (or skip)
4. **Shop** — every 3 waves, spend gold on upgrades, healing, and relics
5. **Repeat** — waves get harder; bosses appear every 5 waves with special drops
6. **Survive** as long as you can

---

## ✨ Features

- ⚔️ **Auto-battle wave system** — fully animated combat plays out turn by turn with floating damage numbers
- 🃏 **Starting draft** — pick 3 from 5 randomly offered minions to shape your early strategy
- 🗺️ **3×2 grid positioning** — melee units hold the front row, ranged units attack from the back
- 🧬 **Tribe synergies** — build around 5 tribe types to unlock passive bonuses for your whole squad
- 🌀 **Skill system with evolution** — every minion has a Tier 1 skill; recruit a duplicate to evolve them to Tier 2
- 🛡️ **Dual health system** — shield absorbs damage first; HP carries the rest; manage both carefully
- 📈 **XP and leveling** — survivors earn XP after each battle and level up, permanently gaining stats
- 🪙 **Gold economy** — earn gold each wave and spend it at the shop on upgrades, heals, and relics
- 🏪 **Wave shop** — opens every 3 waves with rotating offers; Lucky Charm relic expands the selection
- 💎 **Relic system** — 10 powerful relics that grant passive effects (AOE boosts, regen, double attacks, and more)
- 👑 **Boss waves** — every 5th wave is a boss fight with boosted stats and an exclusive boss-drop unit
- ⚰️ **Graveyard & death tokens** — fallen units leave tokens behind; spend 3 to revive a lost ally or bank a permanent ATK buff
- 🏷️ **Rarity tiers** — minions come in Common, Uncommon, Rare, and Legendary; higher rarity means better base stats and skills
- 🔒 **Wave-gated recruit pool** — stronger minions only become available as you progress deeper into the run
- 🩹 **Injury system** — HP and shield do not fully reset between waves; manage attrition as your squad weathers the long haul

---

## 🛠️ Tech Stack

- Vanilla HTML, CSS, and JavaScript — zero dependencies, zero build tools
- Single-page app; all game state lives in one plain JS object
- Mobile-first layout, playable on any screen size

---

## 🚀 Running Locally

```bash
git clone https://github.com/dimitrisdaras/runts.git
cd runts
# Then just open index.html in your browser
open index.html
```

No server required. No npm install. No build step.

---

## 👤 Made By

**Dimitris Daras** — [github.com/dimitrisdaras](https://github.com/dimitrisdaras)

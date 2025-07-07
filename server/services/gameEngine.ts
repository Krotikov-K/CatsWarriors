import { storage } from "../storage";
import { type Character, type NPC, type DerivedStats, type CombatLogEntry } from "@shared/schema";

export class GameEngine {
  
  static calculateDerivedStats(character: Character | NPC): DerivedStats {
    const { strength, agility, intelligence, endurance } = character;
    
    // Damage calculation: strength is primary factor
    const baseDamage = strength * 1.2;
    const damage = {
      min: Math.floor(baseDamage * 0.8),
      max: Math.floor(baseDamage * 1.3)
    };

    // Dodge chance: agility is primary factor (max 30%)
    const dodgeChance = Math.min(30, agility * 0.8);

    // Block chance: endurance contributes to defense (max 25%)
    const blockChance = Math.min(25, endurance * 0.6);

    // Critical hit chance: intelligence affects precision (max 20%)
    const critChance = Math.min(20, intelligence * 0.5);

    return {
      damage,
      dodgeChance,
      blockChance,
      critChance
    };
  }

  static async processCombatTurn(combatId: number): Promise<void> {
    const combat = await storage.getCombat(combatId);
    if (!combat || combat.status !== "active") return;

    // Get all participants (characters and NPCs)
    const characters = await Promise.all(
      combat.participants.map(id => storage.getCharacter(id))
    );
    const npcs = await Promise.all(
      combat.npcParticipants.map(id => storage.getNPC(id))
    );

    const aliveCharacters = characters.filter(char => 
      char && char.currentHp > 0
    ) as Character[];
    
    const aliveNPCs = npcs.filter(npc => 
      npc && npc.currentHp > 0 && npc.isAlive
    ) as NPC[];

    const allCombatants = [...aliveCharacters, ...aliveNPCs];

    // Check if combat should end
    if (combat.type === "pve") {
      if (aliveCharacters.length === 0 || aliveNPCs.length === 0) {
        await this.endCombat(combatId);
        return;
      }
    } else if (allCombatants.length < 2) {
      await this.endCombat(combatId);
      return;
    }

    // Process combat turns
    for (const attacker of allCombatants) {
      let possibleTargets: (Character | NPC)[];
      
      if (combat.type === "pve") {
        // In PVE, characters attack NPCs and NPCs attack characters
        if ('userId' in attacker) { // Character
          possibleTargets = aliveNPCs;
        } else { // NPC
          possibleTargets = aliveCharacters;
        }
      } else {
        // In PVP/mixed, everyone can attack everyone else
        possibleTargets = allCombatants.filter(target => 
          target !== attacker && target.currentHp > 0
        );
      }

      if (possibleTargets.length === 0) continue;

      const target = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
      await this.executeAttack(attacker, target, combatId);
    }
  }

  private static async executeAttack(attacker: Character | NPC, target: Character | NPC, combatId: number): Promise<void> {
    const attackerStats = this.calculateDerivedStats(attacker);
    const targetStats = this.calculateDerivedStats(target);

    // Roll for dodge
    if (Math.random() * 100 < targetStats.dodgeChance) {
      const logEntry: CombatLogEntry = {
        timestamp: new Date().toISOString(),
        type: "dodge",
        actorId: target.id,
        targetId: attacker.id,
        message: `${target.name} уворачивается от атаки ${attacker.name}`
      };
      await storage.addCombatLogEntry(combatId, logEntry);
      return;
    }

    // Calculate damage
    let damage = Math.floor(
      Math.random() * (attackerStats.damage.max - attackerStats.damage.min + 1) + 
      attackerStats.damage.min
    );

    // Roll for critical hit
    if (Math.random() * 100 < attackerStats.critChance) {
      damage = Math.floor(damage * 1.5);
    }

    // Roll for block (reduces damage by 30-50%)
    if (Math.random() * 100 < targetStats.blockChance) {
      const blockReduction = 0.3 + (Math.random() * 0.2);
      damage = Math.floor(damage * (1 - blockReduction));
      
      const blockEntry: CombatLogEntry = {
        timestamp: new Date().toISOString(),
        type: "block",
        actorId: target.id,
        targetId: attacker.id,
        damage,
        message: `${target.name} блокирует часть урона от ${attacker.name}`
      };
      await storage.addCombatLogEntry(combatId, blockEntry);
    }

    // Apply damage
    const newHp = Math.max(0, target.currentHp - damage);
    
    // Update character or NPC health
    if ('userId' in target) { // Character
      await storage.updateCharacter(target.id, { currentHp: newHp });
    } else { // NPC
      await storage.updateNPC(target.id, { currentHp: newHp });
      
      // If NPC is killed, handle death and experience gain
      if (newHp === 0) {
        await storage.killNPC(target.id);
        
        // Award experience to all participating characters
        const combat = await storage.getCombat(combatId);
        if (combat) {
          for (const characterId of combat.participants) {
            const character = await storage.getCharacter(characterId);
            if (character && character.currentHp > 0) {
              const expGain = target.experienceReward;
              const newExp = character.experience + expGain;
              const newLevel = Math.floor(newExp / this.calculateLevelUpRequirement(character.level)) + 1;
              
              await storage.updateCharacter(characterId, { 
                experience: newExp,
                level: Math.max(character.level, newLevel)
              });

              const expEntry: CombatLogEntry = {
                timestamp: new Date().toISOString(),
                type: "damage",
                actorId: characterId,
                message: `${character.name} получает ${expGain} опыта!`
              };
              await storage.addCombatLogEntry(combatId, expEntry);
            }
          }
        }
      }
    }

    const attackEntry: CombatLogEntry = {
      timestamp: new Date().toISOString(),
      type: "attack",
      actorId: attacker.id,
      targetId: target.id,
      damage,
      message: `${attacker.name} атакует ${target.name} за ${damage} урона`
    };
    await storage.addCombatLogEntry(combatId, attackEntry);

    if (newHp === 0) {
      const defeatEntry: CombatLogEntry = {
        timestamp: new Date().toISOString(),
        type: "damage",
        actorId: target.id,
        message: `${target.name} побежден!`
      };
      await storage.addCombatLogEntry(combatId, defeatEntry);
    }
  }

  private static async endCombat(combatId: number): Promise<void> {
    await storage.finishCombat(combatId);
    
    const endEntry: CombatLogEntry = {
      timestamp: new Date().toISOString(),
      type: "damage",
      actorId: 0,
      message: "Бой завершен!"
    };
    await storage.addCombatLogEntry(combatId, endEntry);

    // Create game event
    await storage.createGameEvent({
      type: "combat_end",
      characterId: null,
      locationId: null,
      data: { combatId }
    });
  }

  static async startAutoCombat(combatId: number): Promise<void> {
    // Process combat turns every 3 seconds
    const interval = setInterval(async () => {
      const combat = await storage.getCombat(combatId);
      if (!combat || combat.status !== "active") {
        clearInterval(interval);
        return;
      }
      
      await this.processCombatTurn(combatId);
    }, 3000);
  }

  static calculateExperienceGain(level: number, enemyLevel: number): number {
    const basExp = 50;
    const levelDifference = enemyLevel - level;
    const multiplier = Math.max(0.5, 1 + (levelDifference * 0.1));
    return Math.floor(basExp * multiplier);
  }

  static calculateLevelUpRequirement(level: number): number {
    return level * 1000;
  }
}

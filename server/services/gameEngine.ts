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

    // For PvP, characters with 1 HP are considered defeated
    const aliveCharacters = characters.filter(char => 
      char && (combat.type === "pvp" ? char.currentHp > 1 : char.currentHp > 0)
    ) as Character[];
    
    const aliveNPCs = npcs.filter(npc => 
      npc && npc.currentHp > 0 && !npc.isDead
    ) as NPC[];
    
    console.log(`NPCs in combat ${combatId}:`, npcs.map(npc => npc ? `${npc.name} (HP: ${npc.currentHp}, Dead: ${npc.isDead})` : 'null'));
    console.log(`Alive NPCs: ${aliveNPCs.length}`);

    const allCombatants = [...aliveCharacters, ...aliveNPCs];

    console.log(`Combat ${combatId} status:`, {
      characters: aliveCharacters.length,
      npcs: aliveNPCs.length,
      npcParticipants: combat.npcParticipants,
      combatType: combat.type,
      turn: combat.currentTurn
    });

    // Check if combat should end
    if (combat.type === "pve") {
      if (aliveCharacters.length === 0 || aliveNPCs.length === 0) {
        console.log(`PvE combat ${combatId} ending: chars=${aliveCharacters.length}, npcs=${aliveNPCs.length}`);
        await this.endCombat(combatId);
        return;
      }
    } else if (combat.type === "pvp") {
      // PvP combat ends when only one character is left alive
      if (aliveCharacters.length <= 1) {
        console.log(`PvP combat ${combatId} ending: ${aliveCharacters.length} characters remaining`);
        await this.handlePvPCombatEnd(combatId, aliveCharacters);
        await this.endCombat(combatId);
        return;
      }
    } else if (allCombatants.length < 2) {
      console.log(`Combat ${combatId} ending: not enough participants (${allCombatants.length})`);
      await this.endCombat(combatId);
      return;
    }

    // Create stable sorted list for consistent turn order
    const sortedCombatants = [...allCombatants].sort((a, b) => {
      if (b.agility !== a.agility) return b.agility - a.agility;
      // If agility is equal, sort by type and then ID for consistency
      if ('userId' in a && 'type' in b) return -1; // Characters first
      if ('type' in a && 'userId' in b) return 1;  // NPCs second
      return a.id - b.id; // Then by ID
    });
    
    // Process one attack per turn, cycling through combatants
    const currentTurnIndex = combat.currentTurn % sortedCombatants.length;
    const attacker = sortedCombatants[currentTurnIndex];
    
    console.log(`Turn ${combat.currentTurn}: ${attacker.name} (${currentTurnIndex}/${sortedCombatants.length})`);
    
    // Make sure attacker is still alive (check for 1 HP in PvP)
    const isDefeated = combat.type === "pvp" ? attacker.currentHp <= 1 : attacker.currentHp <= 0;
    if (isDefeated) {
      console.log(`Attacker ${attacker.name} is defeated, skipping turn`);
      await storage.updateCombat(combatId, {
        currentTurn: combat.currentTurn + 1
      });
      return;
    }

    // Find targets for this attacker
    let possibleTargets: (Character | NPC)[];
    if (combat.type === "pve") {
      // In PVE, characters attack NPCs and NPCs attack characters
      if ('userId' in attacker) { // Character
        possibleTargets = aliveNPCs.filter(npc => npc.currentHp > 0);
      } else { // NPC
        possibleTargets = aliveCharacters.filter(char => char.currentHp > 0);
      }
    } else {
      // In PVP/mixed, everyone can attack everyone else
      possibleTargets = sortedCombatants.filter(target => 
        target !== attacker && target.currentHp > 0
      );
    }
    
    console.log(`${attacker.name} can target:`, possibleTargets.map(t => t.name));

    if (possibleTargets.length > 0) {
      // For NPCs, always target character with highest HP
      let target: Character | NPC;
      if (!('userId' in attacker)) { // NPC attacker
        target = possibleTargets.reduce((highest, current) => 
          current.currentHp > highest.currentHp ? current : highest
        );
        console.log(`NPC ${attacker.name} targets ${target.name} (highest HP: ${target.currentHp})`);
      } else {
        // For character attackers, random target
        target = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
      }
      
      console.log(`Combat ${combatId}: ${attacker.name} attacks ${target.name}`);
      await this.executeAttack(attacker, target, combatId);
    } else {
      console.log(`Combat ${combatId}: No valid targets for ${attacker.name}`);
    }
    
    // Update turn counter
    await storage.updateCombat(combatId, {
      currentTurn: combat.currentTurn + 1
    });
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

    // Apply damage and determine new HP
    let finalHp = Math.max(0, target.currentHp - damage);
    let wasDefeated = false;
    
    // Handle PvP vs PvE differently
    if ('userId' in target) { 
      // Target is a character (PvP) - no permanent death
      if (finalHp === 0) {
        finalHp = 1;
        wasDefeated = true;
        
        const defeatEntry: CombatLogEntry = {
          timestamp: new Date().toISOString(),
          type: "damage",
          actorId: target.id,
          message: `${target.name} поражен в честном бою и отступает!`
        };
        await storage.addCombatLogEntry(combatId, defeatEntry);
      }
      
      await storage.updateCharacter(target.id, { currentHp: finalHp });
    } else { 
      // Target is an NPC - can be killed
      await storage.updateNPC(target.id, { currentHp: finalHp });
      
      if (finalHp === 0) {
        wasDefeated = true;
        await storage.killNPC(target.id);
        
        // Award experience to surviving characters
        const combat = await storage.getCombat(combatId);
        if (combat) {
          console.log(`Awarding experience for combat ${combatId}:`);
          console.log(`- NPC killed: ${target.name} (${target.experienceReward} exp)`);
          console.log(`- Combat participants: [${combat.participants.join(', ')}]`);
          
          const survivingParticipants: number[] = [];
          
          for (const characterId of combat.participants) {
            const character = await storage.getCharacter(characterId);
            if (character && character.currentHp > 0) {
              const expGain = target.experienceReward;
              console.log(`- ${character.name} (ID: ${characterId}): ${character.experience} -> ${character.experience + expGain} exp (HP: ${character.currentHp})`);
              
              await storage.updateCharacter(characterId, {
                experience: character.experience + expGain
              });

              console.log(`${character.name} gained ${expGain} experience`);
              await this.checkAndProcessLevelUp(characterId);

              const expEntry: CombatLogEntry = {
                timestamp: new Date().toISOString(),
                type: "join",
                actorId: characterId,
                message: `${character.name} получает ${expGain} опыта за победу!`
              };
              await storage.addCombatLogEntry(combatId, expEntry);
              
              survivingParticipants.push(characterId);
            } else if (character) {
              console.log(`- ${character.name} (ID: ${characterId}): NOT awarded (HP: ${character.currentHp})`);
            } else {
              console.log(`- Character ID ${characterId}: NOT FOUND`);
            }
          }
          
          // Broadcast group victory to all surviving participants
          if (survivingParticipants.length > 1) {
            console.log(`*** SENDING GROUP VICTORY NOTIFICATION ***`);
            console.log(`- Participants: [${survivingParticipants.join(', ')}]`);
            console.log(`- NPC defeated: ${target.name}`);
            console.log(`- Experience gained: ${target.experienceReward}`);
            
            const broadcastGroupVictory = (global as any).broadcastGroupVictory;
            if (broadcastGroupVictory) {
              console.log(`- Broadcasting via WebSocket to ${survivingParticipants.length} participants`);
              await broadcastGroupVictory(survivingParticipants, target.name, target.experienceReward);
              console.log(`- Group victory notification sent successfully`);
            } else {
              console.log(`- ERROR: broadcastGroupVictory function not available`);
            }
          } else {
            console.log(`- Not a group victory: only ${survivingParticipants.length} participants`);
          }
        }
      }
    }

    // Log the attack
    const attackEntry: CombatLogEntry = {
      timestamp: new Date().toISOString(),
      type: "attack",
      actorId: attacker.id,
      targetId: target.id,
      damage,
      message: `${attacker.name} атакует ${target.name} за ${damage} урона`
    };
    await storage.addCombatLogEntry(combatId, attackEntry);

    // Log defeat (only for NPCs, as PvP defeat is handled above)
    if (wasDefeated && !('userId' in target)) {
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
    console.log(`Ending combat ${combatId}`);
    
    const endEntry: CombatLogEntry = {
      timestamp: new Date().toISOString(),
      type: "leave",
      actorId: -1,
      message: "Бой завершен!"
    };
    await storage.addCombatLogEntry(combatId, endEntry);
    
    // Finish combat using storage method
    const finishedCombat = await storage.finishCombat(combatId);
    console.log(`Combat ${combatId} finished with status:`, finishedCombat?.status);

    // Create game event
    await storage.createGameEvent({
      type: "combat_end",
      characterId: null,
      locationId: null,
      data: { combatId }
    });
  }

  static async startAutoCombat(combatId: number): Promise<void> {
    console.log(`Starting auto combat for combat ID: ${combatId}`);
    
    // Process combat turns every 3 seconds to give client time to see updates
    const interval = setInterval(async () => {
      try {
        const combat = await storage.getCombat(combatId);
        if (!combat || combat.status !== "active") {
          console.log(`Combat ${combatId} ended or not found, stopping auto combat`);
          clearInterval(interval);
          return;
        }
        
        await this.processCombatTurn(combatId);
      } catch (error) {
        console.error(`Error processing combat turn for ${combatId}:`, error);
        // Don't stop combat on single error, just log it
      }
    }, 3000);
  }

  static calculateExperienceGain(level: number, enemyLevel: number): number {
    const basExp = 50;
    const levelDifference = enemyLevel - level;
    const multiplier = Math.max(0.5, 1 + (levelDifference * 0.1));
    return Math.floor(basExp * multiplier);
  }

  static getRequiredExperienceForLevel(level: number): number {
    return level * 1000;
  }

  private static async handlePvPCombatEnd(combatId: number, survivors: Character[]): Promise<void> {
    const combat = await storage.getCombat(combatId);
    if (!combat) return;

    // Get all participants to identify winners and losers
    const allParticipants = await Promise.all(
      combat.participants.map(id => storage.getCharacter(id))
    );

    // Winner is the one with HP > 1, loser is the one with HP = 1
    const winner = allParticipants.find(char => char && char.currentHp > 1);
    const losers = allParticipants.filter(char => char && char.currentHp <= 1);

    if (winner) {
      console.log(`${winner.name} won PvP combat (no experience reward)`);
      
      const victoryEntry: CombatLogEntry = {
        timestamp: new Date().toISOString(),
        type: "join",
        actorId: winner.id,
        message: `🏆 ${winner.name} одерживает победу в племенной дуэли! Честь и слава воителю!`
      };
      await storage.addCombatLogEntry(combatId, victoryEntry);
    }

    // Create game event for PvP result
    await storage.createGameEvent({
      type: "pvp_victory",
      characterId: winner?.id || null,
      locationId: combat.locationId,
      data: { 
        winnerId: winner?.id,
        loserIds: losers.map(l => l?.id).filter(Boolean)
      }
    });
  }

  static async checkAndProcessLevelUp(characterId: number): Promise<boolean> {
    const character = await storage.getCharacter(characterId);
    if (!character) {
      console.log(`Character ${characterId} not found for level up check`);
      return false;
    }

    // Calculate what level character should be based on experience
    // Level 1: 0-999 exp, Level 2: 1000-1999 exp, Level 3: 2000-2999 exp, etc.
    // So level = Math.floor(experience / 1000) + 1
    const correctLevel = Math.floor(character.experience / 1000) + 1;
    
    console.log(`Level up check for ${character.name}: current level=${character.level}, exp=${character.experience}, should be level=${correctLevel}`);
    
    if (correctLevel > character.level) {
      console.log(`Character ${character.name} leveling up from ${character.level} to ${correctLevel}!`);
      
      // Level up the character to the correct level and give stat points
      const levelsGained = correctLevel - character.level;
      const statPointsGained = levelsGained * 5; // 5 stat points per level
      
      await storage.updateCharacter(characterId, {
        level: correctLevel,
        unspentStatPoints: character.unspentStatPoints + statPointsGained
      });

      // Create level up event
      await storage.createGameEvent({
        type: "level_up",
        characterId: character.id,
        locationId: character.currentLocationId,
        data: { 
          characterName: character.name, 
          newLevel: correctLevel,
          experience: character.experience,
          levelsGained
        }
      });

      console.log(`Character ${character.name} leveled up to level ${correctLevel}! Gained ${levelsGained} levels and ${statPointsGained} stat points.`);
      return true;
    }

    console.log(`Character ${character.name} does not need level up yet. Level ${character.level} is correct for ${character.experience} exp.`);
    return false;
  }

  static calculateLevelUpRequirement(level: number): number {
    return level * 1000;
  }

  // Check multiple level ups at once
  static async checkMultipleLevelUps(characterId: number): Promise<number> {
    let levelsGained = 0;
    let leveledUp = true;
    
    while (leveledUp) {
      leveledUp = await this.checkAndProcessLevelUp(characterId);
      if (leveledUp) {
        levelsGained++;
      }
    }
    
    return levelsGained;
  }
}

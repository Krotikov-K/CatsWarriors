import {
  users,
  characters,
  locations,
  npcs,
  combats,
  gameEvents,
  type User,
  type Character,
  type Location,
  type Combat,
  type NPC,
  type GameEvent,
  type InsertUser,
  type InsertCharacter,
  type InsertLocation,
  type InsertNPC,
  type CombatLogEntry,
  LOCATIONS_DATA,
  NPCS_DATA
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // Character methods
  getCharacter(id: number): Promise<Character | undefined>;
  getCharactersByUserId(userId: number): Promise<Character[]>;
  getCharactersByLocation(locationId: number): Promise<Character[]>;
  getOnlineCharacters(): Promise<Character[]>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  updateCharacter(id: number, updates: Partial<Character>): Promise<Character | undefined>;
  updateCharacterStats(id: number, stats: { strength: number; agility: number; intelligence: number; endurance: number }): Promise<Character | undefined>;
  setCharacterOnline(id: number, online: boolean): Promise<void>;
  moveCharacter(id: number, locationId: number): Promise<Character | undefined>;

  // Location methods
  getLocation(id: number): Promise<Location | undefined>;
  getAllLocations(): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;

  // NPC methods
  getNPC(id: number): Promise<NPC | undefined>;
  getNPCsByLocation(locationId: number): Promise<NPC[]>;
  getAllNPCs(): Promise<NPC[]>;
  createNPC(npc: InsertNPC): Promise<NPC>;
  updateNPC(id: number, updates: Partial<NPC>): Promise<NPC | undefined>;
  respawnNPC(npcId: number): Promise<NPC | undefined>;
  killNPC(npcId: number): Promise<void>;

  // Combat methods
  getCombat(id: number): Promise<Combat | undefined>;
  getActiveCombatsInLocation(locationId: number): Promise<Combat[]>;
  getCharacterActiveCombat(characterId: number): Promise<Combat | undefined>;
  createCombat(locationId: number, participants: number[]): Promise<Combat>;
  addCombatLogEntry(combatId: number, entry: CombatLogEntry): Promise<void>;
  addParticipantToCombat(combatId: number, characterId: number): Promise<Combat | undefined>;
  updateCombat(combatId: number, updates: Partial<Combat>): Promise<Combat | undefined>;
  finishCombat(combatId: number): Promise<Combat | undefined>;

  // Game Events
  createGameEvent(event: Omit<GameEvent, 'id' | 'createdAt'>): Promise<GameEvent>;
  getRecentEvents(limit: number): Promise<GameEvent[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private characters: Map<number, Character> = new Map();
  private locations: Map<number, Location> = new Map();
  private npcs: Map<number, NPC> = new Map();
  private combats: Map<number, Combat> = new Map();
  private gameEvents: Map<number, GameEvent> = new Map();
  
  private currentUserId = 1;
  private currentCharacterId = 1;
  private currentLocationId = 1;
  private currentNpcId = 1;
  private currentCombatId = 1;
  private currentEventId = 1;

  constructor() {
    this.initializeLocations();
    this.initializeNPCs();
    this.spawnInitialNPCs();
  }

  private initializeLocations() {
    LOCATIONS_DATA.forEach(locationData => {
      const location: Location = {
        id: locationData.id,
        name: locationData.name,
        description: `Территория ${locationData.name}`,
        type: locationData.type,
        clan: locationData.clan,
        maxPlayers: 50,
        dangerLevel: locationData.dangerLevel,
        createdAt: new Date(),
      };
      this.locations.set(location.id, location);
      if (location.id >= this.currentLocationId) {
        this.currentLocationId = location.id + 1;
      }
    });
  }

  private initializeNPCs() {
    // NPCs data structures initialized but not spawned yet
  }

  private spawnInitialNPCs() {
    // Spawn initial NPCs in hunting and combat locations
    NPCS_DATA.forEach(npcData => {
      if (npcData.type === 'enemy' || npcData.type === 'boss') {
        const npc: NPC = {
          id: npcData.id,
          name: npcData.name,
          type: npcData.type,
          level: npcData.level,
          strength: npcData.strength,
          agility: npcData.agility,
          intelligence: npcData.intelligence,
          endurance: npcData.endurance,
          currentHp: npcData.maxHp,
          maxHp: npcData.maxHp,
          description: npcData.description,
          emoji: npcData.emoji,
          experienceReward: npcData.experienceReward,
          spawnsInLocation: npcData.spawnsInLocation,
          respawnTime: npcData.respawnTime,
          isAlive: true,
          lastDeath: null,
          createdAt: new Date(),
        };
        this.npcs.set(npc.id, npc);
        if (npc.id >= this.currentNpcId) {
          this.currentNpcId = npc.id + 1;
        }
      }
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.telegramId === telegramId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      telegramId: insertUser.telegramId || null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Character methods
  async getCharacter(id: number): Promise<Character | undefined> {
    return this.characters.get(id);
  }

  async getCharactersByUserId(userId: number): Promise<Character[]> {
    return Array.from(this.characters.values()).filter(char => char.userId === userId);
  }

  async getCharactersByLocation(locationId: number): Promise<Character[]> {
    return Array.from(this.characters.values()).filter(char => char.currentLocationId === locationId);
  }

  async getOnlineCharacters(): Promise<Character[]> {
    return Array.from(this.characters.values()).filter(char => char.isOnline);
  }

  async createCharacter(insertCharacter: InsertCharacter): Promise<Character> {
    const id = this.currentCharacterId++;
    const maxHp = this.calculateMaxHp(insertCharacter.endurance);
    const character: Character = {
      ...insertCharacter,
      id,
      level: 1,
      experience: 0,
      currentHp: maxHp,
      maxHp,
      currentLocationId: 1, // Start at Thunder Clan camp
      isOnline: true,
      lastActivity: new Date(),
      createdAt: new Date(),
    };
    this.characters.set(id, character);
    return character;
  }

  async updateCharacter(id: number, updates: Partial<Character>): Promise<Character | undefined> {
    const character = this.characters.get(id);
    if (!character) return undefined;

    const updatedCharacter = { ...character, ...updates };
    this.characters.set(id, updatedCharacter);
    return updatedCharacter;
  }

  async updateCharacterStats(id: number, stats: { strength: number; agility: number; intelligence: number; endurance: number }): Promise<Character | undefined> {
    const character = this.characters.get(id);
    if (!character) return undefined;

    const newMaxHp = this.calculateMaxHp(stats.endurance);
    const hpDifference = newMaxHp - character.maxHp;
    const newCurrentHp = Math.max(1, character.currentHp + hpDifference);

    const updatedCharacter = {
      ...character,
      ...stats,
      maxHp: newMaxHp,
      currentHp: newCurrentHp,
    };
    this.characters.set(id, updatedCharacter);
    return updatedCharacter;
  }

  async setCharacterOnline(id: number, online: boolean): Promise<void> {
    const character = this.characters.get(id);
    if (character) {
      character.isOnline = online;
      character.lastActivity = new Date();
      this.characters.set(id, character);
    }
  }

  async moveCharacter(id: number, locationId: number): Promise<Character | undefined> {
    const character = this.characters.get(id);
    if (!character) return undefined;

    character.currentLocationId = locationId;
    this.characters.set(id, character);
    return character;
  }

  // Location methods
  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async getAllLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const id = this.currentLocationId++;
    const location: Location = {
      id,
      name: insertLocation.name,
      description: insertLocation.description,
      type: insertLocation.type,
      clan: insertLocation.clan || null,
      maxPlayers: insertLocation.maxPlayers || 50,
      dangerLevel: insertLocation.dangerLevel || 1,
      createdAt: new Date(),
    };
    this.locations.set(id, location);
    return location;
  }

  // NPC methods
  async getNPC(id: number): Promise<NPC | undefined> {
    return this.npcs.get(id);
  }

  async getNPCsByLocation(locationId: number): Promise<NPC[]> {
    return Array.from(this.npcs.values()).filter(npc => 
      npc.isAlive && npc.spawnsInLocation.includes(locationId)
    );
  }

  async getAllNPCs(): Promise<NPC[]> {
    return Array.from(this.npcs.values());
  }

  async createNPC(insertNpc: InsertNPC): Promise<NPC> {
    const id = this.currentNpcId++;
    const npc: NPC = {
      id,
      name: insertNpc.name,
      type: insertNpc.type,
      level: insertNpc.level,
      currentHp: insertNpc.maxHp,
      maxHp: insertNpc.maxHp,
      strength: insertNpc.strength,
      agility: insertNpc.agility,
      intelligence: insertNpc.intelligence,
      endurance: insertNpc.endurance,
      description: insertNpc.description,
      emoji: insertNpc.emoji || "🐱",
      experienceReward: insertNpc.experienceReward || 50,
      spawnsInLocation: insertNpc.spawnsInLocation || [],
      respawnTime: insertNpc.respawnTime || 300,
      isAlive: true,
      lastKilled: null,
      createdAt: new Date(),
    };
    this.npcs.set(id, npc);
    return npc;
  }

  async updateNPC(id: number, updates: Partial<NPC>): Promise<NPC | undefined> {
    const npc = this.npcs.get(id);
    if (!npc) return undefined;

    const updatedNpc = { ...npc, ...updates };
    this.npcs.set(id, updatedNpc);
    return updatedNpc;
  }

  async respawnNPC(npcId: number): Promise<NPC | undefined> {
    const npc = this.npcs.get(npcId);
    if (!npc) return undefined;

    const respawnedNpc = {
      ...npc,
      isAlive: true,
      currentHp: npc.maxHp,
      lastKilled: null,
    };
    this.npcs.set(npcId, respawnedNpc);
    return respawnedNpc;
  }

  async killNPC(npcId: number): Promise<void> {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    const killedNpc = {
      ...npc,
      isAlive: false,
      currentHp: 0,
      lastKilled: new Date(),
    };
    this.npcs.set(npcId, killedNpc);

    // Schedule respawn if respawnTime > 0
    if (npc.respawnTime > 0) {
      setTimeout(() => {
        this.respawnNPC(npcId);
      }, npc.respawnTime * 1000);
    }
  }

  // Combat methods
  async getCombat(id: number): Promise<Combat | undefined> {
    return this.combats.get(id);
  }

  async getActiveCombatsInLocation(locationId: number): Promise<Combat[]> {
    return Array.from(this.combats.values()).filter(
      combat => combat.locationId === locationId && combat.status === "active"
    );
  }

  async getCharacterActiveCombat(characterId: number): Promise<Combat | undefined> {
    const activeCombat = Array.from(this.combats.values()).find(
      combat => combat.status === "active" && combat.participants.includes(characterId)
    );
    console.log(`Getting active combat for character ${characterId}:`, activeCombat?.id);
    return activeCombat;
  }

  async createCombat(locationId: number, participants: number[]): Promise<Combat> {
    const id = this.currentCombatId++;
    const combat: Combat = {
      id,
      locationId,
      participants,
      status: "active",
      currentTurn: 0,
      combatLog: [],
      startedAt: new Date(),
      finishedAt: null,
    };
    this.combats.set(id, combat);
    return combat;
  }

  async addCombatLogEntry(combatId: number, entry: CombatLogEntry): Promise<void> {
    const combat = this.combats.get(combatId);
    if (combat) {
      combat.combatLog.push(entry);
      this.combats.set(combatId, combat);
    }
  }

  async addParticipantToCombat(combatId: number, characterId: number): Promise<Combat | undefined> {
    const combat = this.combats.get(combatId);
    if (!combat || combat.participants.includes(characterId)) return combat;

    combat.participants.push(characterId);
    this.combats.set(combatId, combat);
    return combat;
  }

  async updateCombat(combatId: number, updates: Partial<Combat>): Promise<Combat | undefined> {
    const combat = this.combats.get(combatId);
    if (!combat) return undefined;

    const updatedCombat = { ...combat, ...updates };
    this.combats.set(combatId, updatedCombat);
    return updatedCombat;
  }

  async finishCombat(combatId: number): Promise<Combat | undefined> {
    const combat = this.combats.get(combatId);
    if (!combat) return undefined;

    combat.status = "finished";
    combat.isFinished = true;
    combat.finishedAt = new Date();
    this.combats.set(combatId, combat);
    return combat;
  }

  // Game Events
  async createGameEvent(event: Omit<GameEvent, 'id' | 'createdAt'>): Promise<GameEvent> {
    const id = this.currentEventId++;
    const gameEvent: GameEvent = {
      ...event,
      id,
      createdAt: new Date(),
    };
    this.gameEvents.set(id, gameEvent);
    return gameEvent;
  }

  async getRecentEvents(limit: number): Promise<GameEvent[]> {
    return Array.from(this.gameEvents.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  private calculateMaxHp(endurance: number): number {
    return 80 + (endurance * 2);
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Character methods
  async getCharacter(id: number): Promise<Character | undefined> {
    const [character] = await db.select().from(characters).where(eq(characters.id, id));
    return character || undefined;
  }

  async getCharactersByUserId(userId: number): Promise<Character[]> {
    return await db.select().from(characters).where(eq(characters.userId, userId));
  }

  async getCharactersByLocation(locationId: number): Promise<Character[]> {
    return await db.select().from(characters).where(eq(characters.currentLocationId, locationId));
  }

  async getOnlineCharacters(): Promise<Character[]> {
    return await db.select().from(characters).where(eq(characters.isOnline, true));
  }

  async createCharacter(insertCharacter: InsertCharacter): Promise<Character> {
    const maxHp = this.calculateMaxHp(insertCharacter.endurance);
    const [character] = await db
      .insert(characters)
      .values({
        ...insertCharacter,
        level: 1,
        experience: 0,
        maxHp,
        currentHp: maxHp,
        currentLocationId: insertCharacter.clan === 'thunder' ? 1 : 2, // Thunderclan or Riverclan territory
        isOnline: false,
      })
      .returning();
    return character;
  }

  async updateCharacter(id: number, updates: Partial<Character>): Promise<Character | undefined> {
    const [character] = await db
      .update(characters)
      .set(updates)
      .where(eq(characters.id, id))
      .returning();
    return character || undefined;
  }

  async updateCharacterStats(id: number, stats: { strength: number; agility: number; intelligence: number; endurance: number }): Promise<Character | undefined> {
    const maxHp = this.calculateMaxHp(stats.endurance);
    const [character] = await db
      .update(characters)
      .set({ ...stats, maxHp })
      .where(eq(characters.id, id))
      .returning();
    return character || undefined;
  }

  async setCharacterOnline(id: number, online: boolean): Promise<void> {
    await db
      .update(characters)
      .set({ isOnline: online })
      .where(eq(characters.id, id));
  }

  async moveCharacter(id: number, locationId: number): Promise<Character | undefined> {
    const [character] = await db
      .update(characters)
      .set({ currentLocationId: locationId })
      .where(eq(characters.id, id))
      .returning();
    return character || undefined;
  }

  // Location methods - these will use in-memory data for now since locations are static
  async getLocation(id: number): Promise<Location | undefined> {
    // For now, use the static location data
    return LOCATIONS_DATA.find(loc => loc.id === id);
  }

  async getAllLocations(): Promise<Location[]> {
    return [...LOCATIONS_DATA];
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    // Not implemented for now as locations are static
    throw new Error("Creating locations not supported in current implementation");
  }

  // NPC methods - these will use in-memory storage for now as they respawn
  private npcsMap = new Map<number, NPC>();
  private currentNpcId = 1;

  constructor() {
    this.initializeNPCs();
  }

  private initializeNPCs() {
    NPCS_DATA.forEach(npcData => {
      const npc: NPC = {
        ...npcData,
        id: this.currentNpcId++,
        currentHp: npcData.maxHp,
        isDead: false,
        lastDeathTime: null,
      };
      this.npcsMap.set(npc.id, npc);
    });
  }

  async getNPC(id: number): Promise<NPC | undefined> {
    return this.npcsMap.get(id);
  }

  async getNPCsByLocation(locationId: number): Promise<NPC[]> {
    return Array.from(this.npcsMap.values()).filter(npc => 
      npc.spawnsInLocation.includes(locationId) && !npc.isDead
    );
  }

  async getAllNPCs(): Promise<NPC[]> {
    return Array.from(this.npcsMap.values());
  }

  async createNPC(insertNpc: InsertNPC): Promise<NPC> {
    const id = this.currentNpcId++;
    const npc: NPC = {
      ...insertNpc,
      id,
      currentHp: insertNpc.maxHp,
      isDead: false,
      lastDeathTime: null,
    };
    this.npcsMap.set(id, npc);
    return npc;
  }

  async updateNPC(id: number, updates: Partial<NPC>): Promise<NPC | undefined> {
    const npc = this.npcsMap.get(id);
    if (!npc) return undefined;

    const updatedNpc = { ...npc, ...updates };
    this.npcsMap.set(id, updatedNpc);
    return updatedNpc;
  }

  async respawnNPC(npcId: number): Promise<NPC | undefined> {
    const npc = this.npcsMap.get(npcId);
    if (!npc) return undefined;

    npc.isDead = false;
    npc.currentHp = npc.maxHp;
    npc.lastDeathTime = null;
    this.npcsMap.set(npcId, npc);
    return npc;
  }

  async killNPC(npcId: number): Promise<void> {
    const npc = this.npcsMap.get(npcId);
    if (npc) {
      npc.isDead = true;
      npc.currentHp = 0;
      npc.lastDeathTime = new Date();
      this.npcsMap.set(npcId, npc);
    }
  }

  // Combat methods - use in-memory for real-time combat
  private combatsMap = new Map<number, Combat>();
  private currentCombatId = 1;

  async getCombat(id: number): Promise<Combat | undefined> {
    return this.combatsMap.get(id);
  }

  async getActiveCombatsInLocation(locationId: number): Promise<Combat[]> {
    return Array.from(this.combatsMap.values()).filter(
      combat => combat.locationId === locationId && combat.status === "active"
    );
  }

  async getCharacterActiveCombat(characterId: number): Promise<Combat | undefined> {
    const activeCombat = Array.from(this.combatsMap.values()).find(
      combat => combat.status === "active" && combat.participants.includes(characterId)
    );
    console.log(`Getting active combat for character ${characterId}:`, activeCombat?.id);
    return activeCombat;
  }

  async createCombat(locationId: number, participants: number[]): Promise<Combat> {
    const id = this.currentCombatId++;
    const combat: Combat = {
      id,
      locationId,
      participants,
      status: "active",
      currentTurn: 0,
      combatLog: [],
      startedAt: new Date(),
      finishedAt: null,
    };
    this.combatsMap.set(id, combat);
    return combat;
  }

  async addCombatLogEntry(combatId: number, entry: CombatLogEntry): Promise<void> {
    const combat = this.combatsMap.get(combatId);
    if (combat) {
      combat.combatLog.push(entry);
      this.combatsMap.set(combatId, combat);
    }
  }

  async addParticipantToCombat(combatId: number, characterId: number): Promise<Combat | undefined> {
    const combat = this.combatsMap.get(combatId);
    if (!combat) return undefined;

    if (!combat.participants.includes(characterId)) {
      combat.participants.push(characterId);
      this.combatsMap.set(combatId, combat);
    }
    return combat;
  }

  async updateCombat(combatId: number, updates: Partial<Combat>): Promise<Combat | undefined> {
    const combat = this.combatsMap.get(combatId);
    if (!combat) return undefined;

    const updatedCombat = { ...combat, ...updates };
    this.combatsMap.set(combatId, updatedCombat);
    return updatedCombat;
  }

  async finishCombat(combatId: number): Promise<Combat | undefined> {
    const combat = this.combatsMap.get(combatId);
    if (!combat) return undefined;

    combat.status = "finished";
    combat.isFinished = true;
    combat.finishedAt = new Date();
    this.combatsMap.set(combatId, combat);
    return combat;
  }

  // Game Events - store in database
  async createGameEvent(event: Omit<GameEvent, 'id' | 'createdAt'>): Promise<GameEvent> {
    const [gameEvent] = await db
      .insert(gameEvents)
      .values(event)
      .returning();
    return gameEvent;
  }

  async getRecentEvents(limit: number): Promise<GameEvent[]> {
    return await db
      .select()
      .from(gameEvents)
      .orderBy(gameEvents.createdAt)
      .limit(limit);
  }

  private calculateMaxHp(endurance: number): number {
    return Math.floor(endurance * 4.5) + 50;
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();

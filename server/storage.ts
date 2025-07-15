import {
  users,
  characters,
  locations,
  npcs,
  combats,
  gameEvents,
  groups,
  groupMembers,
  type User,
  type Character,
  type Location,
  type Combat,
  type NPC,
  type GameEvent,
  type Group,
  type GroupMember,
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
  getCharacterLastCompletedCombat(characterId: number): Promise<Combat | undefined>;
  createCombat(locationId: number, participants: number[]): Promise<Combat>;
  addCombatLogEntry(combatId: number, entry: CombatLogEntry): Promise<void>;
  addParticipantToCombat(combatId: number, characterId: number): Promise<Combat | undefined>;
  updateCombat(combatId: number, updates: Partial<Combat>): Promise<Combat | undefined>;
  finishCombat(combatId: number): Promise<Combat | undefined>;

  // Game Events
  createGameEvent(event: Omit<GameEvent, 'id' | 'createdAt'>): Promise<GameEvent>;
  getRecentEvents(limit: number): Promise<GameEvent[]>;

  // Group methods
  createGroup(name: string, leaderId: number, locationId: number): Promise<Group>;
  getGroup(id: number): Promise<Group | undefined>;
  getGroupsInLocation(locationId: number): Promise<Group[]>;
  getCharacterGroup(characterId: number): Promise<Group | undefined>;
  joinGroup(groupId: number, characterId: number): Promise<GroupMember | undefined>;
  leaveGroup(characterId: number): Promise<void>;
  disbandGroup(groupId: number): Promise<void>;
  getGroupMembers(groupId: number): Promise<Character[]>;

  // Admin methods
  getAllUsers(): Promise<User[]>;
  updateLocation(id: number, updates: Partial<Location>): Promise<Location | undefined>;
  
  // Health regeneration
  processHealthRegeneration(characterId: number): Promise<Character | undefined>;
  useHealingPoultice(characterId: number): Promise<Character | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private characters: Map<number, Character> = new Map();
  private locations: Map<number, Location> = new Map();
  private npcs: Map<number, NPC> = new Map();
  private combats: Map<number, Combat> = new Map();
  private gameEvents: Map<number, GameEvent> = new Map();
  private groups: Map<number, Group> = new Map();
  private groupMembers: Map<number, GroupMember> = new Map();
  
  private currentUserId = 1;
  private currentCharacterId = 1;
  private currentLocationId = 1;
  private currentNpcId = 1;
  private currentCombatId = 1;
  private currentEventId = 1;
  private currentGroupId = 1;
  private currentGroupMemberId = 1;

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
    // Spawn initial NPCs in hunting and combat locations, plus elders
    NPCS_DATA.forEach(npcData => {
      if (npcData.type === 'enemy' || npcData.type === 'boss' || npcData.type === 'neutral' || npcData.type === 'elder') {
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

  async getCharacterLastCompletedCombat(characterId: number): Promise<Combat | undefined> {
    console.log(`Looking for completed combats for character ${characterId}`);
    console.log(`Total combats in memory:`, this.combats.size);
    
    const allCombats = Array.from(this.combats.values());
    const characterCombats = allCombats.filter(c => c.participants.includes(characterId));
    
    console.log(`Character ${characterId} combats:`, characterCombats.map(c => ({
      id: c.id,
      status: c.status,
      participants: c.participants,
      finishedAt: c.finishedAt,
      logEntries: c.combatLog?.length || 0
    })));
    
    const completedCombats = characterCombats
      .filter(combat => 
        combat.status === "finished" && 
        combat.finishedAt
      )
      .sort((a, b) => (b.finishedAt?.getTime() || 0) - (a.finishedAt?.getTime() || 0));
    
    console.log(`Found ${completedCombats.length} completed combats for character ${characterId}`);
    const lastCombat = completedCombats[0];
    
    if (lastCombat) {
      console.log(`Returning combat ${lastCombat.id} with ${lastCombat.combatLog?.length || 0} log entries`);
    }
    
    return lastCombat;
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

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateLocation(id: number, updates: Partial<Location>): Promise<Location | undefined> {
    const location = this.locations.get(id);
    if (!location) return undefined;

    const updatedLocation = { ...location, ...updates };
    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }

  // Group methods
  async createGroup(name: string, leaderId: number, locationId: number): Promise<Group> {
    const id = this.currentGroupId++;
    const group: Group = {
      id,
      name,
      leaderId,
      locationId,
      maxMembers: 5,
      isActive: true,
      createdAt: new Date(),
    };
    this.groups.set(id, group);

    // Add leader as first member
    const memberId = this.currentGroupMemberId++;
    const member: GroupMember = {
      id: memberId,
      groupId: id,
      characterId: leaderId,
      joinedAt: new Date(),
    };
    this.groupMembers.set(memberId, member);

    return group;
  }

  async getGroup(id: number): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async getGroupsInLocation(locationId: number): Promise<Group[]> {
    return Array.from(this.groups.values()).filter(
      group => group.locationId === locationId && group.isActive
    );
  }

  async getCharacterGroup(characterId: number): Promise<Group | undefined> {
    const membership = Array.from(this.groupMembers.values()).find(
      member => member.characterId === characterId
    );
    if (!membership) return undefined;
    return this.groups.get(membership.groupId);
  }

  async joinGroup(groupId: number, characterId: number): Promise<GroupMember | undefined> {
    const group = this.groups.get(groupId);
    if (!group || !group.isActive) return undefined;

    // Check if character is already in a group
    const existingMembership = Array.from(this.groupMembers.values()).find(
      member => member.characterId === characterId
    );
    if (existingMembership) return undefined;

    // Check group capacity
    const currentMembers = Array.from(this.groupMembers.values()).filter(
      member => member.groupId === groupId
    );
    if (currentMembers.length >= group.maxMembers) return undefined;

    const memberId = this.currentGroupMemberId++;
    const member: GroupMember = {
      id: memberId,
      groupId,
      characterId,
      joinedAt: new Date(),
    };
    this.groupMembers.set(memberId, member);
    return member;
  }

  async leaveGroup(characterId: number): Promise<void> {
    const membership = Array.from(this.groupMembers.values()).find(
      member => member.characterId === characterId
    );
    if (!membership) return;

    this.groupMembers.delete(membership.id);

    // If leader leaves, disband group
    const group = this.groups.get(membership.groupId);
    if (group && group.leaderId === characterId) {
      await this.disbandGroup(membership.groupId);
    }
  }

  async disbandGroup(groupId: number): Promise<void> {
    const group = this.groups.get(groupId);
    if (!group) return;

    group.isActive = false;
    this.groups.set(groupId, group);

    // Remove all members
    for (const [id, member] of this.groupMembers) {
      if (member.groupId === groupId) {
        this.groupMembers.delete(id);
      }
    }
  }

  async getGroupMembers(groupId: number): Promise<Character[]> {
    const memberIds = Array.from(this.groupMembers.values())
      .filter(member => member.groupId === groupId)
      .map(member => member.characterId);

    return memberIds
      .map(id => this.characters.get(id))
      .filter(char => char !== undefined) as Character[];
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
    const allNPCs = Array.from(this.npcsMap.values()).filter(npc => 
      npc.spawnsInLocation.includes(locationId)
    );

    // Add respawn time remaining for dead NPCs
    return allNPCs.map(npc => {
      if (npc.isDead && npc.lastDeathTime && npc.respawnTime > 0) {
        const timeElapsed = Math.floor((Date.now() - npc.lastDeathTime.getTime()) / 1000);
        const timeRemaining = Math.max(0, npc.respawnTime - timeElapsed);
        return { ...npc, respawnTimeRemaining: timeRemaining };
      }
      return npc;
    });
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

      // Schedule respawn if respawnTime > 0
      if (npc.respawnTime > 0) {
        setTimeout(() => {
          this.respawnNPC(npcId);
        }, npc.respawnTime * 1000);
      }
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

  async getCharacterLastCompletedCombat(characterId: number): Promise<Combat | undefined> {
    console.log(`Looking for completed combats for character ${characterId}`);
    console.log(`Total combats in memory:`, this.combatsMap.size);
    
    const completedCombats = Array.from(this.combatsMap.values())
      .filter(combat => 
        combat.status === "finished" && 
        combat.participants.includes(characterId) &&
        combat.finishedAt
      )
      .sort((a, b) => (b.finishedAt?.getTime() || 0) - (a.finishedAt?.getTime() || 0));
    
    console.log(`Found ${completedCombats.length} completed combats for character ${characterId}`);
    const lastCombat = completedCombats[0];
    
    if (lastCombat) {
      console.log(`Returning combat ${lastCombat.id} with ${lastCombat.combatLog?.length || 0} log entries`);
    } else {
      console.log(`No completed combat found for character ${characterId}`);
    }
    
    return lastCombat;
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateLocation(id: number, updates: Partial<Location>): Promise<Location | undefined> {
    // In DatabaseStorage, locations are still stored in memory, not in database
    // Find the location in static data first
    const staticLocation = LOCATIONS_DATA.find(loc => loc.id === id);
    if (!staticLocation) {
      console.log(`Location ${id} not found in static data`);
      return undefined;
    }
    
    // Update the static location data
    const locationIndex = LOCATIONS_DATA.findIndex(loc => loc.id === id);
    if (locationIndex !== -1) {
      LOCATIONS_DATA[locationIndex] = { ...staticLocation, ...updates };
      console.log(`Updated location ${id} in static data:`, LOCATIONS_DATA[locationIndex]);
      return LOCATIONS_DATA[locationIndex];
    }
    
    return undefined;
  }

  // Group methods - store in database
  async createGroup(name: string, leaderId: number, locationId: number): Promise<Group> {
    const [group] = await db
      .insert(groups)
      .values({ name, leaderId, locationId })
      .returning();

    // Add leader as first member
    await db
      .insert(groupMembers)
      .values({ groupId: group.id, characterId: leaderId });

    return group;
  }

  async getGroup(id: number): Promise<Group | undefined> {
    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, id), eq(groups.isActive, true)));
    return group || undefined;
  }

  async getGroupsInLocation(locationId: number): Promise<Group[]> {
    console.log(`Getting groups for location ${locationId}`);
    try {
      const result = await db
        .select()
        .from(groups)
        .where(and(eq(groups.locationId, locationId), eq(groups.isActive, true)));
      
      console.log(`Found ${result.length} groups in location ${locationId}:`, result);
      return result;
    } catch (error) {
      console.error(`Error getting groups for location ${locationId}:`, error);
      return [];
    }
  }

  async getCharacterGroup(characterId: number): Promise<Group | undefined> {
    console.log(`Getting group for character ${characterId}`);
    try {
      const [result] = await db
        .select({ group: groups })
        .from(groupMembers)
        .innerJoin(groups, and(
          eq(groupMembers.groupId, groups.id),
          eq(groups.isActive, true)
        ))
        .where(eq(groupMembers.characterId, characterId));
      console.log(`Found group for character ${characterId}:`, result?.group);
      return result?.group || undefined;
    } catch (error) {
      console.error(`Error getting group for character ${characterId}:`, error);
      return undefined;
    }
  }

  async joinGroup(groupId: number, characterId: number): Promise<GroupMember | undefined> {
    // Check if character is already in a group
    const existingGroup = await this.getCharacterGroup(characterId);
    if (existingGroup) return undefined;

    // Check group capacity
    const group = await this.getGroup(groupId);
    if (!group) return undefined;

    const currentMembers = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
    
    if (currentMembers.length >= group.maxMembers) return undefined;

    const [member] = await db
      .insert(groupMembers)
      .values({ groupId, characterId })
      .returning();
    return member;
  }

  async leaveGroup(characterId: number): Promise<void> {
    const currentGroup = await this.getCharacterGroup(characterId);
    if (!currentGroup) return;

    await db
      .delete(groupMembers)
      .where(eq(groupMembers.characterId, characterId));

    // If leader leaves, disband group
    if (currentGroup.leaderId === characterId) {
      await this.disbandGroup(currentGroup.id);
    }
  }

  async disbandGroup(groupId: number): Promise<void> {
    await db
      .update(groups)
      .set({ isActive: false })
      .where(eq(groups.id, groupId));

    await db
      .delete(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
  }

  async getGroupMembers(groupId: number): Promise<Character[]> {
    const result = await db
      .select({ character: characters })
      .from(groupMembers)
      .leftJoin(characters, eq(groupMembers.characterId, characters.id))
      .where(eq(groupMembers.groupId, groupId));

    return result.map(r => r.character).filter(char => char !== null) as Character[];
  }

  private calculateMaxHp(endurance: number): number {
    return Math.floor(endurance * 4.5) + 50;
  }
  
  async processHealthRegeneration(characterId: number): Promise<Character | undefined> {
    // Health regeneration temporarily disabled - using only healing poultices
    const [character] = await db.select().from(characters).where(eq(characters.id, characterId));
    return character;
  }
  
  async useHealingPoultice(characterId: number): Promise<Character | undefined> {
    const [character] = await db.select().from(characters).where(eq(characters.id, characterId));
    if (!character) {
      console.log(`Character ${characterId} not found`);
      return undefined;
    }
    
    // Get location from static data since locations aren't in DB
    const location = LOCATIONS_DATA.find(loc => loc.id === character.currentLocationId);
    if (!location || location.type !== "camp") {
      console.log(`Character ${characterId} not in camp. Location: ${location?.name}, type: ${location?.type}`);
      return undefined;
    }
    
    console.log(`Character ${characterId} is in ${location.name}, clan: ${character.clan}`);
    
    // Check if it's the right clan camp
    const isRightCamp = 
      (character.clan === "thunder" && location.name === "Лагерь Грозового Племени") ||
      (character.clan === "river" && location.name === "Лагерь Речного Племени");
    
    if (!isRightCamp) {
      console.log(`Wrong camp for character ${characterId}. In: ${location.name}, clan: ${character.clan}`);
      return undefined;
    }
    
    // Heal 100 HP, up to max HP
    const healAmount = Math.min(100, character.maxHp - character.currentHp);
    if (healAmount <= 0) {
      console.log(`Character ${characterId} already at full health`);
      return character;
    }
    
    console.log(`Healing character ${characterId} for ${healAmount} HP`);
    
    const [updatedCharacter] = await db
      .update(characters)
      .set({ currentHp: character.currentHp + healAmount })
      .where(eq(characters.id, characterId))
      .returning();
    
    return updatedCharacter;
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();

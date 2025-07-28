import {
  users,
  characters,
  locations,
  npcs,
  combats,
  gameEvents,
  groups,
  groupMembers,
  groupApplications,
  chatMessages,
  diplomacy,
  diplomacyProposals,
  clanInfluence,
  territoryOwnership,
  territoryBattles,
  type User,
  type Character,
  type Location,
  type Combat,
  type NPC,
  type GameEvent,
  type Group,
  type GroupMember,
  type GroupApplication,
  type ChatMessage,
  type Diplomacy,
  type DiplomacyProposal,
  type ClanInfluence,
  type TerritoryOwnership,
  type TerritoryBattle,
  type InsertUser,
  type InsertCharacter,
  type InsertLocation,
  type InsertNPC,
  type InsertClanInfluence,
  type InsertTerritoryOwnership,
  type InsertTerritoryBattle,
  type CombatLogEntry,
  LOCATIONS_DATA,
  NPCS_DATA
} from "@shared/schema";
import { db } from "./db";
import { eq, and, lt, or, lte, desc, inArray, sql } from "drizzle-orm";

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
  getAllActiveCombats(): Promise<Combat[]>;
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
  createGroup(name: string, leaderId: number): Promise<Group>;
  getGroup(id: number): Promise<Group | undefined>;
  getAllGroups(): Promise<Group[]>;
  getCharacterGroup(characterId: number): Promise<Group | undefined>;
  joinGroup(groupId: number, characterId: number): Promise<GroupMember | undefined>;
  leaveGroup(characterId: number): Promise<void>;
  disbandGroup(groupId: number): Promise<void>;
  getGroupMembers(groupId: number): Promise<Character[]>;
  
  // Group application methods
  createGroupApplication(groupId: number, characterId: number, message?: string): Promise<GroupApplication>;
  getGroupApplications(groupId: number): Promise<GroupApplication[]>;
  respondToGroupApplication(applicationId: number, response: "accepted" | "rejected"): Promise<GroupApplication | undefined>;

  // Admin methods
  getAllUsers(): Promise<User[]>;
  updateLocation(id: number, updates: Partial<Location>): Promise<Location | undefined>;
  
  // Group application methods
  hasExistingApplication(groupId: number, characterId: number): Promise<boolean>;
  getGroupApplicationsWithCharacterNames(groupId: number): Promise<(GroupApplication & { characterName: string })[]>;
  
  // Health regeneration
  processHealthRegeneration(characterId: number): Promise<Character | undefined>;
  useHealingPoultice(characterId: number): Promise<Character | undefined>;

  // Chat methods
  getChatMessages(locationId: number, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(locationId: number, characterId: number, message: string): Promise<ChatMessage>;
  cleanupOldChatMessages(locationId: number): Promise<void>;

  // Diplomacy methods
  getDiplomacyStatus(fromClan: string, toClan: string): Promise<string>;
  getAllDiplomacyRelations(): Promise<Record<string, Record<string, string>>>;
  changeDiplomacyStatus(fromClan: string, toClan: string, status: string, changedBy: number): Promise<void>;
  
  // Diplomacy proposals
  createDiplomacyProposal(fromClan: string, toClan: string, proposedStatus: string, proposedBy: number, message?: string): Promise<DiplomacyProposal>;
  getDiplomacyProposals(clan: string): Promise<DiplomacyProposal[]>;
  respondToProposal(proposalId: number, response: string, respondedBy: number): Promise<void>;
  
  // Territory warfare methods
  getClanInfluence(clan: string): Promise<ClanInfluence | undefined>;
  updateClanInfluence(clan: string, points: number): Promise<ClanInfluence>;
  processDailyInfluenceGain(clan: string): Promise<ClanInfluence>;
  getTerritoryOwnership(locationId: number): Promise<TerritoryOwnership | undefined>;
  captureTerritoryAutomatically(locationId: number, clan: string, capturedBy: number): Promise<TerritoryOwnership>;
  declareTerritoryBattle(locationId: number, attackingClan: string, declaredBy: number): Promise<TerritoryBattle>;
  getTerritoryBattle(battleId: number): Promise<TerritoryBattle | undefined>;
  getActiveTerritoryBattles(locationId?: number): Promise<TerritoryBattle[]>;
  joinTerritoryBattle(battleId: number, characterId: number): Promise<TerritoryBattle>;
  completeTerritoryBattle(battleId: number, winner: string): Promise<TerritoryBattle>;
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
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
    
    // Auto-logout inactive characters
    for (const character of this.characters.values()) {
      if (character.isOnline && character.lastActivity && new Date(character.lastActivity) < fiveMinutesAgo) {
        await this.setCharacterOnline(character.id, false);
      }
    }
    
    return Array.from(this.characters.values()).filter(char => 
      char.currentLocationId === locationId && char.isOnline
    );
  }

  async getOnlineCharacters(): Promise<Character[]> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
    
    // Auto-logout characters that haven't been active for 5 minutes
    for (const character of this.characters.values()) {
      if (character.isOnline && character.lastActivity && new Date(character.lastActivity) < fiveMinutesAgo) {
        await this.setCharacterOnline(character.id, false);
      }
    }
    
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
  async createGroup(name: string, leaderId: number): Promise<Group> {
    const id = this.currentGroupId++;
    const group: Group = {
      id,
      name,
      leaderId,
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

  async getAllGroups(): Promise<Group[]> {
    // Clean up empty groups first
    await this.cleanupEmptyGroups();
    
    return Array.from(this.groups.values()).filter(group => group.isActive);
  }

  private async cleanupEmptyGroups(): Promise<void> {
    for (const group of this.groups.values()) {
      if (group.isActive) {
        const members = Array.from(this.groupMembers.values()).filter(
          member => member.groupId === group.id
        );
        
        // If group has no members, disband it
        if (members.length === 0) {
          await this.disbandGroup(group.id);
        }
      }
    }
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

    // Check if group is now empty or if leader left
    const group = this.groups.get(membership.groupId);
    if (group) {
      const remainingMembers = Array.from(this.groupMembers.values()).filter(
        member => member.groupId === membership.groupId
      );
      
      // If no members left or leader left, disband group
      if (remainingMembers.length === 0 || group.leaderId === characterId) {
        await this.disbandGroup(membership.groupId);
      }
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

  // Group Application methods (for in-memory storage)
  async createGroupApplication(groupId: number, characterId: number, message?: string): Promise<GroupApplication> {
    const id = Date.now(); // Simple ID for in-memory
    const application: GroupApplication = {
      id,
      groupId,
      characterId,
      message,
      status: "pending",
      createdAt: new Date(),
      respondedAt: null,
    };
    // Store in memory (for MemStorage)
    return application;
  }

  async getGroupApplications(groupId: number): Promise<GroupApplication[]> {
    // In-memory implementation would store applications
    return [];
  }

  async respondToGroupApplication(applicationId: number, response: "accepted" | "rejected"): Promise<GroupApplication | undefined> {
    // In-memory implementation
    return undefined;
  }

  async hasExistingApplication(groupId: number, characterId: number): Promise<boolean> {
    // In-memory implementation would check applications
    return false;
  }

  async getGroupApplicationsWithCharacterNames(groupId: number): Promise<(GroupApplication & { characterName: string })[]> {
    // In-memory implementation would return applications with names
    return [];
  }

  // Territory warfare methods (MemStorage stubs)
  async getClanInfluence(clan: string): Promise<ClanInfluence | undefined> {
    return undefined;
  }

  async updateClanInfluence(clan: string, points: number): Promise<ClanInfluence> {
    return {
      id: 1,
      clan,
      influencePoints: points,
      lastPointsGained: new Date(),
      createdAt: new Date()
    };
  }

  async processDailyInfluenceGain(clan: string): Promise<ClanInfluence> {
    return this.updateClanInfluence(clan, 1);
  }

  async getTerritoryOwnership(locationId: number): Promise<TerritoryOwnership | undefined> {
    return undefined;
  }

  async captureTerritoryAutomatically(locationId: number, clan: string, capturedBy: number): Promise<TerritoryOwnership> {
    return {
      id: 1,
      locationId,
      ownerClan: clan,
      capturedBy,
      capturedAt: new Date()
    };
  }

  async declareTerritoryBattle(locationId: number, attackingClan: string, declaredBy: number): Promise<TerritoryBattle> {
    return {
      id: 1,
      locationId,
      attackingClan,
      defendingClan: null,
      declaredBy,
      battleStartTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      status: "preparing",
      winner: null,
      participants: [],
      createdAt: new Date()
    };
  }

  async getTerritoryBattle(battleId: number): Promise<TerritoryBattle | undefined> {
    return undefined;
  }

  async getActiveTerritoryBattles(locationId?: number): Promise<TerritoryBattle[]> {
    return [];
  }

  async joinTerritoryBattle(battleId: number, characterId: number): Promise<TerritoryBattle> {
    return this.declareTerritoryBattle(1, "thunder", 1);
  }

  async completeTerritoryBattle(battleId: number, winner: string): Promise<TerritoryBattle> {
    return this.declareTerritoryBattle(1, "thunder", 1);
  }

  private calculateMaxHp(endurance: number): number {
    return 80 + (endurance * 5);
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  // In-memory storage for real-time combat
  private memCombats: Combat[] = [];
  private nextCombatId = 1;
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
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
    
    // Auto-logout inactive characters
    await db
      .update(characters)
      .set({ isOnline: false })
      .where(and(
        eq(characters.isOnline, true),
        lt(characters.lastActivity, fiveMinutesAgo)
      ));
    
    return await db.select().from(characters).where(
      and(
        eq(characters.currentLocationId, locationId),
        eq(characters.isOnline, true)
      )
    );
  }

  async getOnlineCharacters(): Promise<Character[]> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
    
    // Auto-logout characters that haven't been active for 5 minutes
    await db
      .update(characters)
      .set({ isOnline: false })
      .where(and(
        eq(characters.isOnline, true),
        lt(characters.lastActivity, fiveMinutesAgo)
      ));
    
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
      .set({ isOnline: online, lastActivity: new Date() })
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

  // NPC methods - NPCs are now unique per location to prevent cross-location death sharing
  private npcsMap = new Map<number, NPC>();
  private currentNpcId = 1;

  constructor() {
    this.initializeNPCs();
  }

  private initializeNPCs() {
    // Create separate NPC instances for each location they spawn in
    NPCS_DATA.forEach(npcData => {
      npcData.spawnsInLocation.forEach(locationId => {
        const npc: NPC = {
          ...npcData,
          id: this.currentNpcId++,
          currentHp: npcData.maxHp,
          isDead: false,
          lastDeathTime: null,
          spawnsInLocation: [locationId], // Each NPC instance only belongs to one location
        };
        this.npcsMap.set(npc.id, npc);
      });
    });
  }

  async getNPC(id: number): Promise<NPC | undefined> {
    return this.npcsMap.get(id);
  }

  async getNPCsByLocation(locationId: number): Promise<NPC[]> {
    // Since each NPC is now unique per location, we filter by exact location match
    const locationNPCs = Array.from(this.npcsMap.values()).filter(npc => 
      npc.spawnsInLocation.includes(locationId)
    );

    // Add respawn time remaining for dead NPCs and check for auto-respawn
    return locationNPCs.map(npc => {
      if (npc.isDead && npc.lastDeathTime && npc.respawnTime > 0) {
        const timeElapsed = Math.floor((Date.now() - npc.lastDeathTime.getTime()) / 1000);
        const timeRemaining = Math.max(0, npc.respawnTime - timeElapsed);
        
        // Auto-respawn if time has elapsed
        if (timeRemaining === 0) {
          npc.isDead = false;
          npc.currentHp = npc.maxHp;
          npc.lastDeathTime = null;
          this.npcsMap.set(npc.id, npc);
          return npc;
        }
        
        return { ...npc, respawnTimeRemaining: timeRemaining };
      }
      return npc;
    });
  }

  async getAllNPCs(): Promise<NPC[]> {
    return Array.from(this.npcsMap.values());
  }

  async createNPC(insertNpc: InsertNPC): Promise<NPC> {
    // Create separate instances for each location the NPC spawns in
    const createdNPCs: NPC[] = [];
    
    insertNpc.spawnsInLocation.forEach(locationId => {
      const id = this.currentNpcId++;
      const npc: NPC = {
        ...insertNpc,
        id,
        currentHp: insertNpc.maxHp,
        isDead: false,
        lastDeathTime: null,
        spawnsInLocation: [locationId], // Each instance only belongs to one location
      };
      this.npcsMap.set(id, npc);
      createdNPCs.push(npc);
    });
    
    // Return the first created NPC (for compatibility with existing API)
    return createdNPCs[0];
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

  async getAllActiveCombats(): Promise<Combat[]> {
    return Array.from(this.combatsMap.values()).filter(
      combat => combat.status === "active"
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
  async createGroup(name: string, leaderId: number): Promise<Group> {
    const [group] = await db
      .insert(groups)
      .values({ name, leaderId })
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

  async getAllGroups(): Promise<Group[]> {
    console.log("Getting all groups");
    try {
      // Clean up empty groups first
      await this.cleanupEmptyGroups();
      
      const result = await db
        .select()
        .from(groups)
        .where(eq(groups.isActive, true));
      
      console.log(`Found ${result.length} total groups:`, result);
      return result;
    } catch (error) {
      console.error("Error getting all groups:", error);
      return [];
    }
  }

  private async cleanupEmptyGroups(): Promise<void> {
    try {
      // Get all active groups
      const activeGroups = await db
        .select()
        .from(groups)
        .where(eq(groups.isActive, true));

      for (const group of activeGroups) {
        // Check if group has any members
        const members = await db
          .select()
          .from(groupMembers)
          .where(eq(groupMembers.groupId, group.id));

        // If no members, disband the group
        if (members.length === 0) {
          console.log(`Disbanding empty group: ${group.name} (ID: ${group.id})`);
          await this.disbandGroup(group.id);
        }
      }
    } catch (error) {
      console.error('Error cleaning up empty groups:', error);
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

    // Check remaining members
    const remainingMembers = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, currentGroup.id));

    // If no members left or leader left, disband group
    if (remainingMembers.length === 0 || currentGroup.leaderId === characterId) {
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

  // Group application methods
  async createGroupApplication(groupId: number, characterId: number, message?: string): Promise<GroupApplication> {
    const [application] = await db
      .insert(groupApplications)
      .values({ 
        groupId, 
        characterId, 
        message: message || null,
        status: "pending"
      })
      .returning();
    return application;
  }

  async getGroupApplications(groupId: number): Promise<GroupApplication[]> {
    if (groupId === 0) return [];
    
    const applications = await db
      .select()
      .from(groupApplications)
      .where(and(
        eq(groupApplications.groupId, groupId),
        eq(groupApplications.status, "pending")
      ));
    return applications;
  }

  async hasExistingApplication(groupId: number, characterId: number): Promise<boolean> {
    const [application] = await db
      .select()
      .from(groupApplications)
      .where(and(
        eq(groupApplications.groupId, groupId),
        eq(groupApplications.characterId, characterId),
        eq(groupApplications.status, "pending")
      ))
      .limit(1);
    return !!application;
  }

  async getGroupApplicationsWithCharacterNames(groupId: number): Promise<(GroupApplication & { characterName: string })[]> {
    if (groupId === 0) return [];
    
    const applications = await db
      .select({
        id: groupApplications.id,
        groupId: groupApplications.groupId,
        characterId: groupApplications.characterId,
        message: groupApplications.message,
        status: groupApplications.status,
        createdAt: groupApplications.createdAt,
        respondedAt: groupApplications.respondedAt,
        characterName: characters.name
      })
      .from(groupApplications)
      .leftJoin(characters, eq(groupApplications.characterId, characters.id))
      .where(and(
        eq(groupApplications.groupId, groupId),
        eq(groupApplications.status, "pending")
      ));
    
    return applications.map(app => ({
      id: app.id,
      groupId: app.groupId,
      characterId: app.characterId,
      message: app.message,
      status: app.status,
      createdAt: app.createdAt,
      respondedAt: app.respondedAt,
      characterName: app.characterName || 'Unknown'
    }));
  }

  async respondToGroupApplication(applicationId: number, response: "accepted" | "rejected"): Promise<GroupApplication | undefined> {
    const [application] = await db
      .select()
      .from(groupApplications)
      .where(eq(groupApplications.id, applicationId));
    
    if (!application) return undefined;

    // If accepted, add character to group
    if (response === "accepted") {
      // Check if character is not already in the group to prevent duplicates
      const existingMember = await db
        .select()
        .from(groupMembers)
        .where(and(
          eq(groupMembers.groupId, application.groupId),
          eq(groupMembers.characterId, application.characterId)
        ))
        .limit(1);
      
      if (!existingMember.length) {
        await db
          .insert(groupMembers)
          .values({ 
            groupId: application.groupId, 
            characterId: application.characterId 
          });
      }
    }

    // Update application status
    const [updatedApplication] = await db
      .update(groupApplications)
      .set({ 
        status: response,
        respondedAt: new Date()
      })
      .where(eq(groupApplications.id, applicationId))
      .returning();

    return updatedApplication;
  }

  async hasExistingApplication(groupId: number, characterId: number): Promise<boolean> {
    const [application] = await db
      .select()
      .from(groupApplications)
      .where(and(
        eq(groupApplications.groupId, groupId),
        eq(groupApplications.characterId, characterId),
        eq(groupApplications.status, "pending")
      ))
      .limit(1);
    return !!application;
  }

  async getGroupApplicationsWithCharacterNames(groupId: number): Promise<(GroupApplication & { characterName: string })[]> {
    if (groupId === 0) return [];
    
    const applications = await db
      .select({
        id: groupApplications.id,
        groupId: groupApplications.groupId,
        characterId: groupApplications.characterId,
        message: groupApplications.message,
        status: groupApplications.status,
        createdAt: groupApplications.createdAt,
        respondedAt: groupApplications.respondedAt,
        characterName: characters.name
      })
      .from(groupApplications)
      .leftJoin(characters, eq(groupApplications.characterId, characters.id))
      .where(and(
        eq(groupApplications.groupId, groupId),
        eq(groupApplications.status, "pending")
      ));
    
    return applications.map(app => ({
      id: app.id,
      groupId: app.groupId,
      characterId: app.characterId,
      message: app.message,
      status: app.status,
      createdAt: app.createdAt,
      respondedAt: app.respondedAt,
      characterName: app.characterName || 'Unknown'
    }));
  }

  private calculateMaxHp(endurance: number): number {
    return 80 + (endurance * 5);
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

  // Chat methods
  async getChatMessages(locationId: number, limit: number = 50): Promise<ChatMessage[]> {
    // Auto-cleanup old messages
    await this.cleanupOldChatMessages(locationId);
    
    const result = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.locationId, locationId))
      .orderBy(chatMessages.createdAt)
      .limit(limit);
    
    return result;
  }

  async createChatMessage(locationId: number, characterId: number, message: string): Promise<ChatMessage> {
    const [chatMessage] = await db
      .insert(chatMessages)
      .values({ locationId, characterId, message })
      .returning();
    
    return chatMessage;
  }

  async cleanupOldChatMessages(locationId: number): Promise<void> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    await db
      .delete(chatMessages)
      .where(
        and(
          eq(chatMessages.locationId, locationId),
          lt(chatMessages.createdAt, oneDayAgo)
        )
      );
  }

  // Diplomacy methods
  async getDiplomacyStatus(fromClan: string, toClan: string): Promise<string> {
    const [relation] = await db
      .select()
      .from(diplomacy)
      .where(and(
        eq(diplomacy.fromClan, fromClan),
        eq(diplomacy.toClan, toClan)
      ));
    return relation?.status || "peace";
  }

  async getAllDiplomacyRelations(): Promise<Record<string, Record<string, string>>> {
    const relations = await db.select().from(diplomacy);
    
    const result: Record<string, Record<string, string>> = {
      thunder: {},
      river: {}
    };

    for (const relation of relations) {
      result[relation.fromClan] = result[relation.fromClan] || {};
      result[relation.fromClan][relation.toClan] = relation.status;
    }

    // Default to peace if no relation exists
    if (!result.thunder.river) result.thunder.river = "peace";
    if (!result.river.thunder) result.river.thunder = "peace";

    return result;
  }

  async changeDiplomacyStatus(fromClan: string, toClan: string, status: string, changedBy: number): Promise<void> {
    // Update or insert diplomacy relation
    const existing = await db
      .select()
      .from(diplomacy)
      .where(and(
        eq(diplomacy.fromClan, fromClan),
        eq(diplomacy.toClan, toClan)
      ));

    if (existing.length > 0) {
      await db
        .update(diplomacy)
        .set({ status, changedBy, updatedAt: new Date() })
        .where(and(
          eq(diplomacy.fromClan, fromClan),
          eq(diplomacy.toClan, toClan)
        ));
    } else {
      await db
        .insert(diplomacy)
        .values({ fromClan, toClan, status, changedBy });
    }

    // Also update the reverse relation for consistency
    const existingReverse = await db
      .select()
      .from(diplomacy)
      .where(and(
        eq(diplomacy.fromClan, toClan),
        eq(diplomacy.toClan, fromClan)
      ));

    if (existingReverse.length > 0) {
      await db
        .update(diplomacy)
        .set({ status, changedBy, updatedAt: new Date() })
        .where(and(
          eq(diplomacy.fromClan, toClan),
          eq(diplomacy.toClan, fromClan)
        ));
    } else {
      await db
        .insert(diplomacy)
        .values({ fromClan: toClan, toClan: fromClan, status, changedBy });
    }
  }

  // Diplomacy proposals
  async createDiplomacyProposal(fromClan: string, toClan: string, proposedStatus: string, proposedBy: number, message?: string): Promise<DiplomacyProposal> {
    const [proposal] = await db
      .insert(diplomacyProposals)
      .values({ fromClan, toClan, proposedStatus, proposedBy, message })
      .returning();
    return proposal;
  }

  async getDiplomacyProposals(clan: string): Promise<DiplomacyProposal[]> {
    // Get proposals for this clan (as receiver)
    const proposals = await db
      .select()
      .from(diplomacyProposals)
      .where(and(
        eq(diplomacyProposals.toClan, clan),
        eq(diplomacyProposals.status, "pending")
      ))
      .orderBy(diplomacyProposals.createdAt);
    
    console.log(`Found ${proposals.length} proposals for clan ${clan}:`, proposals);
    return proposals;
  }

  async respondToProposal(proposalId: number, response: string, respondedBy: number): Promise<void> {
    const [proposal] = await db
      .select()
      .from(diplomacyProposals)
      .where(eq(diplomacyProposals.id, proposalId));

    if (!proposal) {
      throw new Error("Proposal not found");
    }

    // Update proposal status
    await db
      .update(diplomacyProposals)
      .set({ 
        status: response, 
        respondedBy, 
        respondedAt: new Date() 
      })
      .where(eq(diplomacyProposals.id, proposalId));

    // If accepted, change diplomacy status
    if (response === "accepted") {
      await this.changeDiplomacyStatus(proposal.fromClan, proposal.toClan, proposal.proposedStatus, respondedBy);
    }
  }

  // Territory warfare methods
  async getClanInfluence(clan: string): Promise<ClanInfluence | undefined> {
    const [influence] = await db
      .select()
      .from(clanInfluence)
      .where(eq(clanInfluence.clan, clan));
    return influence || undefined;
  }

  async updateClanInfluence(clan: string, points: number): Promise<ClanInfluence> {
    const existing = await this.getClanInfluence(clan);
    
    if (existing) {
      const [updated] = await db
        .update(clanInfluence)
        .set({ influencePoints: points })
        .where(eq(clanInfluence.clan, clan))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(clanInfluence)
        .values({ clan, influencePoints: points })
        .returning();
      return created;
    }
  }

  async processDailyInfluenceGain(clan: string): Promise<ClanInfluence> {
    const existing = await this.getClanInfluence(clan);
    const now = new Date();
    
    if (existing) {
      const timeDiff = now.getTime() - existing.lastPointsGained.getTime();
      const hoursElapsed = timeDiff / (1000 * 60 * 60);
      
      if (hoursElapsed >= 24) {
        const [updated] = await db
          .update(clanInfluence)
          .set({ 
            influencePoints: existing.influencePoints + 1,
            lastPointsGained: now 
          })
          .where(eq(clanInfluence.clan, clan))
          .returning();
        return updated;
      }
      return existing;
    } else {
      const [created] = await db
        .insert(clanInfluence)
        .values({ clan, influencePoints: 1, lastPointsGained: now })
        .returning();
      return created;
    }
  }

  async getTerritoryOwnership(locationId: number): Promise<TerritoryOwnership | undefined> {
    const [ownership] = await db
      .select()
      .from(territoryOwnership)
      .where(eq(territoryOwnership.locationId, locationId));
    return ownership || undefined;
  }

  async captureTerritoryAutomatically(locationId: number, clan: string, capturedBy: number): Promise<TerritoryOwnership> {
    const existing = await this.getTerritoryOwnership(locationId);
    
    if (existing) {
      const [updated] = await db
        .update(territoryOwnership)
        .set({ 
          ownerClan: clan,
          capturedBy,
          capturedAt: new Date()
        })
        .where(eq(territoryOwnership.locationId, locationId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(territoryOwnership)
        .values({ locationId, ownerClan: clan, capturedBy })
        .returning();
      return created;
    }
  }

  async declareTerritoryBattle(locationId: number, attackingClan: string, declaredBy: number): Promise<TerritoryBattle> {
    const ownership = await this.getTerritoryOwnership(locationId);
    const defendingClan = ownership?.ownerClan || null;
    const battleStartTime = new Date(Date.now() + 1 * 60 * 1000); // 1 minute
    
    const [battle] = await db
      .insert(territoryBattles)
      .values({
        locationId,
        attackingClan,
        defendingClan,
        declaredBy,
        battleStartTime,
        status: "preparing",
        participants: JSON.stringify([declaredBy]) // Stringify the array
      })
      .returning();
    
    return battle;
  }

  async getTerritoryBattle(battleId: number): Promise<TerritoryBattle | undefined> {
    const [battle] = await db
      .select()
      .from(territoryBattles)
      .where(eq(territoryBattles.id, battleId));
    return battle || undefined;
  }

  async getActiveTerritoryBattles(locationId?: number): Promise<TerritoryBattle[]> {
    if (locationId !== undefined) {
      return db
        .select()
        .from(territoryBattles)
        .where(and(
          eq(territoryBattles.locationId, locationId),
          eq(territoryBattles.status, "preparing")
        ));
    } else {
      return db
        .select()
        .from(territoryBattles)
        .where(eq(territoryBattles.status, "preparing"));
    }
  }

  async joinTerritoryBattle(battleId: number, characterId: number): Promise<TerritoryBattle> {
    const battle = await this.getTerritoryBattle(battleId);
    if (!battle) {
      throw new Error("Battle not found");
    }
    
    // Parse participants and check if already in battle
    const participants = JSON.parse(battle.participants);
    if (participants.includes(characterId)) {
      return battle; // Already joined
    }
    
    // Update participants JSON string
    const updatedParticipants = [...participants, characterId];
    const [updated] = await db
      .update(territoryBattles)
      .set({ 
        participants: JSON.stringify(updatedParticipants)
      })
      .where(eq(territoryBattles.id, battleId))
      .returning();
      
    return updated;
  }

  async completeTerritoryBattle(battleId: number, winner: string): Promise<TerritoryBattle> {
    const [updated] = await db
      .update(territoryBattles)
      .set({ 
        status: "completed",
        winner
      })
      .where(eq(territoryBattles.id, battleId))
      .returning();
      
    return updated;
  }

  async startActiveBattles(): Promise<TerritoryBattle[]> {
    const now = new Date();
    const battlesDue = await db
      .select()
      .from(territoryBattles)
      .where(and(
        eq(territoryBattles.status, "preparing"),
        lte(territoryBattles.battleStartTime, now)
      ));

    const updatedBattles = [];
    for (const battle of battlesDue) {
      const [updated] = await db
        .update(territoryBattles)
        .set({ status: "active" })
        .where(eq(territoryBattles.id, battle.id))
        .returning();
      updatedBattles.push(updated);
      
      // Create real-time combat for this territory battle
      const participantIds = JSON.parse(battle.participants);
      if (participantIds.length >= 2) {
        const combat = await this.createTerritoryCombat(battle.id, participantIds, battle.locationId);
        
        // Start auto-combat
        console.log(`Starting territory combat ${combat.id} for battle ${battle.id}`);
        const { GameEngine } = await import("./services/gameEngine");
        GameEngine.startAutoCombat(combat.id);
      } else if (participantIds.length === 1) {
        // Auto-win for single participant
        console.log(`Auto-completing territory battle ${battle.id} - only one participant`);
        const character = await this.getCharacter(participantIds[0]);
        if (character) {
          await this.completeTerritoryBattle(battle.id, character.clan);
          
          // Award experience to single participant
          await this.updateCharacter(character.id, { 
            experience: character.experience + 200 
          });
          
          // Capture territory if neutral
          if (!battle.defendingClan) {
            await this.setTerritoryOwnership(battle.locationId, character.clan, character.id);
          }
        }
      }
    }

    return updatedBattles;
  }

  async processTerritoryBattleResults(): Promise<TerritoryBattle[]> {
    const activeBattles = await db
      .select()
      .from(territoryBattles)
      .where(eq(territoryBattles.status, "active"));

    const completedBattles = [];
    
    for (const battle of activeBattles) {
      const participantIds = JSON.parse(battle.participants);
      
      // Check for single participant battles and auto-complete them
      if (participantIds.length === 1) {
        console.log(`Auto-completing territory battle ${battle.id} - only one participant`);
        const character = await this.getCharacter(participantIds[0]);
        if (character) {
          await this.completeTerritoryBattle(battle.id, character.clan);
          
          // Award experience to single participant
          await this.updateCharacter(character.id, { 
            experience: character.experience + 200 
          });
          
          // Capture territory if neutral
          if (!battle.defendingClan) {
            await this.setTerritoryOwnership(battle.locationId, character.clan, character.id);
          }
          
          // Broadcast battle completion to all clients
          const { broadcastToAll } = await import("./routes");
          broadcastToAll({
            type: 'territory_battle_completed',
            battleId: battle.id,
            winner: character.clan,
            locationId: battle.locationId,
            participantName: character.name
          });
          
          completedBattles.push(battle);
        }
        continue;
      }
      
      // Check if this is a real-time combat battle
      const territoryBattleCombat = await this.getTerritoryCombat(battle.id);
      
      if (territoryBattleCombat && territoryBattleCombat.status === "completed") {
        // Real-time combat has finished, determine winner from combat results
        const participantIds = JSON.parse(battle.participants);
        const thunderSurvivors = [];
        const riverSurvivors = [];
        
        for (const participantId of participantIds) {
          const character = await this.getCharacter(participantId);
          if (character && character.currentHp > 1) { // Only survivors count
            if (character.clan === "thunder") {
              thunderSurvivors.push(character);
            } else if (character.clan === "river") {
              riverSurvivors.push(character);
            }
          }
        }
        
        // Determine winner
        let winner: string;
        if (thunderSurvivors.length > 0 && riverSurvivors.length === 0) {
          winner = "thunder";
          // Transfer territory to thunder clan
          await this.captureTerritoryAutomatically(
            battle.locationId, 
            "thunder",
            thunderSurvivors[0]?.id || battle.declaredBy
          );
        } else if (riverSurvivors.length > 0 && thunderSurvivors.length === 0) {
          winner = "river";
          // Transfer territory to river clan
          await this.captureTerritoryAutomatically(
            battle.locationId, 
            "river",
            riverSurvivors[0]?.id || battle.declaredBy
          );
        } else {
          // Defenders win in case of draw or no clear winner
          winner = battle.defendingClan || "neutral";
        }

        // Complete the battle
        const completedBattle = await this.completeTerritoryBattle(battle.id, winner);
        completedBattles.push(completedBattle);

        // Create game event for battle result
        const location = LOCATIONS_DATA.find(loc => loc.id === battle.locationId);
        const winnerName = winner === "thunder" ? "Грозовое племя ⚡" : winner === "river" ? "Речное племя 🌊" : "защитники";
        await this.createGameEvent({
          type: "territory_battle_completed",
          message: `Битва за ${location?.name} завершена! Победил: ${winnerName}`,
          locationId: battle.locationId,
          characterId: battle.declaredBy,
        });
      } else {
        // Fallback to old simple power calculation if no real-time combat
        const participantIds = JSON.parse(battle.participants);
        const attackingParticipants = [];
        const defendingParticipants = [];
        
        for (const participantId of participantIds) {
          const character = await this.getCharacter(participantId);
          if (character && character.currentHp > 1) { // Only alive characters count
            if (character.clan === battle.attackingClan) {
              attackingParticipants.push(character);
            } else if (character.clan === battle.defendingClan) {
              defendingParticipants.push(character);
            }
          }
        }

        // Calculate battle power for each side
        const attackingPower = this.calculateBattlePower(attackingParticipants);
        const defendingPower = this.calculateBattlePower(defendingParticipants);

        // Add random factor (30% variance)
        const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
        const finalAttackingPower = attackingPower * randomFactor;
        const finalDefendingPower = defendingPower * (2 - randomFactor); // Inverse for balance

        // Determine winner
        let winner: string;
        if (finalAttackingPower > finalDefendingPower) {
          winner = battle.attackingClan;
          
          // Transfer territory to winner
          await this.captureTerritoryAutomatically(
            battle.locationId, 
            battle.attackingClan,
            attackingParticipants[0]?.id || battle.declaredBy
          );
        } else {
          winner = battle.defendingClan || "neutral";
          // Defenders keep their territory
        }

        // Complete the battle
        const completedBattle = await this.completeTerritoryBattle(battle.id, winner);
        completedBattles.push(completedBattle);

        // Award experience to participants
        const experienceReward = 200; // Higher reward for territory battles
        for (const participant of [...attackingParticipants, ...defendingParticipants]) {
          const [updatedChar] = await db
            .update(characters)
            .set({ 
              experience: sql`experience + ${experienceReward}` 
            })
            .where(eq(characters.id, participant.id))
            .returning();
        }

        // Create game event for battle result
        const location = LOCATIONS_DATA.find(loc => loc.id === battle.locationId);
        await this.createGameEvent({
          type: "territory_battle_completed",
          message: `Битва за ${location?.name} завершена! Победил: ${winner === battle.attackingClan ? 'атакующий' : 'защищающийся'} клан ${winner === 'thunder' ? 'Грозовое племя ⚡' : winner === 'river' ? 'Речное племя 🌊' : 'неизвестно'}`,
          locationId: battle.locationId,
          characterId: battle.declaredBy,
        });
      }
    }

    return completedBattles;
  }
  
  async getTerritoryCombat(battleId: number): Promise<Combat | undefined> {
    // Territory combats are stored in memory with reference to battle ID
    return this.memCombats.find(combat => 
      combat.territoryBattleId === battleId
    );
  }
  
  async createTerritoryCombat(battleId: number, participants: number[], locationId: number): Promise<Combat> {
    const combatId = this.nextCombatId++;
    const combat: Combat = {
      id: combatId,
      participants,
      npcParticipants: [],
      status: "active",
      type: "territory", 
      locationId,
      log: [],
      currentTurn: 0,
      territoryBattleId: battleId,
      createdAt: new Date(),
    };
    
    this.memCombats.push(combat);
    console.log(`Created territory combat ${combatId} for battle ${battleId} with participants:`, participants);
    
    return combat;
  }

  private calculateBattlePower(participants: Character[]): number {
    return participants.reduce((total, character) => {
      const level = character.level;
      const stats = character.strength + character.agility + character.intelligence + character.endurance;
      const hpBonus = character.currentHp / character.maxHp; // HP percentage bonus
      return total + (level * 10 + stats * 2) * hpBonus;
    }, 0);
  }

  async getAllActiveBattles(): Promise<TerritoryBattle[]> {
    return db
      .select()
      .from(territoryBattles)
      .where(or(
        eq(territoryBattles.status, "preparing"),
        eq(territoryBattles.status, "active")
      ));
  }

  async getRecentCompletedBattles(limit: number = 10): Promise<TerritoryBattle[]> {
    return db
      .select()
      .from(territoryBattles)
      .where(eq(territoryBattles.status, "completed"))
      .orderBy(desc(territoryBattles.createdAt))
      .limit(limit);
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();

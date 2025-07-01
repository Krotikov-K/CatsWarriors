import {
  users,
  characters,
  locations,
  combats,
  gameEvents,
  type User,
  type Character,
  type Location,
  type Combat,
  type GameEvent,
  type InsertUser,
  type InsertCharacter,
  type InsertLocation,
  type CombatLogEntry,
  LOCATIONS_DATA
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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

  // Combat methods
  getCombat(id: number): Promise<Combat | undefined>;
  getActiveCombatsInLocation(locationId: number): Promise<Combat[]>;
  getCharacterActiveCombat(characterId: number): Promise<Combat | undefined>;
  createCombat(locationId: number, participants: number[]): Promise<Combat>;
  addCombatLogEntry(combatId: number, entry: CombatLogEntry): Promise<void>;
  addParticipantToCombat(combatId: number, characterId: number): Promise<Combat | undefined>;
  finishCombat(combatId: number): Promise<Combat | undefined>;

  // Game Events
  createGameEvent(event: Omit<GameEvent, 'id' | 'createdAt'>): Promise<GameEvent>;
  getRecentEvents(limit: number): Promise<GameEvent[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private characters: Map<number, Character> = new Map();
  private locations: Map<number, Location> = new Map();
  private combats: Map<number, Combat> = new Map();
  private gameEvents: Map<number, GameEvent> = new Map();
  
  private currentUserId = 1;
  private currentCharacterId = 1;
  private currentLocationId = 1;
  private currentCombatId = 1;
  private currentEventId = 1;

  constructor() {
    this.initializeLocations();
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
    return Array.from(this.combats.values()).find(
      combat => combat.status === "active" && combat.participants.includes(characterId)
    );
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

  async finishCombat(combatId: number): Promise<Combat | undefined> {
    const combat = this.combats.get(combatId);
    if (!combat) return undefined;

    combat.status = "finished";
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

export const storage = new MemStorage();

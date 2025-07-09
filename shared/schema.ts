import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  telegramId: text("telegram_id").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  clan: text("clan").notNull(),
  gender: text("gender").notNull().default("male"), // "male", "female"
  level: integer("level").notNull().default(1),
  experience: integer("experience").notNull().default(0),
  currentHp: integer("current_hp").notNull(),
  maxHp: integer("max_hp").notNull(),
  strength: integer("strength").notNull(),
  agility: integer("agility").notNull(),
  intelligence: integer("intelligence").notNull(),
  endurance: integer("endurance").notNull(),
  currentLocationId: integer("current_location_id").notNull(),
  isOnline: boolean("is_online").notNull().default(false),
  unspentStatPoints: integer("unspent_stat_points").notNull().default(0),
  lastActivity: timestamp("last_activity").defaultNow(),
  lastHpRegeneration: timestamp("last_hp_regeneration").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // "camp", "neutral", "training", "sacred"
  clan: text("clan"), // null for neutral locations
  maxPlayers: integer("max_players").default(50),
  dangerLevel: integer("danger_level").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const npcs = pgTable("npcs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "enemy", "neutral", "boss", "quest"
  level: integer("level").notNull().default(1),
  currentHp: integer("current_hp").notNull(),
  maxHp: integer("max_hp").notNull(),
  strength: integer("strength").notNull(),
  agility: integer("agility").notNull(),
  intelligence: integer("intelligence").notNull(),
  endurance: integer("endurance").notNull(),
  description: text("description").notNull(),
  emoji: text("emoji").notNull().default("🐱"),
  experienceReward: integer("experience_reward").notNull().default(50),
  spawnsInLocation: json("spawns_in_location").$type<number[]>().notNull().default([]),
  respawnTime: integer("respawn_time").notNull().default(300), // seconds
  isDead: boolean("is_dead").notNull().default(false),
  lastDeathTime: timestamp("last_death_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const combats = pgTable("combats", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull(),
  participants: json("participants").$type<number[]>().notNull(),
  npcParticipants: json("npc_participants").$type<number[]>().notNull().default([]),
  type: text("type").notNull().default("pvp"), // "pvp", "pve", "mixed"
  status: text("status").notNull().default("active"), // "active", "finished"
  currentTurn: integer("current_turn").notNull().default(0),
  combatLog: json("combat_log").$type<CombatLogEntry[]>().notNull().default([]),
  startedAt: timestamp("started_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
});

export const gameEvents = pgTable("game_events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "combat_start", "combat_end", "location_change", "level_up"
  characterId: integer("character_id"),
  locationId: integer("location_id"),
  data: json("data").$type<Record<string, any>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  leaderId: integer("leader_id").notNull().references(() => characters.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
  maxMembers: integer("max_members").notNull().default(5),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  characterId: integer("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  telegramId: true,
});

export const insertCharacterSchema = createInsertSchema(characters).pick({
  userId: true,
  name: true,
  clan: true,
  gender: true,
  strength: true,
  agility: true,
  intelligence: true,
  endurance: true,
}).extend({
  name: z.string().min(2).max(20),
  clan: z.enum(["thunder", "shadow", "wind", "river"]),
  gender: z.enum(["male", "female"]),
  strength: z.number().min(10).max(25),
  agility: z.number().min(10).max(25),
  intelligence: z.number().min(10).max(25),
  endurance: z.number().min(10).max(25),
});

export const insertLocationSchema = createInsertSchema(locations).pick({
  name: true,
  description: true,
  type: true,
  clan: true,
  maxPlayers: true,
  dangerLevel: true,
});

export const moveCharacterSchema = z.object({
  characterId: z.number(),
  locationId: z.number(),
});

export const insertNpcSchema = createInsertSchema(npcs).pick({
  name: true,
  type: true,
  level: true,
  maxHp: true,
  strength: true,
  agility: true,
  intelligence: true,
  endurance: true,
  description: true,
  emoji: true,
  experienceReward: true,
  spawnsInLocation: true,
  respawnTime: true,
});

export const startCombatSchema = z.object({
  characterId: z.number(),
  targetId: z.number().optional(),
  npcId: z.number().optional(),
  locationId: z.number(),
  groupId: z.number().optional(), // Optional group combat
}).refine(data => data.targetId || data.npcId, {
  message: "Either targetId or npcId must be provided"
});

export const joinCombatSchema = z.object({
  characterId: z.number(),
  combatId: z.number(),
});

export const createGroupSchema = z.object({
  name: z.string().min(2).max(30),
});

export const joinGroupSchema = z.object({
  groupId: z.number(),
});

// Types
// Relations
export const usersRelations = relations(users, ({ many }) => ({
  characters: many(characters),
}));

export const charactersRelations = relations(characters, ({ one }) => ({
  user: one(users, { fields: [characters.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type NPC = typeof npcs.$inferSelect & {
  respawnTimeRemaining?: number; // Time in seconds until respawn (calculated client-side)
};
export type InsertNPC = z.infer<typeof insertNpcSchema>;

export type Combat = typeof combats.$inferSelect;
export type GameEvent = typeof gameEvents.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;

export interface CombatLogEntry {
  timestamp: string;
  type: "attack" | "dodge" | "block" | "damage" | "join" | "leave";
  actorId: number;
  targetId?: number;
  damage?: number;
  message: string;
}

export interface DerivedStats {
  damage: { min: number; max: number };
  dodgeChance: number;
  blockChance: number;
  critChance: number;
}

export interface GameState {
  character: Character | null;
  location: Location | null;
  playersInLocation: Character[];
  npcsInLocation: NPC[];
  activeCombats: Combat[];
  isInCombat: boolean;
  currentCombat: Combat | null;
  currentGroup: Group | null;
  groupsInLocation: Group[];
  lastCompletedCombat?: Combat | null;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

// Game constants
export const CLANS = {
  thunder: { name: "Грозовое Племя", color: "green" },
  river: { name: "Речное Племя", color: "cyan" },
} as const;

export const LOCATIONS_DATA = [
  // Племенные лагеря
  { id: 1, name: "Лагерь Грозового Племени", type: "camp", clan: "thunder", dangerLevel: 1, x: 15, y: 20, connectedTo: [3], emoji: "🏠" },
  { id: 2, name: "Лагерь Речного Племени", type: "camp", clan: "river", dangerLevel: 1, x: 75, y: 70, connectedTo: [6], emoji: "🏕️" },
  
  // Центральные локации
  { id: 3, name: "Четыре Дерева", type: "neutral", clan: null, dangerLevel: 2, x: 40, y: 35, connectedTo: [1, 4, 5], emoji: "🌳" },
  { id: 4, name: "Солнечная Поляна", type: "hunting", clan: null, dangerLevel: 2, x: 30, y: 55, connectedTo: [3, 7], emoji: "🌻" },
  { id: 5, name: "Лесная Тропа", type: "hunting", clan: null, dangerLevel: 3, x: 55, y: 25, connectedTo: [3, 6, 8], emoji: "🌲" },
  { id: 6, name: "Мшистый Овраг", type: "hunting", clan: null, dangerLevel: 3, x: 70, y: 45, connectedTo: [2, 5, 9], emoji: "🕳️" },
  { id: 7, name: "Старая Дорога", type: "neutral", clan: null, dangerLevel: 4, x: 20, y: 75, connectedTo: [4, 10, 16], emoji: "🛤️" },
  { id: 8, name: "Поле Битв", type: "combat", clan: null, dangerLevel: 5, x: 65, y: 15, connectedTo: [5, 9, 11], emoji: "⚔️" },
  { id: 9, name: "Каменистая Гора", type: "combat", clan: null, dangerLevel: 4, x: 80, y: 25, connectedTo: [6, 8, 10, 12], emoji: "⛰️" },
  { id: 10, name: "Лунный Камень", type: "sacred", clan: null, dangerLevel: 1, x: 50, y: 70, connectedTo: [7, 9], emoji: "🌙" },
  
  // Расширенная область карты (дальние локации)
  { id: 11, name: "Дальний Лес", type: "hunting", clan: null, dangerLevel: 6, x: 95, y: 10, connectedTo: [8, 12], emoji: "🌿" },
  { id: 12, name: "Горный Пик", type: "combat", clan: null, dangerLevel: 7, x: 105, y: 30, connectedTo: [9, 11, 13], emoji: "🏔️" },
  { id: 13, name: "Заброшенная Пещера", type: "neutral", clan: null, dangerLevel: 5, x: 115, y: 45, connectedTo: [12], emoji: "🕳️" },
  
  // Нижняя область карты
  { id: 16, name: "Болотистая Низина", type: "hunting", clan: null, dangerLevel: 4, x: 25, y: 85, connectedTo: [7, 17], emoji: "🌾" },
  { id: 17, name: "Туманные Холмы", type: "neutral", clan: null, dangerLevel: 5, x: 45, y: 100, connectedTo: [10, 16], emoji: "🌫️" },
] as const;

export const NPCS_DATA = [
  // Слабые враги для новичков
  { id: 1, name: "Дикая Мышь", type: "enemy", level: 1, maxHp: 30, strength: 8, agility: 12, intelligence: 6, endurance: 8, description: "Быстрая полевая мышь", emoji: "🐭", experienceReward: 25, spawnsInLocation: [4, 5], respawnTime: 120 },
  { id: 2, name: "Молодой Барсук", type: "enemy", level: 2, maxHp: 45, strength: 12, agility: 8, intelligence: 7, endurance: 12, description: "Агрессивный молодой барсук", emoji: "🦡", experienceReward: 40, spawnsInLocation: [4, 7], respawnTime: 180 },
  { id: 3, name: "Лесная Белка", type: "enemy", level: 1, maxHp: 25, strength: 6, agility: 15, intelligence: 8, endurance: 6, description: "Проворная белка с острыми когтями", emoji: "🐿️", experienceReward: 20, spawnsInLocation: [3, 5], respawnTime: 90 },
  
  // Средние враги
  { id: 4, name: "Дикий Кролик", type: "enemy", level: 3, maxHp: 60, strength: 10, agility: 18, intelligence: 9, endurance: 10, description: "Большой кролик с мощными задними лапами", emoji: "🐰", experienceReward: 60, spawnsInLocation: [4, 5, 6], respawnTime: 240 },
  { id: 5, name: "Лесной Енот", type: "enemy", level: 4, maxHp: 80, strength: 15, agility: 13, intelligence: 12, endurance: 15, description: "Хитрый енот-разбойник", emoji: "🦝", experienceReward: 80, spawnsInLocation: [5, 6, 8], respawnTime: 300 },
  { id: 6, name: "Степная Змея", type: "enemy", level: 3, maxHp: 50, strength: 13, agility: 16, intelligence: 10, endurance: 8, description: "Ядовитая змея с быстрым ударом", emoji: "🐍", experienceReward: 70, spawnsInLocation: [7, 8], respawnTime: 360 },
  
  // Сильные враги и боссы
  { id: 7, name: "Взрослый Барсук", type: "enemy", level: 5, maxHp: 120, strength: 20, agility: 10, intelligence: 8, endurance: 20, description: "Огромный барсук-охранник территории", emoji: "🦡", experienceReward: 120, spawnsInLocation: [8, 9], respawnTime: 450 },
  { id: 8, name: "Горный Орел", type: "boss", level: 6, maxHp: 150, strength: 18, agility: 22, intelligence: 15, endurance: 12, description: "Властелин небес с острыми когтями", emoji: "🦅", experienceReward: 200, spawnsInLocation: [9, 12], respawnTime: 600 },
  { id: 9, name: "Лесной Волк", type: "boss", level: 7, maxHp: 180, strength: 25, agility: 16, intelligence: 12, endurance: 18, description: "Одинокий волк, защищающий свою территорию", emoji: "🐺", experienceReward: 250, spawnsInLocation: [8, 9, 11], respawnTime: 900 },
  
  // Расширенная область - новые враги
  { id: 11, name: "Теневой Рысь", type: "boss", level: 8, maxHp: 220, strength: 22, agility: 25, intelligence: 18, endurance: 15, description: "Загадочная рысь из дальнего леса", emoji: "🐈‍⬛", experienceReward: 300, spawnsInLocation: [11, 13], respawnTime: 720 },
  { id: 12, name: "Древний Дракон", type: "boss", level: 10, maxHp: 350, strength: 35, agility: 15, intelligence: 20, endurance: 25, description: "Легендарный дракон горного пика", emoji: "🐉", experienceReward: 500, spawnsInLocation: [12], respawnTime: 1800 },
  { id: 13, name: "Болотный Тролль", type: "enemy", level: 6, maxHp: 160, strength: 28, agility: 8, intelligence: 6, endurance: 22, description: "Медлительный но очень сильный тролль", emoji: "👹", experienceReward: 180, spawnsInLocation: [16, 17], respawnTime: 540 },
  
  // Нейтральные и квестовые NPC
  { id: 10, name: "Старый Мудрец", type: "neutral", level: 10, maxHp: 200, strength: 15, agility: 10, intelligence: 25, endurance: 20, description: "Древний кот-отшельник, хранитель знаний", emoji: "🧙", experienceReward: 0, spawnsInLocation: [10], respawnTime: 0 },
] as const;

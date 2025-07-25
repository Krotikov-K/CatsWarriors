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
  rank: text("rank").notNull().default("kitten"), // "leader", "deputy", "senior_healer", "healer", "healer_apprentice", "senior_warrior", "warrior", "apprentice", "kitten"
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

export const groupApplications = pgTable("group_applications", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  characterId: integer("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  message: text("message"),
  status: text("status").notNull().default("pending"), // "pending", "accepted", "rejected"
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull(),
  characterId: integer("character_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const diplomacy = pgTable("diplomacy", {
  id: serial("id").primaryKey(),
  fromClan: text("from_clan").notNull(), // "thunder", "river"
  toClan: text("to_clan").notNull(), // "thunder", "river"
  status: text("status").notNull().default("peace"), // "peace", "war"
  changedBy: integer("changed_by").references(() => characters.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const diplomacyProposals = pgTable("diplomacy_proposals", {
  id: serial("id").primaryKey(),
  fromClan: text("from_clan").notNull(), // "thunder", "river"
  toClan: text("to_clan").notNull(), // "thunder", "river"
  proposedStatus: text("proposed_status").notNull(), // "peace", "war"
  proposedBy: integer("proposed_by").references(() => characters.id),
  message: text("message"),
  status: text("status").notNull().default("pending"), // "pending", "accepted", "rejected"
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  respondedBy: integer("responded_by").references(() => characters.id),
});

// Territory warfare system
export const clanInfluence = pgTable("clan_influence", {
  id: serial("id").primaryKey(),
  clan: text("clan").notNull().unique(),
  influencePoints: integer("influence_points").notNull().default(0),
  lastPointsGained: timestamp("last_points_gained").defaultNow(),
});

export const territoryOwnership = pgTable("territory_ownership", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull(),
  ownerClan: text("owner_clan").notNull(),
  capturedAt: timestamp("captured_at").defaultNow(),
  capturedBy: integer("captured_by").notNull(), // characterId who led the capture
});

export const territoryBattles = pgTable("territory_battles", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull(),
  attackingClan: text("attacking_clan").notNull(),
  defendingClan: text("defending_clan"), // null for neutral territories
  declaredBy: integer("declared_by").notNull(), // characterId
  battleStartTime: timestamp("battle_start_time").notNull(),
  status: text("status").notNull().default("preparing"), // "preparing", "active", "completed"
  winner: text("winner"), // clan name or null if ongoing
  participants: json("participants").$type<number[]>().notNull().default([]), // characterIds
  createdAt: timestamp("created_at").defaultNow(),
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
  rank: true,
  gender: true,
  strength: true,
  agility: true,
  intelligence: true,
  endurance: true,
}).extend({
  name: z.string().min(2).max(20),
  clan: z.enum(["thunder", "river"]),
  rank: z.enum(["leader", "deputy", "senior_healer", "healer", "healer_apprentice", "senior_warrior", "warrior", "apprentice", "kitten"]).default("kitten"),
  gender: z.enum(["male", "female"]),
  strength: z.number().min(10).max(25),
  agility: z.number().min(10).max(25),
  intelligence: z.number().min(10).max(25),
  endurance: z.number().min(10).max(25),
});

export const changeRankSchema = z.object({
  characterId: z.number(),
  newRank: z.enum(["leader", "deputy", "senior_healer", "healer", "healer_apprentice", "senior_warrior", "warrior", "apprentice", "kitten"]),
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

export const declareTerritoryBattleSchema = z.object({
  locationId: z.number(),
  declaredBy: z.number(), // characterId
});

export const joinTerritoryBattleSchema = z.object({
  battleId: z.number(),
  characterId: z.number(),
});

// Insert schemas for territory warfare
export const insertClanInfluenceSchema = createInsertSchema(clanInfluence).pick({
  clan: true,
  influencePoints: true,
});

export const insertTerritoryOwnershipSchema = createInsertSchema(territoryOwnership).pick({
  locationId: true,
  ownerClan: true,
  capturedBy: true,
});

export const insertTerritoryBattleSchema = createInsertSchema(territoryBattles).pick({
  locationId: true,
  attackingClan: true,
  defendingClan: true,
  declaredBy: true,
  battleStartTime: true,
});

// Type exports for territory warfare
export type ClanInfluence = typeof clanInfluence.$inferSelect;
export type InsertClanInfluence = z.infer<typeof insertClanInfluenceSchema>;
export type TerritoryOwnership = typeof territoryOwnership.$inferSelect;
export type InsertTerritoryOwnership = z.infer<typeof insertTerritoryOwnershipSchema>;
export type TerritoryBattle = typeof territoryBattles.$inferSelect;
export type InsertTerritoryBattle = z.infer<typeof insertTerritoryBattleSchema>;

export const createGroupSchema = z.object({
  name: z.string().min(2).max(30),
});

export const joinGroupSchema = z.object({
  groupId: z.number(),
});

export const applyToGroupSchema = z.object({
  groupId: z.number(),
  message: z.string().max(200).optional(),
});

export const respondToApplicationSchema = z.object({
  applicationId: z.number(),
  response: z.enum(["accepted", "rejected"]),
});

export const insertChatMessageSchema = z.object({
  locationId: z.number(),
  characterId: z.number(),
  message: z.string().min(1).max(200),
});

export const insertDiplomacySchema = createInsertSchema(diplomacy).pick({
  fromClan: true,
  toClan: true,
  status: true,
  changedBy: true,
});

export const changeDiplomacySchema = z.object({
  fromClan: z.enum(["thunder", "river"]),
  toClan: z.enum(["thunder", "river"]),
  status: z.enum(["peace", "war"]),
});

export const proposeDiplomacySchema = z.object({
  fromClan: z.enum(["thunder", "river"]),
  toClan: z.enum(["thunder", "river"]),
  proposedStatus: z.enum(["peace", "war"]),
  message: z.string().max(200).optional(),
});

export const respondToProposalSchema = z.object({
  proposalId: z.number(),
  response: z.enum(["accepted", "rejected"]),
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
export type GroupApplication = typeof groupApplications.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Diplomacy = typeof diplomacy.$inferSelect;
export type InsertDiplomacy = z.infer<typeof insertDiplomacySchema>;
export type DiplomacyProposal = typeof diplomacyProposals.$inferSelect;

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
  allGroups: Group[];
  groupApplications: GroupApplication[];
  lastCompletedCombat?: Combat | null;
  chatMessages: ChatMessage[];
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

export const RANKS = {
  leader: { 
    name: "Предводитель", 
    emoji: "👑", 
    canPromote: ["deputy", "senior_healer", "healer", "healer_apprentice", "senior_warrior", "warrior", "apprentice", "kitten"],
    canBePromotedBy: ["admin"],
    adminOnly: true 
  },
  deputy: { 
    name: "Глашатай", 
    emoji: "⚔️", 
    canPromote: ["senior_healer", "healer", "healer_apprentice", "senior_warrior", "warrior", "apprentice", "kitten"],
    canBePromotedBy: ["admin", "leader"]
  },
  senior_healer: { 
    name: "Старший целитель", 
    emoji: "🌿", 
    canPromote: ["healer", "healer_apprentice"],
    canBePromotedBy: ["admin", "leader", "deputy"]
  },
  healer: { 
    name: "Целитель", 
    emoji: "🍃", 
    canPromote: ["healer_apprentice"],
    canBePromotedBy: ["admin", "leader", "deputy", "senior_healer"]
  },
  healer_apprentice: { 
    name: "Ученик целителя", 
    emoji: "🌱", 
    canPromote: [],
    canBePromotedBy: ["admin", "leader", "deputy", "senior_healer"]
  },
  senior_warrior: { 
    name: "Старший воитель", 
    emoji: "🗡️", 
    canPromote: ["warrior", "apprentice"],
    canBePromotedBy: ["admin", "leader", "deputy"]
  },
  warrior: { 
    name: "Воитель", 
    emoji: "⚡", 
    canPromote: [],
    canBePromotedBy: ["admin", "leader", "deputy", "senior_warrior"]
  },
  apprentice: { 
    name: "Оруженосец", 
    emoji: "🔰", 
    canPromote: [],
    canBePromotedBy: ["admin", "leader", "deputy", "senior_warrior"]
  },
  kitten: { 
    name: "Котёнок", 
    emoji: "🐾", 
    canPromote: [],
    canBePromotedBy: ["admin", "leader", "deputy", "senior_warrior", "warrior"]
  },
} as const;

export const LOCATIONS_DATA = [
  // Племенные лагеря (очень далеко по краям)
  { id: 1, name: "Лагерь Грозового Племени", type: "camp", clan: "thunder", dangerLevel: 1, x: 3, y: 50, connectedTo: [9], emoji: "🏠" },
  { id: 2, name: "Лагерь Речного Племени", type: "camp", clan: "river", dangerLevel: 1, x: 97, y: 50, connectedTo: [5], emoji: "🏕️" },
  
  // Зелёные локации (замкнутый внешний круг)
  { id: 3, name: "Четыре Дерева", type: "hunting", clan: null, dangerLevel: 2, x: 50, y: 10, connectedTo: [4, 10, 19], emoji: "🌳" },
  { id: 4, name: "Солнечная Поляна", type: "hunting", clan: null, dangerLevel: 2, x: 80, y: 25, connectedTo: [3, 5, 11], emoji: "🌻" },
  { id: 5, name: "Лесная Тропа", type: "hunting", clan: null, dangerLevel: 2, x: 90, y: 50, connectedTo: [2, 4, 6], emoji: "🌲" },
  { id: 6, name: "Мшистый Овраг", type: "hunting", clan: null, dangerLevel: 2, x: 80, y: 75, connectedTo: [5, 7], emoji: "🕳️" },
  { id: 7, name: "Старая Дорога", type: "hunting", clan: null, dangerLevel: 2, x: 50, y: 90, connectedTo: [6, 8, 13, 24], emoji: "🛤️" },
  { id: 8, name: "Болотистая Низина", type: "hunting", clan: null, dangerLevel: 2, x: 20, y: 75, connectedTo: [7, 9], emoji: "🌾" },
  { id: 9, name: "Дальний Лес", type: "hunting", clan: null, dangerLevel: 2, x: 10, y: 50, connectedTo: [1, 8, 10], emoji: "🌿" },
  { id: 10, name: "Горная Тропа", type: "hunting", clan: null, dangerLevel: 2, x: 20, y: 25, connectedTo: [9, 3], emoji: "🗻" },
  
  // Жёлтые локации (средний круг с связями к зелёному)
  { id: 11, name: "Поляна Встреч", type: "neutral", clan: null, dangerLevel: 3, x: 65, y: 30, connectedTo: [4, 12, 16], emoji: "🌼" },
  { id: 12, name: "Лунная Поляна", type: "neutral", clan: null, dangerLevel: 3, x: 70, y: 60, connectedTo: [11, 13, 18], emoji: "🌙" },
  { id: 13, name: "Древний Пень", type: "neutral", clan: null, dangerLevel: 3, x: 50, y: 70, connectedTo: [7, 12, 14], emoji: "🪵" },
  { id: 14, name: "Каменный Круг", type: "neutral", clan: null, dangerLevel: 3, x: 30, y: 60, connectedTo: [13, 15, 17], emoji: "⭕" },
  { id: 15, name: "Священная Роща", type: "neutral", clan: null, dangerLevel: 3, x: 30, y: 40, connectedTo: [14, 16], emoji: "🌳" },
  { id: 16, name: "Источник", type: "neutral", clan: null, dangerLevel: 3, x: 50, y: 30, connectedTo: [15, 11], emoji: "💧" },
  
  // Красные локации (центр с связями к жёлтому)
  { id: 17, name: "Поле Битв", type: "combat", clan: null, dangerLevel: 5, x: 45, y: 50, connectedTo: [14, 18], emoji: "⚔️" },
  { id: 18, name: "Логово Волка", type: "combat", clan: null, dangerLevel: 5, x: 55, y: 50, connectedTo: [12, 17], emoji: "🐺" },
  
  // Дополнительные локации (верх) - слева направо от Четыре Дерева
  { id: 19, name: "Пугающее ущелье", type: "danger", clan: null, dangerLevel: 4, x: 65, y: 5, connectedTo: [20, 3], emoji: "🏔️" },
  { id: 20, name: "Солнечный Склон", type: "danger", clan: null, dangerLevel: 4, x: 80, y: 5, connectedTo: [19, 21], emoji: "☀️" },
  { id: 21, name: "Гремящая Роща", type: "danger", clan: null, dangerLevel: 4, x: 95, y: 5, connectedTo: [20], emoji: "🌩️" },
  
  // Дополнительные локации (низ) - справа налево от Старая Дорога
  { id: 22, name: "Хрустальный Ручей", type: "danger", clan: null, dangerLevel: 4, x: 95, y: 95, connectedTo: [23], emoji: "💎" },
  { id: 23, name: "Озеро Снов", type: "danger", clan: null, dangerLevel: 4, x: 80, y: 95, connectedTo: [22, 24], emoji: "🌊" },
  { id: 24, name: "Тропа Теней", type: "danger", clan: null, dangerLevel: 4, x: 65, y: 95, connectedTo: [23, 7], emoji: "🌑" },
] as const;

export const NPCS_DATA = [
  // Слабые враги для новичков
  { id: 1, name: "Дикая Мышь", type: "enemy", level: 1, maxHp: 30, strength: 8, agility: 12, intelligence: 6, endurance: 8, description: "Быстрая полевая мышь", emoji: "🐭", experienceReward: 25, spawnsInLocation: [3, 4], respawnTime: 120 },
  { id: 2, name: "Молодой Барсук", type: "enemy", level: 2, maxHp: 45, strength: 12, agility: 8, intelligence: 7, endurance: 12, description: "Агрессивный молодой барсук", emoji: "🦡", experienceReward: 40, spawnsInLocation: [7, 8], respawnTime: 180 },
  { id: 3, name: "Лесная Белка", type: "enemy", level: 1, maxHp: 25, strength: 6, agility: 15, intelligence: 8, endurance: 6, description: "Проворная белка с острыми когтями", emoji: "🐿️", experienceReward: 20, spawnsInLocation: [5, 6], respawnTime: 90 },
  
  // Средние враги
  { id: 4, name: "Дикий Кролик", type: "enemy", level: 3, maxHp: 60, strength: 10, agility: 18, intelligence: 9, endurance: 10, description: "Большой кролик с мощными задними лапами", emoji: "🐰", experienceReward: 60, spawnsInLocation: [11, 12, 13], respawnTime: 240 },
  { id: 5, name: "Лесной Енот", type: "enemy", level: 4, maxHp: 80, strength: 15, agility: 13, intelligence: 12, endurance: 15, description: "Хитрый енот-разбойник", emoji: "🦝", experienceReward: 80, spawnsInLocation: [14, 15, 16], respawnTime: 300 },
  { id: 6, name: "Степная Змея", type: "enemy", level: 3, maxHp: 50, strength: 13, agility: 16, intelligence: 10, endurance: 8, description: "Ядовитая змея с быстрым ударом", emoji: "🐍", experienceReward: 70, spawnsInLocation: [17], respawnTime: 360 },
  
  // Сильные враги и боссы
  { id: 7, name: "Взрослый Барсук", type: "enemy", level: 5, maxHp: 120, strength: 20, agility: 10, intelligence: 8, endurance: 20, description: "Огромный барсук-охранник территории", emoji: "🦡", experienceReward: 120, spawnsInLocation: [17], respawnTime: 450 },
  { id: 8, name: "Горный Орел", type: "boss", level: 6, maxHp: 150, strength: 18, agility: 22, intelligence: 15, endurance: 12, description: "Властелин небес с острыми когтями", emoji: "🦅", experienceReward: 200, spawnsInLocation: [17], respawnTime: 600 },
  { id: 9, name: "Лесной Волк", type: "boss", level: 7, maxHp: 180, strength: 25, agility: 16, intelligence: 12, endurance: 18, description: "Одинокий волк, защищающий свою территорию", emoji: "🐺", experienceReward: 250, spawnsInLocation: [18], respawnTime: 900 },
  
  // Расширенная область - новые враги
  { id: 11, name: "Теневой Рысь", type: "boss", level: 8, maxHp: 220, strength: 22, agility: 25, intelligence: 18, endurance: 15, description: "Загадочная рысь из дальнего леса", emoji: "🐈‍⬛", experienceReward: 300, spawnsInLocation: [18], respawnTime: 720 },
  { id: 15, name: "Хитрая Лисица", type: "enemy", level: 6, maxHp: 140, strength: 20, agility: 24, intelligence: 18, endurance: 16, description: "Умная и проворная рыжая лисица", emoji: "🦊", experienceReward: 180, spawnsInLocation: [8, 9], respawnTime: 540 },
  
  // Нейтральные и квестовые NPC
  { id: 10, name: "Старый Мудрец", type: "neutral", level: 10, maxHp: 200, strength: 15, agility: 10, intelligence: 25, endurance: 20, description: "Древний кот-отшельник, хранитель знаний", emoji: "🧙", experienceReward: 0, spawnsInLocation: [16], respawnTime: 0 },
  
  // Старейшины в племенных лагерях для повышения котят
  { id: 12, name: "Старейшина Грозового Племени", type: "elder", level: 15, maxHp: 300, strength: 20, agility: 15, intelligence: 30, endurance: 25, description: "Мудрый старейшина, проводящий обряды посвящения", emoji: "👴", experienceReward: 0, spawnsInLocation: [1], respawnTime: 0 },
  { id: 13, name: "Старейшина Речного Племени", type: "elder", level: 15, maxHp: 300, strength: 20, agility: 15, intelligence: 30, endurance: 25, description: "Мудрый старейшина, проводящий обряды посвящения", emoji: "👴", experienceReward: 0, spawnsInLocation: [2], respawnTime: 0 },
  
  // NPCs для новых локаций - барсуки и лисицы
  { id: 25, name: "Старый Барсук", type: "boss", level: 8, maxHp: 240, strength: 25, agility: 15, intelligence: 12, endurance: 24, description: "Опытный барсук-одиночка из ущелья", emoji: "🦡", experienceReward: 320, spawnsInLocation: [19], respawnTime: 900 },
  { id: 26, name: "Горный Барсук", type: "enemy", level: 6, maxHp: 140, strength: 20, agility: 12, intelligence: 10, endurance: 18, description: "Сильный барсук с горных склонов", emoji: "🦡", experienceReward: 180, spawnsInLocation: [19], respawnTime: 540 },
  { id: 27, name: "Рыжая Лисица", type: "enemy", level: 5, maxHp: 100, strength: 15, agility: 22, intelligence: 18, endurance: 12, description: "Быстрая лисица с солнечных полян", emoji: "🦊", experienceReward: 150, spawnsInLocation: [20], respawnTime: 420 },
  { id: 28, name: "Хитрая Лисица", type: "enemy", level: 7, maxHp: 140, strength: 18, agility: 24, intelligence: 20, endurance: 14, description: "Умная лисица, мастер засад", emoji: "🦊", experienceReward: 210, spawnsInLocation: [20], respawnTime: 600 },
  { id: 29, name: "Вожак Барсуков", type: "boss", level: 9, maxHp: 280, strength: 28, agility: 16, intelligence: 15, endurance: 26, description: "Могучий предводитель барсучьей семьи", emoji: "🦡", experienceReward: 380, spawnsInLocation: [21], respawnTime: 1080 },
  { id: 30, name: "Молодая Лисица", type: "enemy", level: 4, maxHp: 80, strength: 12, agility: 20, intelligence: 16, endurance: 10, description: "Проворная молодая лисица", emoji: "🦊", experienceReward: 120, spawnsInLocation: [21], respawnTime: 360 },
  
  // NPCs для новых локаций (нижний ряд) - более сильные барсуки и лисицы
  { id: 31, name: "Речной Барсук", type: "boss", level: 10, maxHp: 320, strength: 30, agility: 14, intelligence: 16, endurance: 28, description: "Огромный барсук, охраняющий водные пути", emoji: "🦡", experienceReward: 450, spawnsInLocation: [22], respawnTime: 1200 },
  { id: 32, name: "Болотная Лисица", type: "enemy", level: 8, maxHp: 160, strength: 20, agility: 26, intelligence: 22, endurance: 16, description: "Лисица, приспособившаяся к болотам", emoji: "🦊", experienceReward: 280, spawnsInLocation: [22], respawnTime: 720 },
  { id: 33, name: "Альфа-Барсук", type: "boss", level: 11, maxHp: 360, strength: 32, agility: 16, intelligence: 18, endurance: 30, description: "Легендарный барсук озёрных земель", emoji: "🦡", experienceReward: 550, spawnsInLocation: [23], respawnTime: 1440 },
  { id: 34, name: "Серебряная Лисица", type: "enemy", level: 9, maxHp: 180, strength: 22, agility: 28, intelligence: 24, endurance: 18, description: "Редкая серебристая лисица", emoji: "🦊", experienceReward: 360, spawnsInLocation: [23], respawnTime: 900 },
  { id: 35, name: "Теневой Барсук", type: "boss", level: 12, maxHp: 400, strength: 35, agility: 18, intelligence: 20, endurance: 32, description: "Самый опасный барсук теневых троп", emoji: "🦡", experienceReward: 650, spawnsInLocation: [24], respawnTime: 1800 },
  { id: 36, name: "Чёрная Лисица", type: "enemy", level: 10, maxHp: 200, strength: 24, agility: 30, intelligence: 26, endurance: 20, description: "Таинственная чёрная лисица", emoji: "🦊", experienceReward: 420, spawnsInLocation: [24], respawnTime: 1080 },
] as const;

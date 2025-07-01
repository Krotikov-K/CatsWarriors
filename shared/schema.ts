import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  lastActivity: timestamp("last_activity").defaultNow(),
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

export const combats = pgTable("combats", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull(),
  participants: json("participants").$type<number[]>().notNull(),
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
  strength: true,
  agility: true,
  intelligence: true,
  endurance: true,
}).extend({
  name: z.string().min(2).max(20),
  clan: z.enum(["thunder", "shadow", "wind", "river"]),
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

export const startCombatSchema = z.object({
  characterId: z.number(),
  targetId: z.number(),
  locationId: z.number(),
});

export const joinCombatSchema = z.object({
  characterId: z.number(),
  combatId: z.number(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type Combat = typeof combats.$inferSelect;
export type GameEvent = typeof gameEvents.$inferSelect;

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
  activeCombats: Combat[];
  isInCombat: boolean;
  currentCombat: Combat | null;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

// Game constants
export const CLANS = {
  thunder: { name: "Грозовое Племя", color: "green" },
  shadow: { name: "Теневое Племя", color: "purple" },
  wind: { name: "Ветряное Племя", color: "blue" },
  river: { name: "Речное Племя", color: "cyan" },
} as const;

export const LOCATIONS_DATA = [
  { id: 1, name: "Лагерь Грозового Племени", type: "camp", clan: "thunder", dangerLevel: 1 },
  { id: 2, name: "Лагерь Теневого Племени", type: "camp", clan: "shadow", dangerLevel: 1 },
  { id: 3, name: "Лагерь Ветряного Племени", type: "camp", clan: "wind", dangerLevel: 1 },
  { id: 4, name: "Лагерь Речного Племени", type: "camp", clan: "river", dangerLevel: 1 },
  { id: 5, name: "Четыре Дерева", type: "neutral", clan: null, dangerLevel: 2 },
  { id: 6, name: "Тренировочная Поляна", type: "training", clan: null, dangerLevel: 3 },
  { id: 7, name: "Лунный Камень", type: "sacred", clan: null, dangerLevel: 1 },
  { id: 8, name: "Место Двуногих", type: "neutral", clan: null, dangerLevel: 4 },
] as const;

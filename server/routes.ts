import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { storage } from "./storage";
import { GameEngine } from "./services/gameEngine";
import { telegramBot } from "./services/telegramBot";
import {
  insertUserSchema,
  insertCharacterSchema,
  moveCharacterSchema,
  startCombatSchema,
  joinCombatSchema,
  type WebSocketMessage,
  type Character,
  type Combat
} from "@shared/schema";

interface AuthenticatedRequest extends Request {
  userId?: number;
}

// WebSocket connection management
const connectedClients = new Map<number, WebSocket>(); // characterId -> WebSocket

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });

  wss.on('connection', (ws, req) => {
    console.log('WebSocket connection established');
    
    ws.on('message', async (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        await handleWebSocketMessage(ws, message);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Remove client from connected clients
      const entries = Array.from(connectedClients.entries());
      for (const [characterId, client] of entries) {
        if (client === ws) {
          connectedClients.delete(characterId);
          break;
        }
      }
    });
  });

  async function handleWebSocketMessage(ws: WebSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'auth':
        const characterId = message.data.characterId;
        if (characterId) {
          connectedClients.set(characterId, ws);
          await storage.setCharacterOnline(characterId, true);
          await broadcastLocationUpdate(characterId);
        }
        break;
      
      case 'heartbeat':
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
        break;
    }
  }

  async function broadcastLocationUpdate(characterId: number) {
    const character = await storage.getCharacter(characterId);
    if (!character) return;

    const playersInLocation = await storage.getCharactersByLocation(character.currentLocationId);
    const activeCombats = await storage.getActiveCombatsInLocation(character.currentLocationId);

    const updateMessage: WebSocketMessage = {
      type: 'location_update',
      data: {
        locationId: character.currentLocationId,
        players: playersInLocation,
        combats: activeCombats
      },
      timestamp: new Date().toISOString()
    };

    // Send to all players in the same location
    for (const player of playersInLocation) {
      const client = connectedClients.get(player.id);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(updateMessage));
      }
    }
  }

  async function broadcastCombatUpdate(combatId: number) {
    const combat = await storage.getCombat(combatId);
    if (!combat) return;

    const updateMessage: WebSocketMessage = {
      type: 'combat_update',
      data: { combat },
      timestamp: new Date().toISOString()
    };

    // Send to all participants and observers
    const playersInLocation = await storage.getCharactersByLocation(combat.locationId);
    for (const player of playersInLocation) {
      const client = connectedClients.get(player.id);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(updateMessage));
      }
    }
  }

  // User routes
  app.post("/api/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser(userData);
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // In a real app, you'd set up sessions or JWT here
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Character routes
  app.post("/api/characters", async (req, res) => {
    try {
      const characterData = insertCharacterSchema.parse(req.body);
      
      // Check if character name is taken
      const existingCharacters = await storage.getCharactersByUserId(characterData.userId);
      const nameExists = existingCharacters.some(char => char.name === characterData.name);
      
      if (nameExists) {
        return res.status(400).json({ message: "Character name already exists" });
      }

      const character = await storage.createCharacter(characterData);
      
      // Create character creation event
      await storage.createGameEvent({
        type: "character_created",
        characterId: character.id,
        locationId: character.currentLocationId,
        data: { characterName: character.name, clan: character.clan }
      });

      res.json({ character });
    } catch (error) {
      console.error("Character creation error:", error);
      res.status(400).json({ message: "Character creation failed" });
    }
  });

  app.get("/api/characters/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const characters = await storage.getCharactersByUserId(userId);
      res.json({ characters });
    } catch (error) {
      console.error("Get characters error:", error);
      res.status(500).json({ message: "Failed to get characters" });
    }
  });

  app.get("/api/characters/:id/stats", async (req, res) => {
    try {
      const characterId = parseInt(req.params.id);
      const character = await storage.getCharacter(characterId);
      
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      const derivedStats = GameEngine.calculateDerivedStats(character);
      res.json({ character, derivedStats });
    } catch (error) {
      console.error("Get character stats error:", error);
      res.status(500).json({ message: "Failed to get character stats" });
    }
  });

  // Location routes
  app.get("/api/locations", async (req, res) => {
    try {
      const locations = await storage.getAllLocations();
      res.json({ locations });
    } catch (error) {
      console.error("Get locations error:", error);
      res.status(500).json({ message: "Failed to get locations" });
    }
  });

  app.get("/api/locations/:id", async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const location = await storage.getLocation(locationId);
      const playersInLocation = await storage.getCharactersByLocation(locationId);
      const activeCombats = await storage.getActiveCombatsInLocation(locationId);
      
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      res.json({ 
        location, 
        players: playersInLocation,
        combats: activeCombats
      });
    } catch (error) {
      console.error("Get location error:", error);
      res.status(500).json({ message: "Failed to get location" });
    }
  });

  app.post("/api/move", async (req, res) => {
    try {
      const { characterId, locationId } = moveCharacterSchema.parse(req.body);
      
      const character = await storage.getCharacter(characterId);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      const location = await storage.getLocation(locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Check if character is in combat
      const activeCombat = await storage.getCharacterActiveCombat(characterId);
      if (activeCombat) {
        return res.status(400).json({ message: "Cannot move while in combat" });
      }

      const updatedCharacter = await storage.moveCharacter(characterId, locationId);
      
      // Create movement event
      await storage.createGameEvent({
        type: "location_change",
        characterId,
        locationId,
        data: { from: character.currentLocationId, to: locationId }
      });

      // Broadcast location updates
      await broadcastLocationUpdate(characterId);

      res.json({ character: updatedCharacter });
    } catch (error) {
      console.error("Move character error:", error);
      res.status(400).json({ message: "Move failed" });
    }
  });

  // Combat routes
  app.post("/api/combat/start", async (req, res) => {
    try {
      const { characterId, targetId, locationId } = startCombatSchema.parse(req.body);
      
      const character = await storage.getCharacter(characterId);
      const target = await storage.getCharacter(targetId);
      
      if (!character || !target) {
        return res.status(404).json({ message: "Character not found" });
      }

      if (character.currentLocationId !== locationId || target.currentLocationId !== locationId) {
        return res.status(400).json({ message: "Characters must be in the same location" });
      }

      // Check if either character is already in combat
      const characterCombat = await storage.getCharacterActiveCombat(characterId);
      const targetCombat = await storage.getCharacterActiveCombat(targetId);
      
      if (characterCombat || targetCombat) {
        return res.status(400).json({ message: "One or both characters are already in combat" });
      }

      const combat = await storage.createCombat(locationId, [characterId, targetId]);
      
      // Create combat start event
      await storage.createGameEvent({
        type: "combat_start",
        characterId,
        locationId,
        data: { combatId: combat.id, participants: [characterId, targetId] }
      });

      // Start auto-combat
      GameEngine.startAutoCombat(combat.id);
      
      // Send Telegram notifications
      if (telegramBot.isEnabled()) {
        const location = await storage.getLocation(locationId);
        await telegramBot.notifyCombatStart([characterId, targetId], location?.name || "Unknown");
      }

      // Broadcast combat update
      await broadcastCombatUpdate(combat.id);

      res.json({ combat });
    } catch (error) {
      console.error("Start combat error:", error);
      res.status(400).json({ message: "Failed to start combat" });
    }
  });

  app.post("/api/combat/join", async (req, res) => {
    try {
      const { characterId, combatId } = joinCombatSchema.parse(req.body);
      
      const character = await storage.getCharacter(characterId);
      const combat = await storage.getCombat(combatId);
      
      if (!character || !combat) {
        return res.status(404).json({ message: "Character or combat not found" });
      }

      if (combat.status !== "active") {
        return res.status(400).json({ message: "Combat is not active" });
      }

      if (character.currentLocationId !== combat.locationId) {
        return res.status(400).json({ message: "Character must be in combat location" });
      }

      // Check if character is already in another combat
      const existingCombat = await storage.getCharacterActiveCombat(characterId);
      if (existingCombat && existingCombat.id !== combatId) {
        return res.status(400).json({ message: "Character is already in another combat" });
      }

      const updatedCombat = await storage.addParticipantToCombat(combatId, characterId);
      
      // Add join log entry
      await storage.addCombatLogEntry(combatId, {
        timestamp: new Date().toISOString(),
        type: "join",
        actorId: characterId,
        message: `${character.name} присоединяется к бою!`
      });

      // Broadcast combat update
      await broadcastCombatUpdate(combatId);

      res.json({ combat: updatedCombat });
    } catch (error) {
      console.error("Join combat error:", error);
      res.status(400).json({ message: "Failed to join combat" });
    }
  });

  app.get("/api/combat/:id", async (req, res) => {
    try {
      const combatId = parseInt(req.params.id);
      const combat = await storage.getCombat(combatId);
      
      if (!combat) {
        return res.status(404).json({ message: "Combat not found" });
      }

      // Get participant details
      const participants = await Promise.all(
        combat.participants.map(id => storage.getCharacter(id))
      );

      res.json({ 
        combat,
        participants: participants.filter(Boolean)
      });
    } catch (error) {
      console.error("Get combat error:", error);
      res.status(500).json({ message: "Failed to get combat" });
    }
  });

  // Game state routes
  app.get("/api/game-state/:characterId", async (req, res) => {
    try {
      const characterId = parseInt(req.params.characterId);
      const character = await storage.getCharacter(characterId);
      
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      const location = await storage.getLocation(character.currentLocationId);
      const playersInLocation = await storage.getCharactersByLocation(character.currentLocationId);
      const activeCombats = await storage.getActiveCombatsInLocation(character.currentLocationId);
      const currentCombat = await storage.getCharacterActiveCombat(characterId);

      res.json({
        character,
        location,
        playersInLocation,
        activeCombats,
        isInCombat: !!currentCombat,
        currentCombat
      });
    } catch (error) {
      console.error("Get game state error:", error);
      res.status(500).json({ message: "Failed to get game state" });
    }
  });

  return httpServer;
}

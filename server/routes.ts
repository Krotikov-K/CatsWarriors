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
  createGroupSchema,
  joinGroupSchema,

  joinTerritoryBattleSchema,
  type WebSocketMessage,
  type Character,
  type Combat,
  type TerritoryOwnership
} from "@shared/schema";

interface AuthenticatedRequest extends Request {
  userId?: number;
}

// WebSocket connection management
const connectedClients = new Map<number, WebSocket>(); // characterId -> WebSocket

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Development mode authentication middleware
  app.use(async (req, res, next) => {
    if (process.env.NODE_ENV === "development") {
      let resolvedUserId = 1; // Default to Кисяо
      
      // Check URL for user parameter (for development testing)
      const url = new URL(req.url, 'http://localhost:5000');
      const userFromUrl = url.searchParams.get('userId');
      
      // In development, use query parameter or header to simulate different users
      const devUserId = userFromUrl || req.query.devUserId || req.headers['x-dev-user-id'];
      if (devUserId) {
        resolvedUserId = parseInt(devUserId as string);
      } else {
        // Check Telegram WebApp data for real authentication
        const telegramInitData = req.headers['x-telegram-init-data'];
        if (telegramInitData) {
          try {
            const urlParams = new URLSearchParams(telegramInitData as string);
            const userParam = urlParams.get('user');
            if (userParam) {
              const telegramUser = JSON.parse(userParam);
              const telegramId = telegramUser.id.toString();
              
              console.log(`Telegram auth: telegramId=${telegramId}, username=${telegramUser.username}`);
              
              // Find user by Telegram ID in database
              const user = await storage.getUserByTelegramId(telegramId);
              if (user) {
                resolvedUserId = user.id;
                console.log(`Found user: id=${user.id}, username=${user.username}, telegramId=${user.telegramId}`);
              } else {
                console.log(`Creating new user for telegramId=${telegramId}`);
                // Create new user if not exists
                const newUser = await storage.createUser({
                  username: telegramUser.username || `user_${telegramId}`,
                  telegramId: telegramId,
                  firstName: telegramUser.first_name || "",
                  lastName: telegramUser.last_name || "",
                  password: "telegram_auth"
                });
                resolvedUserId = newUser.id;
                console.log(`Created new user: id=${newUser.id}`);
              }
            } else {
              console.log("No user param in telegram data");
              resolvedUserId = 1;
            }
          } catch (error) {
            console.error("Telegram auth error:", error);
            resolvedUserId = 1;
          }
        } else {
          // Fallback: use default mapping for development
          console.log("No telegram data, using default");
          resolvedUserId = 1; // Default to Кисяо
        }
      }
      
      (req as AuthenticatedRequest).userId = resolvedUserId;
      
      // Log authentication only for diplomacy requests 
      if (req.url.includes('/api/diplomacy/')) {
        console.log(`Auth Debug [${req.method} ${req.url}]: userId=${resolvedUserId}, devHeader=${req.headers['x-dev-user-id']}, telegramData=${req.headers['x-telegram-init-data'] ? 'present' : 'absent'}`);
        console.log(`DIPLOMACY REQUEST: devUserId=${devUserId}, resolvedUserId=${resolvedUserId}, userFromUrl=${userFromUrl}`);
      }
    }
    next();
  });

  // WebSocket server setup
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    perMessageDeflate: false
  });

  wss.on('connection', (ws, req) => {
    console.log('WebSocket connection established from:', req.socket.remoteAddress);
    
    ws.on('message', async (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        console.log('Received WebSocket message:', message.type);
        await handleWebSocketMessage(ws, message);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      // Remove client from connected clients
      const entries = Array.from(connectedClients.entries());
      for (const [characterId, client] of entries) {
        if (client === ws) {
          connectedClients.delete(characterId);
          storage.setCharacterOnline(characterId, false);
          break;
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  async function handleWebSocketMessage(ws: WebSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'auth':
        const characterId = message.data.characterId;
        if (characterId) {
          connectedClients.set(characterId, ws);
          await storage.setCharacterOnline(characterId, true);
          
          // Send authentication confirmation
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
              type: 'auth_success', 
              data: { characterId }, 
              timestamp: new Date().toISOString() 
            }));
          }
          
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

  async function broadcastRankChange(characterId: number) {
    const character = await storage.getCharacter(characterId);
    if (!character) return;

    const updateMessage: WebSocketMessage = {
      type: 'rank_change',
      data: { character },
      timestamp: new Date().toISOString()
    };

    // Send to all connected clients to update tribe member lists
    for (const [clientCharacterId, client] of connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(updateMessage));
      }
    }
  }

  async function broadcastDiplomacyUpdate(relations: any, message: string) {
    const updateMessage: WebSocketMessage = {
      type: 'diplomacy_change',
      data: { relations, message },
      timestamp: new Date().toISOString()
    };

    // Send to all connected clients
    for (const [characterId, client] of connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(updateMessage));
      }
    }
  }

  async function broadcastGroupVictory(participantIds: number[], npcName: string, expGain: number) {
    console.log(`*** BROADCASTING GROUP VICTORY ***`);
    console.log(`- Target participants: [${participantIds.join(', ')}]`);
    console.log(`- Connected clients: ${connectedClients.size}`);
    console.log(`- Connected client IDs: [${Array.from(connectedClients.keys()).join(', ')}]`);
    
    const updateMessage: WebSocketMessage = {
      type: 'group_victory',
      data: { 
        npcName,
        expGain,
        message: `Ваша группа победила ${npcName} и получила ${expGain} опыта!`
      },
      timestamp: new Date().toISOString()
    };

    console.log(`- Message to send:`, JSON.stringify(updateMessage));

    // Send to all group participants
    let sentCount = 0;
    for (const characterId of participantIds) {
      const client = connectedClients.get(characterId);
      console.log(`- Character ${characterId}: client exists=${!!client}, connected=${client?.readyState === WebSocket.OPEN}`);
      
      if (client && client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(updateMessage));
          sentCount++;
          console.log(`- Successfully sent to character ${characterId}`);
        } catch (error) {
          console.log(`- Failed to send to character ${characterId}:`, error);
        }
      } else {
        console.log(`- Character ${characterId} not connected or client not ready`);
      }
    }
    
    console.log(`*** GROUP VICTORY BROADCAST COMPLETE: ${sentCount}/${participantIds.length} messages sent ***`);
  }

  // Broadcast to all connected clients
  async function broadcastToAll(data: any) {
    const updateMessage: WebSocketMessage = {
      type: data.type || 'general_update',
      data: data,
      timestamp: new Date().toISOString()
    };

    // Send to all connected clients
    for (const [characterId, client] of connectedClients) {
      if (client && client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(updateMessage));
        } catch (error) {
          console.log(`Failed to send broadcast message to character ${characterId}:`, error);
        }
      }
    }
  }

  // Make functions globally available for gameEngine
  (global as any).broadcastGroupVictory = broadcastGroupVictory;
  (global as any).broadcastToAll = broadcastToAll;

  // Telegram authentication route
  app.post("/api/auth/telegram", async (req, res) => {
    try {
      const { telegramUser } = req.body;
      
      if (!telegramUser || !telegramUser.id) {
        return res.status(400).json({ message: "Invalid Telegram user data" });
      }

      // Check if user exists by Telegram ID
      let user = await storage.getUserByTelegramId(telegramUser.id.toString());
      
      if (!user) {
        // Create new user from Telegram data
        const userData = {
          username: telegramUser.username || `user_${telegramUser.id}`,
          telegramId: telegramUser.id.toString(),
          firstName: telegramUser.first_name || "",
          lastName: telegramUser.last_name || "",
          password: "telegram_auth" // Placeholder for Telegram users
        };
        
        user = await storage.createUser(userData);
      }

      res.json({ user: { id: user.id, username: user.username, telegramId: user.telegramId } });
    } catch (error) {
      console.error("Telegram auth error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });



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

  app.get("/api/characters", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 1;
      const characters = await storage.getCharactersByUserId(userId);
      res.json(characters);
    } catch (error) {
      console.error("Get characters error:", error);
      res.status(500).json({ message: "Failed to get characters" });
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

  // Game state routes
  app.get("/api/game-state", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Get user's characters
      const characters = await storage.getCharactersByUserId(userId);
      
      if (characters.length === 0) {
        return res.json({ 
          character: null,
          location: null,
          playersInLocation: [],
          npcsInLocation: [],
          activeCombats: [],
          isInCombat: false,
          currentCombat: null
        });
      }

      // Use the first character for now
      const character = characters[0];
      
      // Update character's activity timestamp and set online
      await storage.setCharacterOnline(character.id, true);
      await storage.updateCharacter(character.id, { lastActivity: new Date() });
      
      const location = await storage.getLocation(character.currentLocationId);
      const playersInLocation = await storage.getCharactersByLocation(character.currentLocationId);
      const npcsInLocation = await storage.getNPCsByLocation(character.currentLocationId);
      const activeCombats = await storage.getActiveCombatsInLocation(character.currentLocationId);
      const currentCombat = await storage.getCharacterActiveCombat(character.id);
      
      // Get groups information
      const currentGroup = await storage.getCharacterGroup(character.id);
      const allGroups = await storage.getAllGroups();
      const groupApplications = await storage.getGroupApplications(currentGroup?.id || 0);
      
      // Get last completed combat for results
      const lastCompletedCombat = await storage.getCharacterLastCompletedCombat(character.id);
      
      // Get chat messages for current location
      const chatMessages = await storage.getChatMessages(character.currentLocationId);

      const gameState = {
        character,
        location,
        playersInLocation,
        npcsInLocation,
        activeCombats,
        isInCombat: !!currentCombat,
        currentCombat,
        currentGroup,
        allGroups,
        groupApplications,
        lastCompletedCombat,
        chatMessages
      };

      res.json(gameState);
    } catch (error) {
      console.error("Get game state error:", error);
      res.status(500).json({ message: "Failed to get game state" });
    }
  });

  app.get("/api/game-state/:characterId", async (req, res) => {
    try {
      const characterId = parseInt(req.params.characterId);
      const character = await storage.getCharacter(characterId);
      
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      const location = await storage.getLocation(character.currentLocationId);
      const playersInLocation = await storage.getCharactersByLocation(character.currentLocationId);
      const npcsInLocation = await storage.getNPCsByLocation(character.currentLocationId);
      const activeCombats = await storage.getActiveCombatsInLocation(character.currentLocationId);
      const currentCombat = await storage.getCharacterActiveCombat(characterId);

      // Get groups information
      const currentGroup = await storage.getCharacterGroup(characterId);
      const allGroups = await storage.getAllGroups();
      const groupApplications = await storage.getGroupApplications(currentGroup?.id || 0);
      
      // Get last completed combat for results
      const lastCompletedCombat = await storage.getCharacterLastCompletedCombat(characterId);

      const gameState = {
        character,
        location,
        playersInLocation,
        npcsInLocation,
        activeCombats,
        isInCombat: !!currentCombat,
        currentCombat,
        currentGroup,
        allGroups,
        groupApplications,
        lastCompletedCombat
      };

      res.json(gameState);
    } catch (error) {
      console.error("Get game state error:", error);
      res.status(500).json({ message: "Failed to get game state" });
    }
  });

  // NPC routes
  app.get("/api/npcs", async (req, res) => {
    try {
      const npcs = await storage.getAllNPCs();
      res.json({ npcs });
    } catch (error) {
      console.error("Get NPCs error:", error);
      res.status(500).json({ message: "Failed to get NPCs" });
    }
  });

  app.get("/api/npcs/location/:locationId", async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const npcs = await storage.getNPCsByLocation(locationId);
      res.json({ npcs });
    } catch (error) {
      console.error("Get NPCs by location error:", error);
      res.status(500).json({ message: "Failed to get NPCs for location" });
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

  // Chat routes
  app.post("/api/chat/send", async (req, res) => {
    try {
      const { locationId, characterId, message } = req.body;
      
      // Validate inputs
      if (!locationId || !characterId || !message?.trim()) {
        return res.status(400).json({ message: "Invalid chat message data" });
      }

      // Check if character exists and is in the specified location
      const character = await storage.getCharacter(characterId);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      if (character.currentLocationId !== locationId) {
        return res.status(403).json({ message: "Character not in this location" });
      }

      // Create chat message
      const chatMessage = await storage.createChatMessage(locationId, characterId, message.trim());
      
      // Broadcast to all players in the location
      const playersInLocation = await storage.getCharactersByLocation(locationId);
      const updateMessage = {
        type: 'chat_message',
        data: { chatMessage, character: { id: character.id, name: character.name, clan: character.clan } },
        timestamp: new Date().toISOString()
      };

      for (const player of playersInLocation) {
        const client = connectedClients.get(player.id);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(updateMessage));
        }
      }

      res.json({ success: true, chatMessage });
    } catch (error) {
      console.error("Send chat message error:", error);
      res.status(500).json({ message: "Failed to send chat message" });
    }
  });

  // Combat routes
  app.post("/api/combat/start", async (req, res) => {
    try {
      const { characterId, targetId, locationId } = startCombatSchema.parse(req.body);
      const npcId = req.body.npcId; // Only use explicit npcId for NPC combat
      const asGroup = req.body.asGroup || false; // Group attack flag
      
      const character = await storage.getCharacter(characterId);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      if (character.currentLocationId !== locationId) {
        return res.status(400).json({ message: "Character must be in the specified location" });
      }

      // Check if character is already in combat
      const characterCombat = await storage.getCharacterActiveCombat(characterId);
      if (characterCombat) {
        return res.status(400).json({ message: "Character is already in combat" });
      }

      // For all combat types, check if character has at least 2 HP to engage
      if (character.currentHp <= 1) {
        return res.status(400).json({ message: "Cannot start combat with 1 HP! Your character is too weak to fight" });
      }

      let combat;
      let combatType: "pvp" | "pve" = "pve"; // Default to PVE for NPC combat
      let participants: number[] = [characterId];
      let npcParticipants: number[] = [];
      let eventData: any = { combatId: 0, participants: [characterId] };

      if (npcId) {
        // PVE combat with NPC
        const npc = await storage.getNPC(npcId);
        if (!npc) {
          return res.status(404).json({ message: "NPC not found" });
        }

        if (npc.isDead || !npc.spawnsInLocation.includes(locationId)) {
          return res.status(400).json({ message: "NPC is not available in this location" });
        }

        combatType = "pve";
        npcParticipants = [npcId];
        eventData.npcParticipants = [npcId];
        
        // Check if this is a group attack
        if (asGroup) {
          const characterGroup = await storage.getCharacterGroup(characterId);
          if (characterGroup) {
            const groupMembers = await storage.getGroupMembers(characterGroup.id);
            // Add other group members who are in the same location and not in combat
            for (const member of groupMembers) {
              if (member.id !== characterId && 
                  member.currentLocationId === locationId && 
                  member.currentHp > 1) {
                const memberCombat = await storage.getCharacterActiveCombat(member.id);
                if (!memberCombat) {
                  participants.push(member.id);
                }
              }
            }
          }
        }
        
        eventData.participants = participants;
        
        // Create PVE combat
        combat = await storage.createCombat(locationId, participants);
        
        // Update combat with NPC participants
        await storage.updateCombat(combat.id, { 
          type: combatType,
          npcParticipants: npcParticipants
        });
        
        // Auto combat will be started later in the general handler
        
      } else if (targetId) {
        // PVP combat with another character
        combatType = "pvp";
        const target = await storage.getCharacter(targetId);
        if (!target) {
          return res.status(404).json({ message: "Target character not found" });
        }

        if (target.currentLocationId !== locationId) {
          return res.status(400).json({ message: "Target character must be in the same location" });
        }

        // Check if both characters are from different clans (PvP only between enemy clans)
        if (character.clan === target.clan) {
          return res.status(400).json({ message: "Cannot attack clanmates! PvP is only allowed between different tribes" });
        }

        // Check diplomacy status - PvP only allowed during war
        const diplomacyStatus = await storage.getDiplomacyStatus(character.clan, target.clan);
        if (diplomacyStatus !== "war") {
          return res.status(400).json({ message: "Cannot attack during peacetime! Tribes must be at war for PvP combat" });
        }

        // Check if attacker has only 1 HP
        if (character.currentHp <= 1) {
          return res.status(400).json({ message: "Cannot attack with 1 HP! Your character is too weak to fight" });
        }

        // Check if target has only 1 HP
        if (target.currentHp <= 1) {
          return res.status(400).json({ message: "Cannot attack an already defeated character! Target has 1 HP" });
        }

        // Check if target is already in combat
        const targetCombat = await storage.getCharacterActiveCombat(targetId);
        if (targetCombat) {
          return res.status(400).json({ message: "Target character is already in combat" });
        }

        participants = [characterId, targetId];
        eventData.participants = participants;
        
        // Create PVP combat
        combat = await storage.createCombat(locationId, participants);
      } else {
        return res.status(400).json({ message: "Either targetId or npcId must be provided" });
      }

      // Update combat with correct type (if not already updated)
      if (combatType === "pvp") {
        await storage.updateCombat(combat.id, { 
          type: combatType,
          npcParticipants: npcParticipants
        });
      }

      eventData.combatId = combat.id;
      
      // Create combat start event
      await storage.createGameEvent({
        type: "combat_start",
        characterId,
        locationId,
        data: eventData
      });

      // Add initial log entry
      let startMessage = `Начинается бой между игроками!`;
      if (combatType === "pve" && npcId) {
        const npc = await storage.getNPC(npcId);
        startMessage = `${character.name} вступает в бой с ${npc?.name || 'неизвестным существом'}!`;
      } else if (combatType === "pvp" && targetId) {
        const target = await storage.getCharacter(targetId);
        startMessage = `⚔️ Племенная война! ${character.name} (${character.clan === 'thunder' ? 'Грозовое' : 'Речное'} племя) вызывает на бой ${target?.name} (${target?.clan === 'thunder' ? 'Грозовое' : 'Речное'} племя)!`;
      }
        
      await storage.addCombatLogEntry(combat.id, {
        timestamp: new Date().toISOString(),
        type: "join",
        actorId: characterId,
        message: startMessage
      });

      // Start auto-combat
      GameEngine.startAutoCombat(combat.id);
      
      // Send Telegram notifications
      if (telegramBot.isEnabled()) {
        const location = await storage.getLocation(locationId);
        await telegramBot.notifyCombatStart(participants, location?.name || "Unknown");
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

  // Health regeneration routes - temporarily disabled

  app.post("/api/health/use-poultice", async (req, res) => {
    try {
      const { characterId } = req.body;
      
      if (!characterId) {
        return res.status(400).json({ message: "Character ID required" });
      }

      const character = await storage.useHealingPoultice(characterId);
      if (!character) {
        return res.status(400).json({ message: "Cannot use healing poultice here or character not found" });
      }

      res.json({ character });
    } catch (error) {
      console.error("Use healing poultice error:", error);
      res.status(500).json({ message: "Failed to use healing poultice" });
    }
  });

  // Level up endpoints
  app.post("/api/character/change-rank", async (req: Request, res: Response) => {
    try {
      const { targetCharacterId, newRank, requesterId } = req.body;

      if (!requesterId) {
        return res.status(401).json({ error: "Requester ID required" });
      }

      // Get requester character to check permissions
      const requesterCharacter = await storage.getCharactersByUserId(requesterId);
      if (!requesterCharacter.length) {
        return res.status(404).json({ error: "Requester character not found" });
      }

      const requester = requesterCharacter[0];
      const targetCharacter = await storage.getCharacter(targetCharacterId);

      if (!targetCharacter) {
        return res.status(404).json({ error: "Target character not found" });
      }

      // Check if same clan
      if (requester.clan !== targetCharacter.clan) {
        return res.status(403).json({ error: "Can only promote characters from your own clan" });
      }

      // Import RANKS from schema
      const { RANKS } = await import("@shared/schema");
      
      // Check permissions - requester must be able to promote to the new rank
      const requesterRank = RANKS[requester.rank as keyof typeof RANKS];
      const newRankData = RANKS[newRank as keyof typeof RANKS];
      
      // Check if requester can promote to this rank
      const canPromote = requesterRank?.canPromote.includes(newRank) || false;
      
      // Also check if the new rank can be promoted by the requester according to canBePromotedBy
      const canBePromoted = newRankData?.canBePromotedBy?.includes(requester.rank) || false;
      
      // Admin check for special ranks
      const isAdmin = requester.rank === "leader" || requesterRank?.adminOnly === true;
      const canPromoteAsAdmin = isAdmin && newRankData?.canBePromotedBy?.includes("admin");
      
      if (!canPromote && !canBePromoted && !canPromoteAsAdmin) {
        console.log(`Promotion denied: ${requester.rank} cannot promote to ${newRank}. canPromote: ${canPromote}, canBePromoted: ${canBePromoted}, isAdmin: ${isAdmin}`);
        return res.status(403).json({ error: "You don't have permission to assign this rank" });
      }

      // Update character rank
      const updatedCharacter = await storage.updateCharacter(targetCharacterId, { rank: newRank });
      
      if (!updatedCharacter) {
        return res.status(500).json({ error: "Failed to update character rank" });
      }

      // Create game event
      await storage.createGameEvent({
        type: "rank_change",
        message: `${requester.name} назначил ${targetCharacter.name} на должность ${RANKS[newRank as keyof typeof RANKS].name}`,
        locationId: requester.currentLocationId,
        characterId: targetCharacter.id,
      });

      // Broadcast rank change to all players
      await broadcastRankChange(targetCharacterId);

      res.json({ character: updatedCharacter });
    } catch (error) {
      console.error("Error changing character rank:", error);
      res.status(500).json({ error: "Failed to change character rank" });
    }
  });

  app.post("/api/character/promote-kitten", async (req: Request, res: Response) => {
    try {
      const { characterId, newRank, userId } = req.body;
      const requestUserId = userId || (req as AuthenticatedRequest).userId || 1;

      // Get character
      const character = await storage.getCharacter(characterId);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }

      // Check if character belongs to user
      if (character.userId !== requestUserId) {
        console.log(`Promotion failed: character userId ${character.userId} !== request userId ${requestUserId}`);
        return res.status(403).json({ error: "Not your character" });
      }

      // Check if character is a kitten
      if (character.rank !== "kitten") {
        return res.status(400).json({ error: "Only kittens can be promoted through this ceremony" });
      }

      // Check if character is in their clan camp
      const location = await storage.getLocation(character.currentLocationId);
      if (!location || location.clan !== character.clan) {
        return res.status(400).json({ error: "You must be in your clan camp for the promotion ceremony" });
      }

      // Validate new rank (can only become apprentice or healer_apprentice)
      if (newRank !== "apprentice" && newRank !== "healer_apprentice") {
        return res.status(400).json({ error: "Kittens can only become apprentices or healer apprentices" });
      }

      // Update character rank
      const updatedCharacter = await storage.updateCharacter(characterId, { rank: newRank });
      
      if (!updatedCharacter) {
        return res.status(500).json({ error: "Failed to promote character" });
      }

      // Import RANKS from schema
      const { RANKS } = await import("@shared/schema");

      // Create game event
      await storage.createGameEvent({
        type: "rank_change",
        message: `${character.name} был посвящён в ${RANKS[newRank as keyof typeof RANKS].name} старейшиной племени`,
        locationId: character.currentLocationId,
        characterId: character.id,
      });

      res.json({ character: updatedCharacter });
    } catch (error) {
      console.error("Error promoting kitten:", error);
      res.status(500).json({ error: "Failed to promote kitten" });
    }
  });

  app.post("/api/character/apply-level-up", async (req: Request, res: Response) => {
    try {
      const { statBoosts, userId } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }
      
      if (!statBoosts || typeof statBoosts !== 'object') {
        return res.status(400).json({ message: "Invalid stat boosts data" });
      }

      const { strength = 0, agility = 0, intelligence = 0, endurance = 0 } = statBoosts;
      
      // Validate that total points don't exceed 5
      const totalPoints = strength + agility + intelligence + endurance;
      if (totalPoints !== 5 || strength < 0 || agility < 0 || intelligence < 0 || endurance < 0) {
        return res.status(400).json({ message: "Invalid stat distribution" });
      }

      const character = await storage.getCharactersByUserId(userId);
      if (!character.length) {
        return res.status(404).json({ message: "Character not found" });
      }

      const currentChar = character[0];
      const newMaxHp = 100 + ((currentChar.endurance + endurance) * 10);
      
      // Calculate new HP maintaining the same percentage
      const hpPercentage = currentChar.currentHp / currentChar.maxHp;
      const newCurrentHp = Math.max(1, Math.floor(newMaxHp * hpPercentage));

      const updatedCharacter = await storage.updateCharacterStats(currentChar.id, {
        strength: currentChar.strength + strength,
        agility: currentChar.agility + agility,
        intelligence: currentChar.intelligence + intelligence,
        endurance: currentChar.endurance + endurance
      });

      if (!updatedCharacter) {
        return res.status(400).json({ message: "Could not apply level up" });
      }

      // Update current HP if endurance changed and reset unspent stat points
      if (endurance > 0) {
        await storage.updateCharacter(currentChar.id, { 
          currentHp: newCurrentHp,
          maxHp: newMaxHp,
          unspentStatPoints: 0
        });
      } else {
        // Just reset unspent stat points
        await storage.updateCharacter(currentChar.id, { 
          unspentStatPoints: 0
        });
      }

      // Get updated character data
      const finalCharacter = await storage.getCharacter(currentChar.id);
      
      res.json({ character: finalCharacter });
    } catch (error) {
      console.error("Apply level up error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Game state routes
  app.get("/api/game-state", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      console.log(`\n\n=== CRITICAL: Game state request for user ${userId} ===`);
      console.log(`=== ABOUT TO CHECK LEVEL UPS ===`);
      
      // Get user's character
      const characters = await storage.getCharactersByUserId(userId);
      if (!characters || characters.length === 0) {
        return res.status(404).json({ message: "No character found for user" });
      }
      
      let character = characters[0];

      // Auto level up check (critical for game progression)
      const expectedLevel = Math.floor(character.experience / 1000) + 1;
      console.log(`[AUTO-LEVEL] ${character.name}: Level ${character.level}, Exp ${character.experience}, Expected ${expectedLevel}`);
      
      if (expectedLevel > character.level) {
        const levelsGained = expectedLevel - character.level;
        const statPointsGained = levelsGained * 5;
        
        console.log(`[AUTO-LEVEL] UPGRADING ${character.name}: ${character.level} -> ${expectedLevel} (+${statPointsGained} stat points)`);
        
        // Direct database update for immediate effect
        await storage.updateCharacter(character.id, {
          level: expectedLevel,
          unspentStatPoints: character.unspentStatPoints + statPointsGained
        });
        
        // Refresh character data
        const updatedCharacter = await storage.getCharacter(character.id);
        if (updatedCharacter) {
          character = updatedCharacter;
          console.log(`[AUTO-LEVEL] SUCCESS: ${character.name} is now level ${character.level} with ${character.unspentStatPoints} stat points`);
        }
      }
      
      // Health regeneration temporarily disabled

      const npcsInLocation = await storage.getNPCsByLocation(character.currentLocationId);
      const location = await storage.getLocation(character.currentLocationId);
      const playersInLocation = await storage.getCharactersByLocation(character.currentLocationId);
      const activeCombats = await storage.getActiveCombatsInLocation(character.currentLocationId);
      const currentCombat = await storage.getCharacterActiveCombat(character.id);
      
      const currentGroup = await storage.getCharacterGroup(character.id);
      const allGroups = await storage.getAllGroups();
      const groupApplications = await storage.getGroupApplications(currentGroup?.id || 0);

      console.log(`Game state for character ${character.id}: isInCombat=${!!currentCombat}, combatId=${currentCombat?.id}`);
      console.log(`Current group for character ${character.id}:`, currentGroup);
      console.log(`All groups:`, allGroups.length);
      console.log(`Active combats in location ${character.currentLocationId}:`, activeCombats.length);

      // Get last completed combat for results
      const lastCombat = await storage.getCharacterLastCompletedCombat(character.id);
      if (lastCombat) {
        console.log(`Last completed combat for character ${character.id}:`, lastCombat.id, lastCombat.status, 'finished at:', lastCombat.finishedAt);
      } else {
        console.log(`No completed combat found for character ${character.id}`);
      }
      
      // Get chat messages for current location
      const chatMessages = await storage.getChatMessages(character.currentLocationId, 50);
      
      res.json({
        character,
        location,
        playersInLocation,
        npcsInLocation,
        activeCombats,
        isInCombat: !!currentCombat,
        currentCombat,
        currentGroup,
        allGroups,
        groupApplications,
        lastCompletedCombat: lastCombat,
        chatMessages
      });
    } catch (error) {
      console.error("Get game state error:", error);
      res.status(500).json({ message: "Failed to get game state" });
    }
  });

  // Clear combat results endpoint
  app.post("/api/combat/clear-results", async (req, res) => {
    try {
      const { characterId } = req.body;
      
      if (!characterId) {
        return res.status(400).json({ message: "Character ID is required" });
      }
      
      // In our memory storage, we can implement clearing by 
      // marking the combat as "processed" or removing it from results
      // For now, we'll just return success - the frontend will handle state
      console.log(`Clearing combat results for character ${characterId}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Clear combat results error:", error);
      res.status(500).json({ message: "Failed to clear combat results" });
    }
  });

  // Test promotion endpoint
  app.post("/api/test-promotion", async (req, res) => {
    try {
      const { RANKS } = await import("@shared/schema");
      
      console.log("=== TESTING PROMOTION PERMISSIONS ===");
      
      // Test cases
      const testCases = [
        { from: "senior_healer", to: "healer", should: true },
        { from: "senior_healer", to: "healer_apprentice", should: true },
        { from: "senior_warrior", to: "warrior", should: true },
        { from: "senior_warrior", to: "apprentice", should: true },
        { from: "healer", to: "healer_apprentice", should: true },
        { from: "warrior", to: "apprentice", should: false },
      ];
      
      const results = testCases.map(test => {
        const fromRank = RANKS[test.from as keyof typeof RANKS];
        const toRankData = RANKS[test.to as keyof typeof RANKS];
        
        const canPromote = fromRank?.canPromote.includes(test.to) || false;
        const canBePromoted = toRankData?.canBePromotedBy?.includes(test.from) || false;
        
        const actualResult = canPromote || canBePromoted;
        const passed = actualResult === test.should;
        
        console.log(`${test.from} -> ${test.to}: canPromote=${canPromote}, canBePromoted=${canBePromoted}, result=${actualResult}, expected=${test.should}, PASSED=${passed}`);
        
        return {
          ...test,
          canPromote,
          canBePromoted,
          actualResult,
          passed
        };
      });
      
      res.json({ results });
    } catch (error) {
      console.error("Test promotion error:", error);
      res.status(500).json({ message: "Test failed", error: error.message });
    }
  });

  // Test level up endpoint
  app.post("/api/test-level-up", async (req, res) => {
    try {
      const { characterId } = req.body;
      const GameEngine = (await import("./services/gameEngine")).GameEngine;
      
      console.log("=== TESTING LEVEL UP ===");
      const character = await storage.getCharacter(characterId || 1);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }
      
      console.log(`Character ${character.name}: level=${character.level}, exp=${character.experience}`);
      const requiredExp = GameEngine.getRequiredExperienceForLevel(character.level + 1);
      console.log(`Required exp for next level: ${requiredExp}`);
      console.log(`Exp check: ${character.experience} >= ${requiredExp} = ${character.experience >= requiredExp}`);
      
      const leveledUp = await GameEngine.checkAndProcessLevelUp(character.id);
      console.log(`Level up result: ${leveledUp}`);
      
      const updatedCharacter = await storage.getCharacter(character.id);
      console.log(`Updated character: level=${updatedCharacter?.level}, exp=${updatedCharacter?.experience}`);
      
      res.json({ 
        originalCharacter: character,
        updatedCharacter,
        leveledUp,
        requiredExp
      });
    } catch (error) {
      console.error("Test level up error:", error);
      res.status(500).json({ message: "Test failed", error: error.message });
    }
  });

  // Admin authentication middleware
  const adminAuth = (req: Request, res: Response, next: Function) => {
    // Check for web-based admin access with simple password
    const adminPassword = req.headers['x-admin-password'];
    if (adminPassword === "3138") {
      return next();
    }

    // Check for Telegram bot authentication
    const telegramUserId = req.headers['x-telegram-user-id'];
    if (telegramUserId) {
      import("./services/adminBot").then(({ adminBot }) => {
        if (adminBot.isAuthenticated(Number(telegramUserId))) {
          return next();
        }
        return res.status(401).json({ message: "Admin access denied - not authenticated via bot" });
      }).catch(() => {
        return res.status(500).json({ message: "Admin authentication error" });
      });
      return;
    }

    return res.status(401).json({ message: "Admin access denied - no valid authentication" });
  };

  // Admin routes
  app.get("/api/admin/characters", adminAuth, async (req, res) => {
    try {
      // Direct database query for all characters
      const { db } = await import("./db");
      const { characters } = await import("@shared/schema");
      
      const allCharacters = await db.select().from(characters);
      console.log(`Admin panel: Found ${allCharacters.length} characters in database`);
      
      res.json(allCharacters);
    } catch (error) {
      console.error("Get all characters error:", error);
      res.status(500).json({ message: "Failed to get characters" });
    }
  });

  app.get("/api/admin/users", adminAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.patch("/api/admin/characters/:id", adminAuth, async (req, res) => {
    try {
      const characterId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedCharacter = await storage.updateCharacter(characterId, updates);
      if (!updatedCharacter) {
        return res.status(404).json({ message: "Character not found" });
      }
      
      res.json(updatedCharacter);
    } catch (error) {
      console.error("Update character error:", error);
      res.status(500).json({ message: "Failed to update character" });
    }
  });

  app.patch("/api/admin/locations/:id", adminAuth, async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const updates = req.body;
      console.log(`Admin updating location ${locationId} with:`, updates);
      
      const updatedLocation = await storage.updateLocation(locationId, updates);
      if (!updatedLocation) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      res.json(updatedLocation);
    } catch (error) {
      console.error("Update location error:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.patch("/api/admin/npcs/:id", adminAuth, async (req, res) => {
    try {
      const npcId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedNPC = await storage.updateNPC(npcId, updates);
      if (!updatedNPC) {
        return res.status(404).json({ message: "NPC not found" });
      }
      
      res.json(updatedNPC);
    } catch (error) {
      console.error("Update NPC error:", error);
      res.status(500).json({ message: "Failed to update NPC" });
    }
  });

  app.post("/api/admin/npcs/:id/respawn", adminAuth, async (req, res) => {
    try {
      const npcId = parseInt(req.params.id);
      
      const respawnedNPC = await storage.respawnNPC(npcId);
      if (!respawnedNPC) {
        return res.status(404).json({ message: "NPC not found" });
      }
      
      res.json(respawnedNPC);
    } catch (error) {
      console.error("Respawn NPC error:", error);
      res.status(500).json({ message: "Failed to respawn NPC" });
    }
  });

  // Admin location management endpoints
  app.post("/api/admin/locations", adminAuth, async (req, res) => {
    try {
      const locationData = req.body;
      console.log("Creating location with data:", locationData);
      
      const location = await storage.createLocation(locationData);
      res.json(location);
    } catch (error) {
      console.error("Create location error:", error);
      res.status(500).json({ message: "Failed to create location" });
    }
  });

  app.delete("/api/admin/locations/:id", adminAuth, async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      console.log(`Deleting location ${locationId}`);
      
      // In memory storage, we need to remove from the map
      // For now, we'll just return success as the actual deletion
      // logic would need to be implemented in storage
      res.json({ success: true, message: "Location deletion not fully implemented in memory storage" });
    } catch (error) {
      console.error("Delete location error:", error);
      res.status(500).json({ message: "Failed to delete location" });
    }
  });

  // Group routes
  app.post("/api/groups", async (req, res) => {
    try {
      const { name, characterId } = req.body;
      
      if (!characterId) {
        return res.status(401).json({ message: "Character ID required" });
      }

      const character = await storage.getCharacter(characterId);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      // Check if character is already in a group
      const existingGroup = await storage.getCharacterGroup(characterId);
      if (existingGroup) {
        return res.status(400).json({ message: "Already in a group" });
      }

      const group = await storage.createGroup(name, characterId);
      res.json(group);
    } catch (error) {
      console.error("Create group error:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  app.post("/api/groups/:id/join", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const { characterId } = req.body;
      
      if (!characterId) {
        return res.status(401).json({ message: "Character ID required" });
      }

      const member = await storage.joinGroup(groupId, characterId);
      if (!member) {
        return res.status(400).json({ message: "Cannot join group" });
      }

      res.json(member);
    } catch (error) {
      console.error("Join group error:", error);
      res.status(500).json({ message: "Failed to join group" });
    }
  });

  app.post("/api/groups/leave", async (req, res) => {
    try {
      const { characterId } = req.body;
      
      if (!characterId) {
        return res.status(401).json({ message: "Character ID required" });
      }

      await storage.leaveGroup(characterId);
      res.json({ success: true });
    } catch (error) {
      console.error("Leave group error:", error);
      res.status(500).json({ message: "Failed to leave group" });
    }
  });

  app.get("/api/groups/:id/members", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const members = await storage.getGroupMembers(groupId);
      
      // Enrich members with location data
      const enrichedMembers = await Promise.all(
        members.map(async (member) => {
          const location = await storage.getLocation(member.currentLocationId);
          return {
            ...member,
            location: location ? { id: location.id, name: location.name, emoji: location.emoji } : null
          };
        })
      );
      
      res.json(enrichedMembers);
    } catch (error) {
      console.error("Get group members error:", error);
      res.status(500).json({ message: "Failed to get group members" });
    }
  });

  app.post("/api/groups/:id/kick", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const { characterId, targetCharacterId } = req.body;
      
      if (!characterId || !targetCharacterId) {
        return res.status(400).json({ message: "Character ID and target character ID required" });
      }

      // Check if requester is the group leader
      const group = await storage.getGroup(groupId);
      if (!group || group.leaderId !== characterId) {
        return res.status(403).json({ message: "Only group leader can kick members" });
      }

      // Cannot kick yourself
      if (characterId === targetCharacterId) {
        return res.status(400).json({ message: "Cannot kick yourself from the group" });
      }

      // Remove the target character from the group
      await storage.leaveGroup(targetCharacterId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Kick from group error:", error);
      res.status(500).json({ message: "Failed to kick member from group" });
    }
  });

  // Apply to join a group (creates an application)
  app.post("/api/groups/:id/apply", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const { characterId, message } = req.body;
      
      if (!characterId) {
        return res.status(401).json({ message: "Character ID required" });
      }

      // Check if character is already in a group
      const existingGroup = await storage.getCharacterGroup(characterId);
      if (existingGroup) {
        return res.status(400).json({ message: "Already in a group" });
      }

      // Check if character already has a pending application to this group
      const existingApplication = await storage.hasExistingApplication(groupId, characterId);
      if (existingApplication) {
        return res.status(400).json({ message: "Already applied to this group" });
      }

      const application = await storage.createGroupApplication(groupId, characterId, message);
      res.json(application);
    } catch (error) {
      console.error("Apply to group error:", error);
      res.status(500).json({ message: "Failed to apply to group" });
    }
  });

  // Get applications for a group (for leaders)
  app.get("/api/groups/:id/applications", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const applications = await storage.getGroupApplicationsWithCharacterNames(groupId);
      res.json(applications);
    } catch (error) {
      console.error("Get group applications error:", error);
      res.status(500).json({ message: "Failed to get group applications" });
    }
  });

  // Respond to group application (accept/reject)
  app.post("/api/groups/applications/:id/respond", async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const { response } = req.body; // "accepted" or "rejected"
      
      const application = await storage.respondToGroupApplication(applicationId, response);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      res.json(application);
    } catch (error) {
      console.error("Respond to application error:", error);
      res.status(500).json({ message: "Failed to respond to application" });
    }
  });

  // Admin endpoint to force delete a group
  app.delete("/api/admin/groups/:id", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      await storage.disbandGroup(groupId);
      res.json({ message: "Group deleted successfully" });
    } catch (error) {
      console.error("Delete group error:", error);
      res.status(500).json({ message: "Failed to delete group" });
    }
  });

  // Admin endpoint to force end all active combats
  app.post("/api/admin/force-end-combats", async (req, res) => {
    try {
      console.log("Force ending all active combats...");
      
      // Get all active combats and force end them
      const allCombats = await storage.getAllActiveCombats();
      console.log(`Found ${allCombats.length} active combats to end`);
      
      for (const combat of allCombats) {
        console.log(`Force ending combat ${combat.id}`);
        await storage.finishCombat(combat.id);
      }
      
      res.json({ 
        message: "All active combats ended successfully", 
        endedCombats: allCombats.length 
      });
    } catch (error) {
      console.error("Force end combats error:", error);
      res.status(500).json({ message: "Failed to end combats" });
    }
  });

  app.get("/api/tribe-members/:clan", async (req: Request, res: Response) => {
    try {
      const { clan } = req.params;
      
      if (!["thunder", "river"].includes(clan)) {
        return res.status(400).json({ error: "Недопустимое племя" });
      }

      // Get all characters from the specified clan (both online and offline for complete roster)
      const allUsers = await storage.getAllUsers();
      const allCharacters: Character[] = [];
      
      for (const user of allUsers) {
        const userCharacters = await storage.getCharactersByUserId(user.id);
        allCharacters.push(...userCharacters);
      }
      
      const tribeMembers = allCharacters.filter(char => char.clan === clan);

      // Sort by rank hierarchy (leaders first, then deputies, etc.)
      const rankOrder = ["leader", "deputy", "senior_healer", "healer", "healer_apprentice", "senior_warrior", "warrior", "apprentice", "kitten"];
      
      tribeMembers.sort((a, b) => {
        const aRankIndex = rankOrder.indexOf(a.rank);
        const bRankIndex = rankOrder.indexOf(b.rank);
        
        if (aRankIndex !== bRankIndex) {
          return aRankIndex - bRankIndex;
        }
        
        // If same rank, sort by level (higher first)
        return b.level - a.level;
      });

      res.json({ tribeMembers });
    } catch (error) {
      console.error("Error getting tribe members:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Diplomacy endpoints
  app.get("/api/diplomacy", async (req: Request, res: Response) => {
    try {
      const relations = await storage.getAllDiplomacyRelations();
      res.json({ relations });
    } catch (error) {
      console.error("Get diplomacy relations error:", error);
      res.status(500).json({ message: "Failed to get diplomacy relations" });
    }
  });

  app.post("/api/diplomacy/change", async (req: Request, res: Response) => {
    try {
      const { changeDiplomacySchema } = await import("@shared/schema");
      const { fromClan, toClan, status } = changeDiplomacySchema.parse(req.body);
      const userId = (req as AuthenticatedRequest).userId || 1;

      console.log("Diplomacy change request:", { fromClan, toClan, status, userId });

      // Get user's character
      const characters = await storage.getCharactersByUserId(userId);
      if (!characters.length) {
        return res.status(404).json({ message: "Character not found" });
      }

      const character = characters[0];
      console.log("Character for diplomacy:", { id: character.id, name: character.name, rank: character.rank, clan: character.clan });

      // Only leaders can change diplomacy
      if (character.rank !== "leader") {
        return res.status(403).json({ message: "Only leaders can change diplomacy" });
      }

      // Check if changing diplomacy of own clan
      if (character.clan !== fromClan) {
        return res.status(403).json({ message: "You can only change diplomacy for your own clan" });
      }

      // For peace proposals, create a proposal instead of direct change
      if (status === "peace") {
        const currentStatus = await storage.getDiplomacyStatus(fromClan, toClan);
        if (currentStatus === "war") {
          // Create peace proposal
          await storage.createDiplomacyProposal(fromClan, toClan, status, character.id, "Предложение мира");
          
          await storage.createGameEvent({
            type: "diplomacy_proposal",
            message: `${character.name} предложил мир с ${toClan === "thunder" ? "Грозовым" : "Речным"} племенем`,
            locationId: character.currentLocationId,
            characterId: character.id,
          });

          return res.json({ success: true, type: "proposal" });
        }
      }

      // Direct change for war declaration
      await storage.changeDiplomacyStatus(fromClan, toClan, status, character.id);

      // Create game event
      await storage.createGameEvent({
        type: "diplomacy_change",
        message: `${character.name} ${status === "war" ? "объявил войну" : "заключил мир"} с ${toClan === "thunder" ? "Грозовым" : "Речным"} племенем`,
        locationId: character.currentLocationId,
        characterId: character.id,
      });

      // Broadcast diplomacy change to all connected players
      await broadcastDiplomacyUpdate(
        await storage.getAllDiplomacyRelations(),
        `${character.name} ${status === "war" ? "объявил войну" : "заключил мир"} с ${toClan === "thunder" ? "Грозовым" : "Речным"} племенем`
      );

      res.json({ success: true, type: "direct" });
    } catch (error) {
      console.error("Change diplomacy error:", error);
      res.status(500).json({ message: "Failed to change diplomacy" });
    }
  });

  app.get("/api/diplomacy/proposals", async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).userId || 1;

      console.log("Getting diplomacy proposals for userId:", userId);

      // Get user's character
      const characters = await storage.getCharactersByUserId(userId);
      if (!characters.length) {
        return res.status(404).json({ message: "Character not found" });
      }

      const character = characters[0];
      console.log("Character for proposals:", { id: character.id, name: character.name, rank: character.rank, clan: character.clan });

      // Only leaders can see proposals
      if (character.rank !== "leader") {
        console.log("403: Character is not a leader:", character.rank);
        return res.status(403).json({ message: "Only leaders can view diplomacy proposals" });
      }

      const proposals = await storage.getDiplomacyProposals(character.clan);
      console.log("Found proposals for clan", character.clan, ":", proposals.length);
      res.json({ proposals });
    } catch (error) {
      console.error("Get diplomacy proposals error:", error);
      res.status(500).json({ message: "Failed to get diplomacy proposals" });
    }
  });

  app.post("/api/diplomacy/respond", async (req: Request, res: Response) => {
    try {
      const { respondToProposalSchema } = await import("@shared/schema");
      const { proposalId, response } = respondToProposalSchema.parse(req.body);
      const userId = (req as AuthenticatedRequest).userId || 1;

      // Get user's character
      const characters = await storage.getCharactersByUserId(userId);
      if (!characters.length) {
        return res.status(404).json({ message: "Character not found" });
      }

      const character = characters[0];

      // Only leaders can respond to proposals
      if (character.rank !== "leader") {
        return res.status(403).json({ message: "Only leaders can respond to diplomacy proposals" });
      }

      await storage.respondToProposal(proposalId, response, character.id);

      // Create game event
      await storage.createGameEvent({
        type: "diplomacy_response",
        message: `${character.name} ${response === "accepted" ? "принял" : "отклонил"} предложение мира`,
        locationId: character.currentLocationId,
        characterId: character.id,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Respond to diplomacy proposal error:", error);
      res.status(500).json({ message: "Failed to respond to proposal" });
    }
  });

  // Territory Warfare API
  app.get("/api/territory/influence/:clan", async (req: Request, res: Response) => {
    try {
      const { clan } = req.params;
      if (clan !== "thunder" && clan !== "river") {
        return res.status(400).json({ message: "Invalid clan" });
      }
      
      const influence = await storage.getClanInfluence(clan);
      
      // Process daily influence gain
      const updatedInfluence = await storage.processDailyInfluenceGain(clan);
      
      res.json(updatedInfluence);
    } catch (error) {
      console.error("Get clan influence error:", error);
      res.status(500).json({ message: "Failed to get clan influence" });
    }
  });

  app.post("/api/territory/declare-battle", async (req: Request, res: Response) => {
    try {
      const { locationId } = req.body;
      const userId = (req as AuthenticatedRequest).userId || 1;

      // Use character ID directly from authenticated users
      let characterId = 22; // Default admin character
      if (userId === 1) characterId = 17; // Кисяо
      if (userId === 3) characterId = 22; // Админ
      
      const character = await storage.getCharacter(characterId);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      // Check if character can declare battles (leader or deputy)
      if (character.rank !== "leader" && character.rank !== "deputy") {
        return res.status(403).json({ message: "Only leaders and deputies can declare territory battles" });
      }

      // CRITICAL: Character must be in the location they want to capture
      if (character.currentLocationId !== locationId) {
        return res.status(400).json({ message: "You must be in the location to capture it" });
      }

      // Import LOCATIONS_DATA
      const { LOCATIONS_DATA } = await import("@shared/schema");
      
      // Check location exists and is not a camp
      const location = LOCATIONS_DATA.find(loc => loc.id === locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      if (location.type === "camp") {
        return res.status(400).json({ message: "Cannot attack clan camps" });
      }

      // Get current ownership
      const ownership = await storage.getTerritoryOwnership(locationId);
      
      // Check if location is neutral (auto-capture)
      if (!ownership) {
        // Check influence points before capture
        const influence = await storage.getClanInfluence(character.clan);
        if (!influence || influence.influencePoints < 1) {
          return res.status(400).json({ message: "Need at least 1 influence point to capture territory" });
        }
        
        // Spend influence point for capture
        await storage.updateClanInfluence(character.clan, influence.influencePoints - 1);
        
        const captured = await storage.captureTerritoryAutomatically(locationId, character.clan, character.id);
        
        await storage.createGameEvent({
          type: "territory_captured",
          message: `${character.name} захватил нейтральную территорию ${location.name}`,
          locationId,
          characterId: character.id,
        });

        // Broadcast territory capture to all players
        broadcastToAll({
          type: 'territory_captured',
          territory: captured,
          location: location.name,
          capturedBy: character.name,
          clan: character.clan
        });

        return res.json({ success: true, type: "auto_capture", ownership: captured });
      }

      // Check if it's already owned by the same clan
      if (ownership.ownerClan === character.clan) {
        return res.status(400).json({ message: "Your clan already controls this territory" });
      }

      // Check diplomacy status
      const diplomacyStatus = await storage.getDiplomacyStatus(character.clan, ownership.ownerClan);
      if (diplomacyStatus !== "war") {
        return res.status(400).json({ message: "Cannot attack territories of clans you are not at war with" });
      }

      // Check influence points
      const influence = await storage.getClanInfluence(character.clan);
      if (!influence || influence.influencePoints < 1) {
        return res.status(400).json({ message: "Need at least 1 influence point to declare battle" });
      }

      // Spend influence point
      await storage.updateClanInfluence(character.clan, influence.influencePoints - 1);

      // Create battle
      const battle = await storage.declareTerritoryBattle(locationId, character.clan, character.id);

      await storage.createGameEvent({
        type: "territory_battle_declared",
        message: `${character.name} объявил битву за территорию ${location.name}! Битва начнется через 5 минут.`,
        locationId,
        characterId: character.id,
      });

      // Broadcast to all players
      broadcastToAll({
        type: 'territory_battle_declared',
        battle,
        location: location.name,
        declaredBy: character.name
      });

      res.json({ success: true, battle });
    } catch (error) {
      console.error("Declare territory battle error:", error);
      res.status(500).json({ message: "Failed to declare territory battle" });
    }
  });

  app.get("/api/territory/battles", async (req: Request, res: Response) => {
    try {
      // Process battle state transitions
      const startedBattles = await storage.startActiveBattles();
      const completedBattles = await storage.processTerritoryBattleResults();
      
      // Broadcast battle updates if any battles changed state
      for (const battle of startedBattles) {
        broadcastToAll({
          type: 'territory_battle_started',
          battle,
          message: `Битва за территорию началась!`
        });
      }
      
      for (const battle of completedBattles) {
        broadcastToAll({
          type: 'territory_battle_completed',
          battle,
          message: `Битва завершена! Победил: ${battle.winner}`
        });
      }
      
      const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
      const battles = await storage.getAllActiveBattles();
      const filteredBattles = locationId ? battles.filter(b => b.locationId === locationId) : battles;
      
      // Add location and character info
      const { LOCATIONS_DATA } = await import("@shared/schema");
      const battlesWithInfo = await Promise.all(filteredBattles.map(async (battle) => {
        const location = LOCATIONS_DATA.find(loc => loc.id === battle.locationId);
        const declaredByChar = await storage.getCharacter(battle.declaredBy);
        
        return {
          ...battle,
          locationName: location?.name || 'Unknown',
          declaredByName: declaredByChar?.name || 'Unknown'
        };
      }));
      
      res.json({ battles: battlesWithInfo });
    } catch (error) {
      console.error("Get territory battles error:", error);
      res.status(500).json({ message: "Failed to get territory battles" });
    }
  });

  app.get("/api/territory/battle-participants/:battleId", async (req: Request, res: Response) => {
    try {
      const battleId = parseInt(req.params.battleId);
      const battle = await storage.getTerritoryBattle(battleId);
      
      if (!battle) {
        return res.status(404).json({ message: "Battle not found" });
      }
      
      const participantIds = JSON.parse(battle.participants);
      const participants = [];
      for (const id of participantIds) {
        const character = await storage.getCharacter(id);
        if (character) {
          participants.push({
            id: character.id,
            name: character.name,
            clan: character.clan,
            level: character.level,
            currentHp: character.currentHp,
            maxHp: character.maxHp,
            gender: character.gender
          });
        }
      }
      
      // Group by clan
      const attackingParticipants = participants.filter(p => p.clan === battle.attackingClan);
      const defendingParticipants = participants.filter(p => p.clan === battle.defendingClan);
      
      res.json({
        attacking: attackingParticipants,
        defending: defendingParticipants,
        total: participants.length
      });
    } catch (error) {
      console.error("Get battle participants error:", error);
      res.status(500).json({ message: "Failed to get battle participants" });
    }
  });

  app.post("/api/territory/join-battle", async (req: Request, res: Response) => {
    try {
      const { joinTerritoryBattleSchema } = await import("@shared/schema");
      const { battleId, characterId } = joinTerritoryBattleSchema.parse(req.body);
      const userId = (req as AuthenticatedRequest).userId || 1;

      const character = await storage.getCharacter(characterId);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      if (character.userId !== userId) {
        return res.status(403).json({ message: "Not your character" });
      }

      const battle = await storage.getTerritoryBattle(battleId);
      if (!battle) {
        return res.status(404).json({ message: "Battle not found" });
      }

      // Check if character's clan is involved in the battle
      if (character.clan !== battle.attackingClan && character.clan !== battle.defendingClan) {
        return res.status(403).json({ message: "Your clan is not involved in this battle" });
      }

      const updatedBattle = await storage.joinTerritoryBattle(battleId, characterId);
      
      // Broadcast update
      broadcastToAll({
        type: 'territory_battle_joined',
        battle: updatedBattle,
        characterName: character.name
      });

      res.json({ success: true, battle: updatedBattle });
    } catch (error) {
      console.error("Join territory battle error:", error);
      res.status(500).json({ message: "Failed to join territory battle" });
    }
  });

  app.get("/api/territory/battle-participants/:battleId", async (req: Request, res: Response) => {
    try {
      const battleId = parseInt(req.params.battleId);
      const battle = await storage.getTerritoryBattle(battleId);
      
      if (!battle) {
        return res.status(404).json({ message: "Battle not found" });
      }

      const attackingParticipants = [];
      const defendingParticipants = [];

      for (const participantId of battle.participants) {
        const character = await storage.getCharacter(participantId);
        if (character) {
          if (character.clan === battle.attackingClan) {
            attackingParticipants.push(character);
          } else if (character.clan === battle.defendingClan) {
            defendingParticipants.push(character);
          }
        }
      }

      res.json({
        attacking: attackingParticipants,
        defending: defendingParticipants,
        total: battle.participants.length
      });
    } catch (error) {
      console.error("Get battle participants error:", error);
      res.status(500).json({ message: "Failed to get battle participants" });
    }
  });

  app.get("/api/territory/ownership", async (req: Request, res: Response) => {
    try {
      // Get all territory ownerships
      const { LOCATIONS_DATA } = await import("@shared/schema");
      const allOwnerships: TerritoryOwnership[] = [];
      for (const location of LOCATIONS_DATA) {
        if (location.type !== "camp") { // Skip clan camps
          const ownership = await storage.getTerritoryOwnership(location.id);
          if (ownership) {
            allOwnerships.push(ownership);
          }
        }
      }
      
      res.json({ territories: allOwnerships });
    } catch (error) {
      console.error("Get territory ownership error:", error);
      res.status(500).json({ message: "Failed to get territory ownership" });
    }
  });

  // Legacy endpoint stub - redirect to correct endpoint
  app.post("/api/combat/attack-npc", async (req, res) => {
    res.status(400).json({ 
      message: "This endpoint is deprecated. Use /api/combat/start instead.",
      redirectTo: "/api/combat/start"
    });
  });

  return httpServer;
}


# Клыки и Клятвы - Multiplayer Role-Playing Game

## Overview

Клыки и Клятвы is a real-time multiplayer role-playing game built with a React frontend and Express backend. Players create warrior cats from different clans and engage in turn-based combat across various locations. The game features clan-based gameplay, character progression, real-time communication through WebSockets, and optional Telegram bot integration.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Platform**: Telegram Web App (TWA) integrated into Telegram bot
- **UI Library**: Radix UI components with shadcn/ui styling optimized for mobile
- **Styling**: Tailwind CSS with Telegram-native colors and responsive design
- **State Management**: TanStack React Query for server state and React hooks for local state
- **Routing**: Wouter for lightweight client-side routing within TWA
- **Real-time**: WebSocket client for live game updates
- **Telegram Integration**: @twa-dev/sdk for native Telegram features

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: In-memory storage with optional PostgreSQL migration path
- **Real-time**: WebSocket server for bidirectional communication
- **Telegram Integration**: 
  - Bot commands for basic interaction
  - Web App serving for full game interface
  - Telegram authentication and user management

### Database Architecture
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema**: Type-safe database definitions with auto-generated TypeScript types
- **Tables**: Users, Characters, Locations, Combats, Game Events
- **Migrations**: Managed through Drizzle Kit

## Key Components

### Game Engine (`server/services/gameEngine.ts`)
- Calculates derived character statistics (damage, dodge chance, block chance, critical hit chance)
- Processes turn-based combat mechanics
- Handles combat resolution and character interactions
- Implements game balance through stat calculations

### Storage Layer (`server/storage.ts`)
- Abstract interface for data persistence operations
- Character management (creation, updates, movement, online status)
- Combat system (creation, participant management, logging)
- Location and user management
- Supports both in-memory and database implementations

### WebSocket Communication
- Real-time game state synchronization
- Character authentication and connection management
- Combat updates and notifications
- Automatic reconnection handling with exponential backoff

### Telegram Bot Integration (`server/services/telegramBot.ts`)
- Optional external communication channel
- User account linking and management
- Game notifications and updates
- Graceful degradation when bot token is unavailable

## Data Flow

1. **Authentication**: Users authenticate through HTTP endpoints, with optional Telegram integration
2. **Character Management**: Players create and manage characters through REST API
3. **Game State**: Real-time updates flow through WebSocket connections
4. **Combat System**: Turn-based combat processed server-side with client notifications
5. **Location Movement**: Character position updates synchronized across all connected clients

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **ws**: WebSocket implementation for real-time communication

### UI Dependencies
- **@radix-ui/react-***: Headless UI components for accessibility
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe CSS class variations

### Development Dependencies
- **vite**: Build tool and development server
- **tsx**: TypeScript execution for development
- **esbuild**: Production bundling for server code

## Deployment Strategy

### Development Environment
- Vite development server with HMR for frontend
- tsx for TypeScript execution in development
- Concurrent client and server development with proxy setup

### Production Build
- Frontend: Vite builds to `dist/public` directory
- Backend: esbuild bundles server code to `dist/index.js`
- Static file serving through Express in production

### Database Management
- Environment-based database URL configuration
- Drizzle migrations with `db:push` command
- PostgreSQL connection with serverless support

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `TELEGRAM_BOT_TOKEN`: Optional Telegram bot integration
- `NODE_ENV`: Environment configuration

## Changelog
- July 01, 2025. Initial setup
- July 03, 2025. Mobile interface optimization:
  * Removed duplicate content between Profile and Overview tabs
  * Eliminated duplicate navigation buttons at bottom
  * Optimized map interface for mobile devices with smaller touch targets
  * Added mobile-specific CSS optimizations for better touch interactions
  * Simplified navigation to single top tab bar with responsive design
- July 07, 2025. Character creation flow fixes:
  * Fixed infinite request loops that caused constant server restarts
  * Resolved character creation navigation issue where users were redirected back to creation screen
  * Implemented proper cache invalidation after character creation
  * Restored mobile-optimized interface with bottom navigation tabs
  * Fixed touch targets and mobile responsiveness for better user experience
  * Reorganized UI: moved character info to Profile tab, location info to Overview tab
  * Added automatic tab switching to Combat when battle starts
  * Fixed NPC spawning and combat system errors
- July 07, 2025. Database integration and NPC fix:
  * Added PostgreSQL database for persistent character storage
  * Implemented DatabaseStorage class for character management
  * Fixed NPC disappearing issue after database integration
  * Characters now persist between sessions and are linked to Telegram accounts
  * Combat system remains in-memory for fast real-time performance
- July 07, 2025. NPC respawn system and combat fixes:
  * Fixed NPC status display from "побежден" to proper live/dead status
  * Implemented automatic NPC respawn system with configurable timers (2-10 minutes)
  * Added real-time countdown display for dead NPCs showing "Возродится через X:XX"
  * Fixed combat system compatibility with new isDead field schema
  * Corrected API calls to use npcId parameter for NPC combat initiation
  * Combat system now fully functional with automatic turn-based mechanics
- July 07, 2025. Complete admin panel implementation:
  * Created comprehensive admin panel accessible at /admin route
  * Added character management with full parameter editing (name, clan, stats, health, position)
  * Implemented location editing with coordinate and connection management
  * Added NPC control system with parameter editing and forced respawn
  * Created user management interface for viewing all registered users
  * All admin functions fully integrated with database and real-time updates
- July 07, 2025. Health regeneration system and healing mechanics:
  * Implemented automatic health regeneration at 1 HP per minute
  * Added healing poultices in clan camps that restore 100 HP instantly
  * Created CampActions component for clan camp healing interface
  * Added health tracking with lastHpRegeneration field in database
  * Healing items only work in character's own clan camp (Thunderclan/Riverclan)
  * Automatic regeneration triggers on every game state request
- July 09, 2025. Health system cleanup:
  * Removed automatic health regeneration system per user request
  * Kept only healing poultices as health restoration method
  * Cleaned up interface to remove regeneration mentions
  * Healing poultices remain functional in clan camps (+100 HP)
- July 09, 2025. Fixed level-up stat distribution system:
  * Added unspentStatPoints field to character database schema
  * Fixed automatic level progression with 5 stat points per level gained
  * Level-up modal automatically appears when unspent stat points are available
  * Players can distribute points among strength, agility, intelligence, endurance
  * Fixed 401 authentication error in apply-level-up endpoint
  * Character stats now properly increase when leveling up (tested with Искорка)
- July 09, 2025. Gender selection and authentication fixes:
  * Added gender field to character schema (male/female)
  * Updated character creation interface with gender selection
  * Fixed critical authentication bug where different Telegram users accessed same character
  * Each Telegram user now correctly gets their own character based on Telegram ID
  * Updated character display to show gender with appropriate icons (🐱/🐈)
  * Removed problematic characters "Искорка" and "Горелый" to resolve authentication conflicts
  * Development mode now correctly uses different user IDs to prevent cross-account access
  * All existing characters cleared - each user must now create their own unique character
- July 08, 2025. Telegram Stars monetization system (hidden):
  * Implemented complete Telegram Stars payment system for future use
  * Created TelegramPayments service and ShopPanel component (disabled)
  * Monetization features temporarily hidden per user request
  * Shop tab and /shop command disabled but code preserved for later activation
- July 09, 2025. Combat results modal closure fix:
  * Fixed critical UI bug where combat results modal could not be closed
  * Added combat ID tracking to prevent duplicate modal appearances
  * Removed async/await issue in modal onClose handler
  * Modal now properly closes and clears server-side combat results
  * Combat system fully functional with proper UI feedback
- July 09, 2025. Expanded map system with scrollable interface:
  * Extended coordinate plane to support 2-3x larger playable area
  * Added smooth scrolling functionality with custom scrollbar styling
  * Created 8 new locations spanning extended coordinates (up to 170% range)
  * Added new high-level NPCs and bosses for distant areas
  * Map now spans multiple screen sizes and supports touch scrolling
  * Character authentication works correctly with unique Telegram user IDs
  * All existing characters preserved and functional in expanded map system
  * Fixed character-user relationship issues after map expansion
  * Cleared all player characters from database per user request
  * Authentication system ready for fresh character creation
  * All users will see character creation screen on next login
- July 09, 2025. Map visual improvements and layout optimization:
  * Fixed visual layering - locations now appear above connection lines
  * Improved connection lines to properly align with location centers
  * Optimized location coordinates for better spacing without text overlap
  * Added full location names display on all devices
  * Enhanced z-index hierarchy for proper visual ordering
  * Reduced map size to 150vw x 140vh for more compact navigation
  * Removed "Древний Храм" and "Край Света" locations for cleaner map
  * Fixed connection issues with "Заброшенная Пещера" and "Болотистая Низина"
  * Repositioned "Болотистая Низина" closer to "Старая Дорога" with proper connections
  * Implemented mobile-first fixed map interface with automatic camera centering
  * Removed scroll functionality to prevent interface issues on mobile devices
  * Optimized touch interactions with larger touch targets (56px minimum)
  * Reduced header sizes and improved text truncation for mobile screens
  * Restored original map size (150vw x 140vh) for optimal mobile experience
  * Returned location icon sizes to original responsive dimensions
  * Maintained scrollable interface with proper touch interaction
  * Map interface optimized for mobile devices with standard sizing
- July 10, 2025. NPC content update per user request:
  * Replaced all trolls with foxes in game data
  * "Болотный Тролль" (👹) became "Хитрая Лисица" (🦊)
  * Adjusted stats: reduced HP and strength, increased agility and intelligence
  * Maintains same level 6 difficulty and spawning locations (Болотистая Низина, Туманные Холмы)
- July 15, 2025. Complete map interface redesign:
  * Implemented circular map layout with tribal camps outside main circle
  * Redesigned location connections: each camp has one exit to ring
  * Created color-coded zones: green (outer ring), yellow (middle), red (center)  
  * Added horizontal scrolling with tribal camps positioned far from center
  * Tribal camp labels preserved while other locations show only emojis
  * Map width extended to 170vw with smooth horizontal scroll for better navigation
  * Fixed camp positioning to prevent icon clipping and added proper inter-zone connections
  * Connected yellow locations to green ring and red locations to yellow ring for proper progression
  * Fixed all bidirectional connections throughout the map system
  * Renamed "Арена" to "Логово Волка" and made it exclusive boss location for Лесной Волк
  * Removed Древний Дракон from game as it doesn't fit the Warriors Cats setting
- July 15, 2025. Tribal hierarchy system implementation:
  * Added comprehensive rank system with 9 tribal positions: Предводитель, Глашатай, Старший целитель, Целитель, Ученик целителя, Старший воитель, Воитель, Оруженосец, Котёнок
  * Added "Котёнок" (🐾) as default rank for new characters - the starting position for all players
  * Implemented promotion permissions: admins can assign any rank, leaders can promote to all lower ranks, deputies can promote healers and warriors
  * Added rank display with emojis in character panel (👑 Предводитель, ⚔️ Глашатай, 🌿 Старший целитель, etc.)
  * Created API endpoint `/api/character/change-rank` for rank management with permission validation
  * Added rank field to character schema and updated character creation flow
  * Ranks are clan-specific - can only promote characters from same clan
  * Fixed database compatibility issues by clearing all existing characters and updating schema
  * Added Elder NPCs in tribal camps for kitten promotion ceremonies
  * Created promotion system where kittens can choose between apprentice (🔰) or healer apprentice (🌱) paths
  * Added `/api/character/promote-kitten` endpoint for ceremony-based promotions
  * Elders only appear to kittens in their own clan camp for authentic role-playing experience
- July 15, 2025. Location-based chat system implementation:
  * Created comprehensive chat system with persistent message storage in database
  * Added chat_messages table with locationId, characterId, message, and timestamp fields
  * Implemented ChatPanel component with real-time messaging interface
  * Replaced Combat tab with Chat tab in bottom navigation for better UX
  * Added clan-based visual indicators in chat: ⚡ for Thunder clan, 🌊 for River clan
  * Created chat API endpoints: /api/chat/send for sending messages
  * Messages persist between sessions and location changes
  * Automatic cleanup of messages older than 24 hours for performance
  * Limited to 50 messages per location with optimization for mobile devices
  * Fixed critical location validation bug preventing message sending
- July 15, 2025. Rank management system fixes:
  * Fixed HTTP 401 authentication error in rank assignment by adding requesterId to API requests
  * Added WebSocket broadcasting for real-time rank change notifications
  * Improved cache invalidation to update UI immediately after rank changes
  * Added delayed refresh mechanism to ensure consistent UI updates across all components
- July 15, 2025. Inter-tribal PvP combat system implementation:
  * Created comprehensive PvP system allowing combat only between different tribes
  * Added tribal warfare restrictions: Thunder vs River clans only
  * Implemented PvPPanel component with enemy player detection and duel challenges
  * Enhanced GameEngine with PvP-specific combat logic and non-lethal outcomes
  * Players defeated in PvP retain 1 HP (honorable defeat, no permanent death)
  * PvP winners receive 150 experience points (higher than NPC rewards)
  * Added dramatic combat messages for tribal warfare scenarios
  * Integrated PvP interface into main game dashboard for seamless tribal conflicts
  * Removed experience rewards for PvP victories per user request - duels now for honor only
  * Fixed critical combat system bug causing server errors during battle processing
- July 15, 2025. Combat restrictions for low HP characters:
  * Added HP restrictions: characters with 1 HP cannot start any combat (PvE or PvP)
  * Characters with 1 HP are excluded from PvP target lists (cannot be attacked)
  * Added clear UI indicators when characters are too weak to fight
  * Server-side validation prevents 1 HP characters from attacking any targets
  * Fixed invincibility exploit where 1 HP characters could fight indefinitely
- July 15, 2025. PvP combat system fixes:
  * Fixed beinfinite PvP combat loop - battles now properly end when player reaches 1 HP
  * Corrected victory logic - player with 1 HP is now correctly identified as defeated
  * Fixed victory modal display - now shows to actual winner instead of loser
  * Updated HP formula to 80 + (endurance * 5) for better combat balance
  * Both server and client logic now properly handle PvP defeat conditions
- July 15, 2025. Advanced diplomacy system with peace proposals:
  * Added diplomacy_proposals table for managing peace negotiations between tribes
  * War declarations are immediate, but peace requires bilateral agreement through proposals
  * Enhanced DiplomacyPanel with proposal management interface showing incoming peace offers
  * Only tribal leaders can send/respond to diplomacy proposals with accept/reject options
  * Created comprehensive API endpoints for proposal creation, viewing, and responses
  * Peace proposals include timestamps, optional messages, and automated status tracking
  * System prevents unilateral peace declarations during wartime - requires enemy leader approval
- July 17, 2025. Diplomacy visibility and PvP restrictions:
  * Made diplomacy status visible to all players, not just leaders
  * Added PvP combat restrictions - attacks only allowed during wartime
  * Enhanced PvPPanel with real-time diplomacy status display
  * Server-side validation prevents PvP combat during peaceful relations
  * Clear UI indicators show when attacks are forbidden due to peace
  * Updated game rules to reflect new diplomacy-based combat system
- July 17, 2025. Critical diplomacy system fixes:
  * Fixed HTTP 403 authentication errors preventing peace proposal viewing
  * Resolved HTTP 500 error when declaring war due to missing broadcastToAll function
  * Added broadcastDiplomacyUpdate function for real-time diplomacy notifications
  * Implemented URL parameter-based user authentication for development testing
  * Removed development user switcher links from TopBar per user request
  * Fixed client-side authentication to work with browser requests (not just curl)
  * All diplomacy features now fully functional: war declarations, peace proposals, and responses
  * Real-time WebSocket updates work correctly for all diplomacy state changes
  * Removed standalone DevUserSwitcher component per user request
- July 17, 2025. Group combat system fixes and enhanced interface:
  * Fixed critical double-attack bug - removed duplicate startAutoCombat calls
  * NPCs and players now correctly attack only once per turn
  * Enhanced GroupPanel with member list showing locations and online status
  * Added group member management: leaders can kick members from groups
  * Created /api/groups/:id/kick endpoint for member removal
  * Group members display shows: name, gender icon, location, online status, HP
  * Real-time member location updates every 5 seconds
  * WebSocket group victory notifications implemented and working
  * Group combat system fully functional with proper experience distribution
  * Added combat safety mechanisms: max turn limit (100), 10-minute timeout, force-end admin endpoint
  * Improved combat end detection to prevent hanging battles when NPCs are defeated
  * Added /api/admin/force-end-combats endpoint for emergency combat cleanup
- July 17, 2025. Critical NPC cross-location death state fix:
  * Fixed major bug where killing NPC in one location made it dead in all locations
  * Redesigned NPC system to create separate instances for each spawn location
  * Each NPC now has unique ID and isolated health/death state per location
  * Example: Дикий Кролик now has separate instances (ID 7, 8, 9) for locations 11, 12, 13
  * NPCs can now be killed independently in different locations without affecting others
  * Improved spawnsInLocation field to reflect single-location ownership per instance
- July 17, 2025. Game rebranding to "Клыки и Клятвы":
  * Changed game title from "Cats War" to "Клыки и Клятвы" throughout project
  * Updated all user-facing text, documentation, and interface elements
  * Maintained all existing functionality with new branding
- July 18, 2025. Fixed rank promotion system:
  * Fixed critical bug where senior healers couldn't promote healer apprentices to healers
  * Fixed similar issue with senior warriors unable to promote apprentices to warriors
  * Updated permission logic to check both canPromote and canBePromotedBy fields properly
  * Added admin authentication handling for leaders and special ranks
  * Promotion system now works correctly across all tribal hierarchy levels
- July 18, 2025. Location coordinate updates investigation:
  * Confirmed admin bot location coordinate updates work correctly via API
  * PATCH /api/admin/locations/:id successfully updates coordinates in real-time
  * Changes immediately reflect in game interface through /api/locations endpoint
  * Location updates modify static LOCATIONS_DATA array correctly
  * No issues found with coordinate synchronization system
- July 18, 2025. Group application system fixes:
  * Fixed duplicate group applications - players can only submit one application per group
  * Added character names to group applications display for better identification
  * Implemented hasExistingApplication() method to prevent duplicate submissions
  * Added getGroupApplicationsWithCharacterNames() method to show applicant names
  * Fixed potential duplicate group membership when accepting multiple applications from same player
  * All group application functionality now working correctly with proper validation
- July 17, 2025. Map expansion with 6 new dangerous locations:
  * Added new high-level locations: Пугающее ущелье, Солнечный Склон, Гремящая Роща (upper right)
  * Added dangerous locations: Хрустальный Ручей, Озеро Снов, Тропа Теней (lower right)
  * All new locations have danger level 4 for high-level characters (level 4-12)
  * Created 12 lore-appropriate NPCs: various badgers and foxes fitting Warriors universe
  * Strongest bosses: Старый Барсук, Вожак Барсуков, Речной Барсук, Альфа-Барсук, Теневой Барсук
  * New locations positioned horizontally without overlapping existing areas
  * Connected new areas to main map through Четыре Дерева and Старая Дорога respectively

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Updates (July 22, 2025)
- Territory warfare system with color-coded map visualization
- Battle preparation time reduced from 1 hour to 5 minutes
- Fixed group membership limit enforcement (maximum 5 members)
- Added influence points system with 10 points per clan for testing
- July 22, 2025: Fixed critical NPC attack validation bug "The string did not match the expected pattern"
- Moved group management back to Overview tab as separate subtab per user request
- Replaced incorrect /api/combat/attack-npc endpoint with correct /api/combat/start
- Fixed NPC ID mapping to use server-side data instead of static client data
- Added legacy endpoint stub for old attack-npc requests to prevent future errors
- July 22, 2025: Complete territory warfare system implementation:
  * Full mass battle system supporting unlimited participants (crowd vs crowd)
  * Automatic battle resolution based on participant stats, level, and HP
  * Territory ownership transfer to winning clan after battle completion
  * Balanced influence points system: capture costs 1 point, tribes gain 1 point per 24 hours
  * Real-time battle status updates and WebSocket notifications
  * Enhanced battle interface showing preparation/active status and participant counts
  * Experience rewards (200 points) for all territory battle participants
  * Game events and notifications for battle declarations and completions

### Target Audience & Requirements
- **Platform**: Mobile devices only (Telegram Web App)
- **Age group**: 8-16 years old
- **Monetization**: Telegram Stars for in-game purchases
- **Social features**: Friend invitation system needed
- **Development approach**: Start simple, optimize and expand with future-proofing
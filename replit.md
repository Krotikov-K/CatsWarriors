# Cats War - Multiplayer Role-Playing Game

## Overview

Cats War is a real-time multiplayer role-playing game built with a React frontend and Express backend. Players create warrior cats from different clans and engage in turn-based combat across various locations. The game features clan-based gameplay, character progression, real-time communication through WebSockets, and optional Telegram bot integration.

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
  * Map width extended to 150vw with smooth horizontal scroll for better navigation

## User Preferences

Preferred communication style: Simple, everyday language.

### Target Audience & Requirements
- **Platform**: Mobile devices only (Telegram Web App)
- **Age group**: 8-16 years old
- **Monetization**: Telegram Stars for in-game purchases
- **Social features**: Friend invitation system needed
- **Development approach**: Start simple, optimize and expand with future-proofing
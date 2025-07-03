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

## User Preferences

Preferred communication style: Simple, everyday language.

### Target Audience & Requirements
- **Platform**: Mobile devices only (Telegram Web App)
- **Age group**: 8-16 years old
- **Monetization**: Telegram Stars for in-game purchases
- **Social features**: Friend invitation system needed
- **Development approach**: Start simple, optimize and expand with future-proofing
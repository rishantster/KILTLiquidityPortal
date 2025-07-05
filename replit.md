# KILT LP Portal

## Overview

This is a decentralized finance (DeFi) liquidity provisioning portal built for the KILT token on the Base network. The application enables users to create and manage liquidity positions, track rewards, and participate in an incentivized liquidity mining program. The system is designed as a full-stack TypeScript application with a React frontend and Express.js backend.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom KILT brand colors and dark theme
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Web3 Integration**: Viem for Ethereum interactions on Base network

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API Style**: RESTful endpoints with JSON responses
- **Development**: Hot reloading with Vite middleware integration

### Database Schema
- **Users**: Stores wallet addresses and creation timestamps
- **LP Positions**: Manages NFT-based liquidity positions with price ranges
- **Rewards**: Tracks earned and claimed rewards per user/position
- **Pool Stats**: Maintains pool metrics (TVL, volume, APR, current price)

## Key Components

### Data Models
- **User**: Wallet address identification system
- **LP Position**: Uniswap V3 style concentrated liquidity positions
- **Reward System**: Token-based incentive tracking with claim functionality
- **Pool Statistics**: Real-time pool metrics for user interface

### Frontend Components
- **Wallet Connection**: MetaMask integration for Base network
- **Liquidity Provision**: Form for creating new LP positions
- **Position Management**: Dashboard for viewing and managing positions
- **Rewards Tracking**: Real-time reward calculation and claiming
- **Pool Overview**: Statistics dashboard with TVL, volume, and APR metrics

### Backend Services
- **Storage Layer**: Abstract interface with in-memory implementation
- **API Routes**: RESTful endpoints for CRUD operations
- **Validation**: Zod schema validation for all data inputs
- **Error Handling**: Centralized error handling with proper HTTP status codes

## Data Flow

1. **User Authentication**: Wallet connection via MetaMask on Base network
2. **Position Creation**: User submits liquidity with token amounts and price ranges
3. **Data Persistence**: Position data stored in PostgreSQL via Drizzle ORM
4. **Reward Calculation**: Backend calculates rewards based on position size, duration, and multipliers
5. **Real-time Updates**: Frontend polls for position and reward updates
6. **Reward Distribution**: Users can claim accumulated rewards through the interface

## External Dependencies

### Blockchain Integration
- **Base Network**: Ethereum L2 for reduced gas costs
- **Viem**: Modern Ethereum library for wallet interactions
- **MetaMask**: Primary wallet provider for user authentication

### Database and Storage
- **Neon Database**: Serverless PostgreSQL for production
- **Drizzle ORM**: Type-safe database operations
- **In-memory Storage**: Development and testing fallback

### UI and Styling
- **Shadcn/ui**: Accessible component library
- **Radix UI**: Primitive components for complex UI patterns
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography

## Deployment Strategy

### Development Environment
- **Hot Reloading**: Vite middleware integration with Express
- **TypeScript**: Full-stack type safety with shared schema definitions
- **Environment Variables**: Database URL and configuration management

### Production Build
- **Frontend**: Vite builds static assets to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Database**: Drizzle migrations for schema updates
- **Static Serving**: Express serves built frontend assets

### Database Management
- **Schema Definition**: Centralized in `shared/schema.ts`
- **Migrations**: Generated and applied via Drizzle Kit
- **Type Safety**: Automatic TypeScript types from schema

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 05, 2025. Initial setup
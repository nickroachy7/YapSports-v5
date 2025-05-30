# YapSports - Tech Stack & Package Documentation

## 🚀 Project Overview

YapSports is a sophisticated NBA-themed gaming application built with modern web technologies, featuring real-time capabilities, user authentication, card-based gaming mechanics, and a comprehensive coin economy system.

---

## 🏗️ Tech Stack Breakdown

### **Frontend Stack**

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.1.0 / 15.1.8 | React framework with App Router |
| **React** | 18.2.0 / 19.1.0 | UI library |
| **TypeScript** | 5.3.3 / 5.8.3 | Type-safe JavaScript |
| **Tailwind CSS** | 3.4.17 | Utility-first CSS framework |
| **NextUI** | 2.6.11 | Modern React component library |
| **Framer Motion** | 12.5.0 | Animation library |
| **React Icons** | 5.5.0 | Icon library |

### **Backend & Data**

| Technology | Version | Purpose |
|------------|---------|---------|
| **Supabase** | 2.49.8 | PostgreSQL database + real-time + auth |
| **@balldontlie/sdk** | 1.2.2 | NBA sports data API integration |
| **dotenv** | 16.5.0 | Environment variable management |

### **State Management & Utils**

| Technology | Version | Purpose |
|------------|---------|---------|
| **React Context API** | - | Global state (CoinsContext) |
| **React Redux** | 7.2.9 | State management |
| **date-fns** | 4.1.0 | Date utility functions |
| **React Hot Toast** | 2.5.2 | Toast notifications |
| **React Beautiful DnD** | 13.1.1 | Drag and drop functionality |

### **Development & Testing**

| Technology | Version | Purpose |
|------------|---------|---------|
| **Jest** | 29.7.0 | Testing framework |
| **Testing Library** | - | Component testing utilities |
| **ESLint** | 8.56.0 | Code linting |
| **PostCSS** | 8.5.3 | CSS processing |
| **Autoprefixer** | 10.4.21 | CSS vendor prefixing |

### **Deployment & Infrastructure**

| Technology | Purpose |
|------------|---------|
| **Vercel** | Hosting and deployment |
| **Supabase Cloud** | Database and backend services |
| **Next.js Build System** | Application bundling and optimization |

---

## 📦 Complete Package Inventory

### **Root Project Dependencies**

#### Production Dependencies
```json
{
  "@balldontlie/sdk": "^1.2.2",
  "@supabase/supabase-js": "^2.49.8", 
  "dotenv": "^16.5.0",
  "next": "^15.1.8",
  "react": "^19.1.0",
  "react-dom": "^19.1.0",
  "tsconfig-paths": "^4.2.0"
}
```

#### Development Dependencies
```json
{
  "@types/react": "19.1.5",
  "typescript": "5.8.3"
}
```

### **YapSports-v5 Subdirectory Dependencies**

#### Production Dependencies
```json
{
  "@balldontlie/sdk": "^1.2.2",
  "date-fns": "^4.1.0",
  "next": "^14.1.0", 
  "react": "^18.2.0",
  "react-dom": "^18.2.0"
}
```

#### Development Dependencies
```json
{
  "@types/node": "^20.11.19",
  "@types/react": "^18.2.55", 
  "@types/react-dom": "^18.2.19",
  "autoprefixer": "^10.4.21",
  "eslint": "^8.56.0",
  "eslint-config-next": "^14.1.0",
  "postcss": "^8.5.3",
  "tailwindcss": "^3.4.17",
  "typescript": "^5.3.3"
}
```

### **Major Installed Package Categories**

#### **NextUI Component Ecosystem**
- `@nextui-org/react@2.6.11` - Main NextUI package
- `@nextui-org/button`, `@nextui-org/card`, `@nextui-org/modal` - UI components
- `@nextui-org/theme@2.4.5` - Theming system
- Complete set of 40+ NextUI component packages

#### **React Aria & React Stately**
- `@react-aria/*` - Accessibility primitives (20+ packages)
- `@react-stately/*` - State management primitives (15+ packages)
- Provides foundation for NextUI components

#### **Supabase Ecosystem**
- `@supabase/supabase-js@2.49.8` - Main client
- `@supabase/auth-js@2.69.1` - Authentication
- `@supabase/postgrest-js@1.19.4` - Database queries
- `@supabase/realtime-js@2.11.2` - Real-time subscriptions
- `@supabase/storage-js@2.7.1` - File storage
- `@supabase/auth-helpers-nextjs@0.10.0` - Next.js integration

#### **Testing Infrastructure**
- `jest@29.7.0` - Testing framework
- `@testing-library/react@14.3.1` - React testing utilities
- `@testing-library/jest-dom@6.6.3` - DOM testing matchers
- `@testing-library/user-event@14.6.1` - User interaction testing
- `jsdom@20.0.3` - DOM environment for testing

#### **Build & Development Tools**
- `@babel/*` - JavaScript transpilation (15+ packages)
- `@swc/*` - Fast TypeScript/JavaScript compiler
- `esbuild@0.25.4` - Fast bundler
- `tsx@4.19.4` - TypeScript execution

#### **Animation & Interaction**
- `framer-motion@12.5.0` - Animation library
- `motion-dom@12.5.0`, `motion-utils@12.5.0` - Motion utilities
- `react-beautiful-dnd@13.1.1` - Drag and drop
- `@tanstack/react-virtual@3.11.2` - Virtualization

---

## 🏛️ Project Architecture

### **Directory Structure**
```
YapSports-v5/
├── app/                    # Next.js App Router
│   ├── components/         # React components
│   ├── context/           # React Context providers
│   ├── lib/               # Utility libraries
│   └── game/              # Game-specific logic
├── supabase/              # Database configuration
│   └── migrations/        # Database migrations
├── scripts/               # Utility scripts
├── public/                # Static assets
├── database/              # Database documentation
└── .cursor/               # Cursor IDE configuration
```

### **Key Features**
- **Monorepo Structure**: Dual Next.js projects for different environments
- **App Router**: Modern Next.js routing with server components
- **Real-time Database**: Supabase PostgreSQL with live subscriptions
- **Custom Authentication**: Supabase Auth with custom provider wrapper
- **Card Gaming System**: Complex game mechanics with coin economy
- **NBA Data Integration**: Live sports data via balldontlie API
- **Dark Theme**: Custom Tailwind configuration with charcoal/grey palette
- **Type Safety**: Full TypeScript coverage with strict configuration

### **Database Architecture**
- **Supabase PostgreSQL**: Primary database
- **Row Level Security**: Implemented for data protection
- **Real-time Subscriptions**: Live data updates
- **Migration System**: Version-controlled schema changes
- **Edge Functions**: Serverless function capabilities

### **Styling System**
- **Tailwind CSS**: Utility-first approach
- **Custom Color Palette**: Charcoal and grey theme
- **NextUI Components**: Pre-built accessible components
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Default dark theme implementation

---

## 🔧 Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production  
npm run start        # Start production server
npm run lint         # Run ESLint

# Testing
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
```

---

## 📊 Package Statistics

- **Total Packages**: 200+ (including all dependencies)
- **Production Dependencies**: 7 (root) + 5 (subdirectory)
- **Development Dependencies**: 2 (root) + 9 (subdirectory)
- **Major Frameworks**: Next.js, React, Supabase, NextUI
- **Bundle Size**: Optimized with Next.js tree-shaking
- **Type Coverage**: 100% TypeScript coverage

---

## 🚀 Deployment Configuration

### **Vercel Setup**
- Configured via `vercel.json`
- Automatic deployments from Git
- Edge runtime support
- Environment variable management

### **Supabase Configuration**
- Cloud-hosted PostgreSQL
- Real-time capabilities enabled
- Row Level Security implemented
- Migration-based schema management

---

*Last Updated: $(Get-Date -Format "yyyy-MM-dd")*
*Project: YapSports v5*
*Framework: Next.js 14/15 with App Router* 
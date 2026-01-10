# GrowMore - Pakistan's Smartest Investment Tracker

A comprehensive, production-ready Next.js 14 frontend for tracking investments across PSX stocks, gold prices, bank deposits, and more.

## Features

- **Authentication**: Firebase Authentication with Email/Password and Google Sign-In
- **Dashboard**: Portfolio overview with real-time market data
- **PSX Stock Tracking**: Browse and track stocks from Pakistan Stock Exchange
- **Theme Support**: Dark mode and light mode with seamless toggle
- **Responsive Design**: Perfect experience on mobile, tablet, and desktop
- **Real-time Updates**: WebSocket support for live price updates
- **State Management**: Zustand for efficient global state
- **Type-Safe**: Full TypeScript support with comprehensive type definitions

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **State Management**: Zustand
- **Authentication**: Firebase Authentication
- **HTTP Client**: Axios
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Charts**: Recharts (ready to use)
- **Tables**: TanStack Table (ready to use)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Firebase project set up
- Backend API running at `http://localhost:8000/api/v1`

### Installation

1. **Clone the repository** (if applicable) or navigate to the project directory

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:

   Copy the `.env.local.example` file to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` and add your Firebase credentials:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   NEXT_PUBLIC_WS_URL=ws://localhost:8000/api/v1/ws

   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm run start
```

### Type Checking

```bash
npm run typecheck
```

## Project Structure

```
├── app/
│   ├── (auth)/                 # Authentication pages
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/            # Protected dashboard pages
│   │   ├── dashboard/
│   │   ├── stocks/
│   │   └── layout.tsx
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Landing page
│   └── globals.css             # Global styles with theme
├── components/
│   ├── common/                 # Reusable components
│   │   ├── price-display.tsx
│   │   ├── stat-card.tsx
│   │   ├── loading-spinner.tsx
│   │   └── empty-state.tsx
│   ├── layout/                 # Layout components
│   │   ├── header.tsx
│   │   └── sidebar.tsx
│   ├── providers/              # Context providers
│   │   ├── theme-provider.tsx
│   │   └── auth-provider.tsx
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── api.ts                  # Axios API client
│   ├── firebase.ts             # Firebase config and helpers
│   └── utils.ts                # Utility functions
├── stores/
│   ├── authStore.ts            # Auth state management
│   ├── marketStore.ts          # Market data state
│   ├── portfolioStore.ts       # Portfolio state
│   ├── watchlistStore.ts       # Watchlist state
│   ├── notificationStore.ts    # Notifications state
│   └── priceStreamStore.ts     # WebSocket price stream
├── types/
│   ├── common.ts               # Common types
│   ├── user.ts                 # User and auth types
│   ├── market.ts               # Stock and market types
│   ├── portfolio.ts            # Portfolio types
│   ├── watchlist.ts            # Watchlist types
│   ├── notification.ts         # Notification types
│   └── ... (and more)
└── ...
```

## Available Pages

### Public Pages
- `/` - Landing page with feature showcase
- `/login` - Login with email or Google
- `/register` - Register new account

### Protected Pages (Requires Authentication)
- `/dashboard` - Main dashboard with portfolio overview
- `/stocks` - Browse PSX stocks
- More pages ready to be implemented:
  - `/commodities` - Gold and silver prices
  - `/bank-products` - Bank deposit rates
  - `/news` - Market news with sentiment analysis
  - `/portfolio` - Portfolio management
  - `/watchlist` - Stock watchlist
  - `/calculators` - Investment calculators
  - `/goals` - Investment goals tracking
  - `/screener` - Stock screener
  - `/settings` - User settings

## Design System

### Colors

The application uses a blue and green color scheme:
- **Primary (Blue)**: Trust and professionalism
- **Secondary (Green)**: Growth and success
- **Additional colors**: Gold for commodities, semantic colors for gains/losses

### Theme Toggle

Users can switch between light mode, dark mode, and system preference using the theme toggle in the header.

### Typography

- **Sans-serif**: Inter for general UI
- **Monospace**: JetBrains Mono for numbers and prices

## API Integration

The frontend connects to the backend API at `http://localhost:8000/api/v1`. All API calls are made through the Axios client in `lib/api.ts`, which automatically:

- Adds Firebase authentication tokens to requests
- Handles 401 errors by redirecting to login
- Provides consistent error handling

## State Management

Zustand stores are used for:
- **Auth**: User authentication and profile
- **Market**: Market data and sectors
- **Portfolio**: Portfolio holdings and transactions
- **Watchlist**: Watchlist items and alerts
- **Notifications**: Notifications and unread count
- **Price Stream**: WebSocket connections for real-time prices

## Authentication Flow

1. User signs in with email/password or Google
2. Firebase returns a user credential with ID token
3. Frontend calls `/auth/verify` with the token
4. Backend creates/updates user and returns user data
5. User data is stored in Zustand and user is redirected to dashboard

## WebSocket Support

Real-time price updates are supported through WebSocket connections. The `priceStreamStore` manages:
- Connection lifecycle
- Symbol subscriptions
- Price updates
- Automatic reconnection

## Next Steps

This is a solid foundation with core features implemented. To complete the full specification, you can:

1. Implement remaining pages (commodities, bank products, news, etc.)
2. Add TanStack Table for advanced data tables
3. Add Recharts for interactive charts
4. Implement portfolio management features
5. Add investment calculators
6. Implement goal tracking
7. Add stock screener functionality
8. Complete settings page with all sections

## Contributing

1. Follow the existing code structure and conventions
2. Use TypeScript for all new code
3. Follow the component composition patterns
4. Ensure responsive design
5. Test on multiple browsers and devices

## License

Copyright © 2024 GrowMore. All rights reserved.

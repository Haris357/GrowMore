# GrowMore Setup Guide

This guide will help you set up the GrowMore frontend application.

## Firebase Setup

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard to create your project

### 2. Enable Authentication

1. In the Firebase Console, go to **Build → Authentication**
2. Click "Get Started"
3. Enable the following sign-in methods:
   - **Email/Password**: Toggle on
   - **Google**: Toggle on and configure

### 3. Register Your Web App

1. In the Firebase Console project overview, click the web icon (</>) to add a web app
2. Register your app with a nickname (e.g., "GrowMore Web")
3. Copy the Firebase configuration object

### 4. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Backend API URLs
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/api/v1/ws

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

Replace the Firebase values with those from your Firebase project configuration.

## Backend API Setup

### Prerequisites

Ensure your backend API is running at `http://localhost:8000/api/v1` with the following endpoints available:

#### Required Endpoints:
- `POST /auth/verify` - Verify Firebase token and sync user
- `GET /dashboard/summary` - Get dashboard data
- `GET /stocks` - List stocks
- `GET /markets` - List markets
- `GET /notifications/unread-count` - Get unread notification count

### CORS Configuration

Your backend must allow requests from `http://localhost:3000` (or your frontend URL) with appropriate CORS headers.

## Development Workflow

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### 3. Test Authentication

1. Go to [http://localhost:3000](http://localhost:3000)
2. Click "Get Started" or "Sign In"
3. Create a new account or sign in with Google
4. You should be redirected to the dashboard

### 4. Verify API Connection

Open the browser console and check for:
- No CORS errors
- Successful API requests to `/auth/verify`
- Data loading in the dashboard

## Production Deployment

### Environment Variables

For production, set the environment variables with your production URLs:

```env
NEXT_PUBLIC_API_URL=https://api.growmore.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.growmore.com/api/v1/ws
```

### Build

```bash
npm run build
```

### Deploy

The application can be deployed to:
- **Vercel** (Recommended for Next.js)
- **Netlify**
- **AWS Amplify**
- **Docker container**
- **Any Node.js hosting**

### Vercel Deployment

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard

## Troubleshooting

### Authentication Issues

**Problem**: "Failed to sign in with Google"
- **Solution**: Ensure Google sign-in is enabled in Firebase Console
- Check that `NEXT_PUBLIC_FIREBASE_*` variables are correctly set

**Problem**: "Failed to verify user"
- **Solution**: Check that backend API is running and accessible
- Verify CORS is configured correctly on the backend

### API Connection Issues

**Problem**: API requests fail with CORS errors
- **Solution**: Configure backend to allow requests from your frontend domain

**Problem**: 401 Unauthorized errors
- **Solution**: Check that Firebase token is being sent correctly
- Verify backend is validating Firebase tokens

### Build Issues

**Problem**: TypeScript errors during build
- **Solution**: Run `npm run typecheck` to identify issues
- Ensure all dependencies are installed

**Problem**: Module not found errors
- **Solution**: Delete `node_modules` and `.next`, then run `npm install`

## Support

For issues or questions:
1. Check the browser console for error messages
2. Check the network tab for failed API requests
3. Verify Firebase configuration in the console
4. Ensure backend API is running and accessible

## Next Steps

Once the application is running:

1. Customize the landing page content
2. Configure backend API endpoints
3. Add additional pages and features
4. Set up proper error tracking (Sentry, etc.)
5. Configure analytics (Google Analytics, etc.)
6. Set up CI/CD pipeline
7. Add end-to-end tests

Happy coding!

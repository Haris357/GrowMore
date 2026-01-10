# Environment Variables Setup Guide

This guide explains where to get all the API keys and credentials needed for the GrowMore backend.

---

## Quick Reference

| Variable | Where to Get |
|----------|--------------|
| SUPABASE_URL | Supabase Dashboard → Settings → API |
| SUPABASE_KEY | Supabase Dashboard → Settings → API |
| SUPABASE_SERVICE_KEY | Supabase Dashboard → Settings → API |
| FIREBASE_PROJECT_ID | Firebase Console → Project Settings |
| FIREBASE_PRIVATE_KEY | Firebase Console → Service Account |
| FIREBASE_CLIENT_EMAIL | Firebase Console → Service Account |
| GROQ_API_KEY | Groq Console → API Keys |
| REDDIT_CLIENT_ID | Reddit Apps → Create App |
| REDDIT_CLIENT_SECRET | Reddit Apps → Create App |

---

## 1. Supabase (Database)

### Step 1: Create Supabase Account
1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "Sign Up"
3. Sign up with GitHub or Email

### Step 2: Create New Project
1. Click "New Project"
2. Enter project name: `growmore`
3. Set a strong database password (save this!)
4. Select region closest to Pakistan (e.g., Singapore)
5. Click "Create new project"
6. Wait for project to be ready (2-3 minutes)

### Step 3: Get API Keys
1. Go to **Settings** (gear icon in left sidebar)
2. Click **API** in the settings menu
3. You'll find:

```
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
```
↑ Copy the "Project URL"

```
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
↑ Copy the "anon public" key under "Project API keys"

```
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
↑ Click "Reveal" next to "service_role" key and copy it

> ⚠️ **IMPORTANT**: Never expose the service_role key publicly. It bypasses Row Level Security.

### Step 4: Run Database Migrations
1. Go to **SQL Editor** in Supabase dashboard
2. Click "New query"
3. Copy contents of `scripts/migrations.sql`
4. Paste and click "Run"

---

## 2. Firebase (Authentication)

### Step 1: Create Firebase Project
1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click "Create a project" or "Add project"
3. Enter project name: `growmore`
4. Disable Google Analytics (optional, not needed)
5. Click "Create project"

### Step 2: Enable Authentication
1. In Firebase Console, click **Authentication** in left menu
2. Click "Get started"
3. Go to **Sign-in method** tab
4. Enable **Email/Password**:
   - Click on it → Toggle "Enable" → Save
5. Enable **Google**:
   - Click on it → Toggle "Enable"
   - Select support email → Save

### Step 3: Generate Service Account Key
1. Click the **gear icon** ⚙️ next to "Project Overview"
2. Click **Project settings**
3. Go to **Service accounts** tab
4. Click **"Generate new private key"**
5. Click "Generate key" in the popup
6. A JSON file will download - **KEEP THIS SAFE!**

### Step 4: Extract Values from JSON
Open the downloaded JSON file. It looks like this:

```json
{
  "type": "service_account",
  "project_id": "growmore-xxxxx",
  "private_key_id": "xxxxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBA...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@growmore-xxxxx.iam.gserviceaccount.com",
  "client_id": "xxxxxxxxxxxxx",
  ...
}
```

Extract these values:

```
FIREBASE_PROJECT_ID=growmore-xxxxx
```
↑ Copy the "project_id" value

```
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@growmore-xxxxx.iam.gserviceaccount.com
```
↑ Copy the "client_email" value

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBA...\n-----END PRIVATE KEY-----\n"
```
↑ Copy the entire "private_key" value INCLUDING the quotes
↑ Keep the `\n` characters as they are

> 💡 **TIP**: The private key is very long. Make sure to copy the entire thing including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

---

## 3. Groq AI (LLM API)

### Step 1: Create Groq Account
1. Go to [https://console.groq.com](https://console.groq.com)
2. Click "Sign Up"
3. Sign up with Google, GitHub, or Email

### Step 2: Get API Key
1. After login, go to **API Keys** in the left menu
2. Or directly visit: [https://console.groq.com/keys](https://console.groq.com/keys)
3. Click **"Create API Key"**
4. Enter a name: `growmore-backend`
5. Click "Create"
6. **Copy the key immediately** (it won't be shown again!)

```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Available Models (Optional Settings)
```
GROQ_MODEL=llama-3.1-70b-versatile
GROQ_EMBEDDING_MODEL=llama-3.1-8b-instant
```

> 💡 Groq offers free tier with generous limits. Check [groq.com/pricing](https://groq.com/pricing) for details.

---

## 4. Reddit API (Optional - for Reddit scraping)

### Step 1: Create Reddit Account
1. Go to [https://www.reddit.com](https://www.reddit.com)
2. Sign up if you don't have an account

### Step 2: Create Reddit App
1. Go to [https://www.reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Scroll down and click **"create another app..."**
3. Fill in:
   - **name**: `GrowMore`
   - **App type**: Select **"script"**
   - **description**: `Investment platform scraper`
   - **about url**: (leave blank)
   - **redirect uri**: `http://localhost:8000`
4. Click **"create app"**

### Step 3: Get Credentials
After creating, you'll see:

```
GrowMore
personal use script
-----------------------
client_id: Ab1Cd2Ef3Gh4Ij   ← This is under the app name
secret: Kl5Mn6Op7Qr8St9Uv0Wx1Yz
```

```
REDDIT_CLIENT_ID=Ab1Cd2Ef3Gh4Ij
```
↑ The short code shown under your app name

```
REDDIT_CLIENT_SECRET=Kl5Mn6Op7Qr8St9Uv0Wx1Yz
```
↑ The "secret" value

```
REDDIT_USER_AGENT=GrowMore/1.0
```
↑ Keep as default

---

## 5. Complete .env File Template

Copy this to your `.env` file and fill in your values:

```env
# ===========================================
# GROWMORE BACKEND ENVIRONMENT CONFIGURATION
# ===========================================

# App Configuration
APP_NAME=GrowMore
APP_ENV=development
DEBUG=true
API_V1_PREFIX=/api/v1

# Server
HOST=0.0.0.0
PORT=8000

# ===========================================
# SUPABASE (Database)
# Get from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
# ===========================================
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_KEY=

# ===========================================
# FIREBASE (Authentication)
# Get from: https://console.firebase.google.com → Project Settings → Service Accounts
# ===========================================
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# ===========================================
# GROQ AI (LLM for sentiment analysis)
# Get from: https://console.groq.com/keys
# ===========================================
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-70b-versatile
GROQ_EMBEDDING_MODEL=llama-3.1-8b-instant

# ===========================================
# REDDIT (Optional - for Reddit scraping)
# Get from: https://www.reddit.com/prefs/apps
# ===========================================
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=GrowMore/1.0

# ===========================================
# Scraper Settings
# ===========================================
SCRAPE_INTERVAL_MINUTES=30
NEWS_SCRAPE_INTERVAL_MINUTES=15

# ===========================================
# CORS (Frontend URLs)
# ===========================================
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]

# ===========================================
# Rate Limiting
# ===========================================
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_AUTHENTICATED=120

# ===========================================
# Logging
# ===========================================
LOG_LEVEL=INFO
```

---

## 6. Verification Checklist

After setting up all credentials, verify:

- [ ] Supabase URL starts with `https://` and ends with `.supabase.co`
- [ ] Supabase keys start with `eyJ`
- [ ] Firebase project ID matches your project name
- [ ] Firebase private key includes `-----BEGIN PRIVATE KEY-----`
- [ ] Groq API key starts with `gsk_`
- [ ] Reddit credentials are from a "script" type app

---

## 7. Testing Your Setup

Run the server to test:

```bash
cd growmore-backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Visit `http://localhost:8000/health` - should return:
```json
{"status": "healthy", "version": "1.0.0", "environment": "development"}
```

Visit `http://localhost:8000/docs` for API documentation.

---

## 8. Troubleshooting

### "Supabase connection failed"
- Check SUPABASE_URL is correct
- Ensure project is not paused (free tier pauses after inactivity)

### "Firebase token verification failed"
- Verify FIREBASE_PRIVATE_KEY includes the full key with `\n` characters
- Make sure quotes are included around the private key value

### "Groq API error"
- Verify API key is correct
- Check if you've exceeded rate limits

### "Reddit scraping not working"
- Reddit credentials are optional
- Ensure app type is "script" not "web app"

---

## Need Help?

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Firebase Docs**: [firebase.google.com/docs](https://firebase.google.com/docs)
- **Groq Docs**: [console.groq.com/docs](https://console.groq.com/docs)
- **Reddit API Docs**: [reddit.com/dev/api](https://www.reddit.com/dev/api)

# Free Deployment Options for Vanish Chat

## Option 1: Railway (Recommended Free Alternative)

**Pros:**
- SQLite persists across deploys (unlike Render)
- Better free tier for Python apps
- Native WebSocket support
- Easy GitHub integration

**Cons:**
- $5 credit limit/month (usually sufficient)
- Service sleeps after inactivity

**Steps:**
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `Vanish-Chat` repo
5. Add two services:
   - Backend: Set start command to `cd server && python main.py`
   - Frontend: Set start command to `cd frontend && streamlit run app.py --server.port=$PORT`
6. Deploy

---

## Option 2: PythonAnywhere (Always-On Free Tier)

**Pros:**
- True always-on free tier (no sleep!)
- Great for Python apps
- SQLite persists
- Simple setup

**Cons:**
- Limited bandwidth (100MB/day)
- No WebSocket support (HTTP only)
- Daily CPU time limit (100 seconds)

**Steps:**
1. Go to [pythonanywhere.com](https://pythonanywhere.com)
2. Sign up for free account
3. Go to "Web" tab → "Add a new web app"
4. Choose "Manual configuration" → Python 3.11
5. In "Consoles" tab, open Bash console:
```bash
git clone https://github.com/DecoderRio/Vanish-Chat.git
cd Vanish-Chat
pip install -r server/requirements.txt
```
6. In "Web" tab, configure WSGI file to point to `server/main.py`
7. Set static files path for frontend
8. Reload web app

---

## Option 3: Fly.io (Best for Docker)

**Pros:**
- Generous free tier ($5/month credit)
- Persistent volumes available
- Great performance
- WebSocket support

**Cons:**
- Requires Docker knowledge
- Credit-based (but $5 is plenty)

**Steps:**
1. Install Fly CLI: `winget install Fly-io.flyctl`
2. Login: `fly auth login`
3. In your project directory:
```bash
fly launch
# Follow prompts to configure app
fly deploy
```
4. Add persistent volume for SQLite:
```bash
fly volumes create vanish_data --size 1
```

---

## Option 4: Replit (Easiest for Beginners)

**Pros:**
- Zero setup required
- Always-on free tier
- Live collaboration
- Built-in database

**Cons:**
- Less control
- Slower performance
- Public code (unless private plan)

**Steps:**
1. Go to [replit.com](https://replit.com)
2. Click "Create" → "Import from GitHub"
3. Paste your repo URL
4. Replit auto-detects Python
5. Configure run button:
   - Backend: `python server/main.py`
   - Frontend: `streamlit run frontend/app.py`
6. Deploy with "Always On" toggle

---

## Option 5: Glitch (Quick Prototyping)

**Pros:**
- Instant deployment
- Live code editing
- Free tier available

**Cons:**
- Project sleeps after 5 min inactivity
- Limited resources
- Not ideal for production

**Steps:**
1. Go to [glitch.com](https://glitch.com)
2. Click "New Project" → "Import from GitHub"
3. Paste your repo URL
4. Edit `.env` file with your config
5. Project auto-deploys

---

## Option 6: Vercel + Serverless Backend

**Pros:**
- Excellent for frontend
- Generous free tier
- Fast global CDN

**Cons:**
- Not ideal for WebSocket backend
- Need separate backend service

**Steps:**
1. Frontend on Vercel:
```bash
npm i -g vercel
vercel --prod
```
2. Backend on separate service (Render/Railway)
3. Connect frontend to backend URL

---

## Comparison Table

| Platform | Always-On | SQLite Persists | WebSocket | Free Tier | Best For |
|----------|-----------|-----------------|-----------|-----------|----------|
| **Render** | No | No | Limited | Yes | Quick deployment |
| **Railway** | No | Yes | Yes | $5 credit | Python apps |
| **PythonAnywhere** | Yes | Yes | No | Yes | Always-on needed |
| **Fly.io** | Yes (with credit) | Yes (volume) | Yes | $5 credit | Production Docker |
| **Replit** | Yes (toggle) | Yes | Limited | Yes | Beginners |
| **Glitch** | No | Yes | No | Yes | Prototyping |
| **Vercel** | Yes | N/A | No | Yes | Frontend only |

---

## My Recommendation

For your chat app with these requirements:
- **Need data persistence?** → Railway or PythonAnywhere
- **Need always-on?** → PythonAnywhere (truly free) or Fly.io
- **Need WebSocket (real-time chat)?** → Railway or Fly.io
- **Easiest setup?** → Replit or Railway
- **Learning/Prototyping?** → Glitch or Replit

### Best Free Combo:
- **Backend**: Railway (SQLite persists, WebSocket works)
- **Frontend**: Vercel (fast, free, reliable)
- **Cost**: $0 (within free limits)

---

## Quick Start Commands

### Railway (Fastest Setup):
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway link
railway up
```

### PythonAnywhere (Most Reliable Free):
```bash
# After signing up and cloning repo:
# 1. Open Bash console
# 2. Install dependencies
pip install -r server/requirements.txt

# 3. In Web tab, set:
#    - Source code: /home/username/Vanish-Chat
#    - Working directory: /home/username/Vanish-Chat/server
#    - WSGI: import sys; sys.path.insert(0, '/home/username/Vanish-Chat/server'); from main import app as application
```

---

## Important Notes

1. **SQLite Limitation**: On most free tiers, SQLite works but may have issues with concurrent writes. For a real chat app, consider upgrading to PostgreSQL later.

2. **WebSocket on Free Tiers**: Many free platforms have limitations on persistent connections. Your app will work, but real-time features may be less reliable.

3. **Environment Variables**: Always set:
   - `JWT_SECRET` (strong random string)
   - `PORT` (usually auto-set by platform)
   - `BACKEND_URL` (for frontend to connect to backend)

4. **CORS**: Update CORS settings in `server/main.py` to allow your deployed frontend URL.

---

## Need Help?

For each platform, I can:
- Create specific configuration files
- Write detailed setup instructions
- Debug deployment issues
- Optimize for that platform

Which platform interests you most?

# Watermelon Cup Draft Engine (2026)

A real-time WebSocket-based draft system for the Watermelon Cup soccer league. Captains connect to this server from the React frontend and take turns picking players for their teams.

---

## Architecture Overview

```
┌─────────────────────┐       WebSocket (STOMP/SockJS)       ┌───────────────────────┐
│  React Frontend     │ ◄──────────────────────────────────► │  Draft Engine Server  │
│  (Draft.js page)    │       /draft-ws                      │  (Spring Boot, Java 21)│
└─────────────────────┘                                      └───────────┬───────────┘
                                                                         │
                                                              Firestore  │  Google Sheets
                                                              (players)  │  (export)
                                                                         ▼
                                                             ┌───────────────────────┐
                                                             │  Firebase / GCP       │
                                                             └───────────────────────┘
```

**Key components:**
- `DraftService.java` — Core draft logic (turn management, snake draft, timers, auto-pick)
- `CaptainService.java` — Captain registration, session tracking
- `DraftController.java` — WebSocket endpoints for picks, autodraft, snake toggle, draft order
- `CaptainController.java` — WebSocket endpoints for becoming a captain

---

## How the Draft Works

1. Server starts and loads all `registered2026 = true` players from Firestore
2. Up to 6 users connect via WebSocket and register as captains
3. Once all 6 captains join, the draft starts automatically
4. Each captain has **3 minutes** to pick a player (or auto-pick fires)
5. Pick order is determined by settings configured before the draft starts:
   - **Round-robin** (default): Same order every round (1→2→3→4→5→6→1→2→...)
   - **Snake draft**: Order reverses each round (1→2→3→4→5→6→6→5→4→3→2→1→...)
6. Draft order can be **randomized** (default) or set to a **custom order**
7. When all players are drafted, results export to Google Sheets automatically

---

## Running on Another Laptop (Host Server)

This is the setup for the laptop that will **host** the draft server. Captains connect to it from the React frontend.

### Prerequisites

- **Java 21** (JDK) installed
- **Firebase service account JSON** file (the `watermelon-cup-production-firebase-adminsdk-*.json`)
- Network: The hosting laptop must be on the **same network** as captains, or port-forwarded

### Step 1: Clone/Copy the project

Copy the `draftengine/` folder to the hosting laptop.

### Step 2: Set environment variable for Firebase credentials

```powershell
# Windows PowerShell
$env:FIREBASE_CREDENTIALS_PATH = "C:\path\to\watermelon-cup-production-firebase-adminsdk-2rmym-f1467bd3a9.json"
```

```bash
# Mac/Linux
export FIREBASE_CREDENTIALS_PATH="/path/to/watermelon-cup-production-firebase-adminsdk-2rmym-f1467bd3a9.json"
```

### Step 3: Run the server

```powershell
# From the draftengine/ directory
.\gradlew.bat bootRun
```

```bash
# Mac/Linux
./gradlew bootRun
```

The server starts on **port 8080** by default.

### Step 4: Find your local IP

```powershell
# Windows
ipconfig
# Look for IPv4 Address under your Wi-Fi adapter (e.g., 192.168.1.42)
```

### Step 5: Configure the React frontend to point to your server

On the machine running the React frontend, create/update a `.env` file in the project root:

```env
REACT_APP_DRAFT_SERVER_URL=http://192.168.1.42:8080
```

Then restart the React dev server (`npm start`). The Draft page will now connect to your hosting laptop.

> **Production alternative:** If deploying the frontend to a hosted URL, set `REACT_APP_DRAFT_SERVER_URL` at build time.

---

## Draft Configuration (Set Before Draft Starts)

These settings are configured via the UI on the Draft page **before** all 6 captains have joined:

| Setting | Description |
|---------|-------------|
| **Snake Draft** toggle | When ON, pick order reverses each round. When OFF, same order repeats. |
| **Draft Order: Randomize** | Order will be shuffled randomly when the draft starts |
| **Draft Order: Use Current Order** | Uses the order captains registered in |

Settings are synced in real-time to all connected clients via `/topic/draft-config`.

---

## WebSocket Topics & Endpoints

### Client → Server (publish to `/app/...`)

| Endpoint | Payload | Description |
|----------|---------|-------------|
| `/app/auth` | `{email, uid, firstName, lastName}` | Authenticate on connect |
| `/app/heartbeat` | `{}` | Get current draft state |
| `/app/become-captain` | `{email, uid}` | Register as captain |
| `/app/captain-status` | `{}` | Request captain list |
| `/app/make-pick` | `{captainId, playerId}` | Make a draft pick |
| `/app/set-autodraft` | `{captainId, autoDraftEnabled}` | Toggle autodraft |
| `/app/set-snake-draft` | `{snakeDraft: true/false}` | Toggle snake mode |
| `/app/set-draft-order` | `{randomize: true}` or `{draftOrder: [...ids]}` | Set pick order |
| `/app/get-draft-config` | `{}` | Request current config |

### Server → Client (subscribe to `/topic/...`)

| Topic | Description |
|-------|-------------|
| `/topic/draft` | Full draft state (players, teams, current turn, timer) |
| `/topic/captains` | Captain list with online/offline status |
| `/topic/captain-response` | Response to become-captain request |
| `/topic/draft-config` | Snake draft & order settings |
| `/topic/connected-users` | List of connected user names |
| `/topic/pick-response` | Response to pick attempts |
| `/topic/export-complete` | Google Sheets export result |

---

## Docker Deployment (Alternative)

For production or if you prefer Docker:

```bash
# 1. Place Firebase credentials in ./credentials/
mkdir credentials
cp /path/to/firebase-credentials.json credentials/firebase-credentials.json

# 2. Configure .env from .env.template
cp .env.template .env
# Edit .env: set SHEETS_SPREADSHEET_ID

# 3. Build and run
docker build -t watermelon-cup/draftengine .
docker-compose up -d
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREBASE_CREDENTIALS_PATH` | Yes | Path to Firebase service account JSON |
| `SHEETS_SPREADSHEET_ID` | Yes | Google Sheets ID for draft results export |
| `SPRING_PROFILES_ACTIVE` | No | Spring profile (default: none, use `prod` for Docker) |
| `SERVER_PORT` | No | Server port (default: 8080) |

---

## Testing the Draft

Since you have real registered 2026 players in Firestore:

1. Start the server on your hosting laptop (Step 3 above)
2. Open the React app pointing to that server
3. You need 6 browser tabs/users logged in with accounts that have `registered2026 = true`
4. Each user clicks "Be a Captain" — draft starts automatically when all 6 join
5. Configure snake draft / order before the 6th captain joins

**Tip:** To test with fewer captains during development, temporarily change `MAX_CAPTAINS` in `CaptainService.java` (line 21) from `6` to `2` or `3`.

# SWIK Deployment Guide

## Option A — Docker on any Linux VPS (recommended)

### Prerequisites
- Linux VPS with 2GB+ RAM
- Docker + Docker Compose installed
- Ports 80 and 7843 open

### Steps

```bash
# 1. Clone repo
git clone https://github.com/Chintanpatel24/swik
cd swik

# 2. Configure
cp .env.example .env
nano .env   # Set your AI provider keys

# 3. Start
docker compose up -d

# 4. Check it's running
docker compose logs -f
curl http://localhost:7843/api/health
```

Open `http://your-server-ip:7843`

---

## Option B — With local Ollama inside Docker

```bash
docker compose --profile local-ai up -d
# First run downloads model (~2GB), wait 2-3 minutes
docker compose logs ollama-pull -f
```

Update `.env`:
```env
SWIK_DEFAULT_PROVIDER=ollama
OLLAMA_URL=http://ollama:11434
```

---

## Option C — nginx reverse proxy with HTTPS

Install certbot and nginx, then:

```nginx
server {
    listen 443 ssl;
    server_name swik.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/swik.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/swik.yourdomain.com/privkey.pem;

    location / {
        proxy_pass         http://localhost:7843;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host       $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Option D — Railway / Render / Fly.io

Set these environment variables in your platform dashboard:

```
PORT=7843
NODE_ENV=production
SWIK_DEFAULT_PROVIDER=groq         # or openai
GROQ_API_KEY=your_key_here
SWIK_DEFAULT_MODEL=llama-3.3-70b-versatile
```

Start command: `node backend/src/server.js`
Build command: `npm install && npm run build`

---

## Free AI APIs for web deployment

When deploying to the web (no local Ollama), use one of these free options:

| Provider | Free Tier | Best Model |
|----------|-----------|-----------|
| Groq | 14,400 req/day free | llama-3.3-70b-versatile |
| Together AI | $1 free credit | meta-llama/Meta-Llama-3.1-70B |
| Hugging Face | Serverless inference free | various |

Set in `.env`:
```env
SWIK_DEFAULT_PROVIDER=groq
GROQ_API_KEY=gsk_...
SWIK_DEFAULT_MODEL=llama-3.3-70b-versatile
```

---

## USB Portable Mode

```bash
# 1. Build AppImage
npm run package:linux
# → dist/SWIK-1.0.0.AppImage

# 2. Copy to USB
cp dist/SWIK-1.0.0.AppImage /media/myusb/

# 3. Enable portable mode
touch /media/myusb/.swik-portable

# 4. Plug USB into any Linux machine and run
/media/myusb/SWIK-1.0.0.AppImage
# All data (SQLite, workspaces, agents) stays on the USB
```

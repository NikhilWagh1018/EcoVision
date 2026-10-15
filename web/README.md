# Web apps

- `field-pwa/`  Field and citizen app (React + Vite + TypeScript, installable PWA). **Built.**
- `admin/`      Officer dashboard (MapLibre heatmap, review queue, reports). **Next.**

## Run the field app
```
cd web/field-pwa
cp .env.example .env
npm install
npm run dev        # http://localhost:5173
```
Start the API first (`docker compose up`).

### Testing on a real phone
Browsers only allow the camera and GPS on **HTTPS or localhost**. Opening `http://192.168.x.x:5173`
on a phone will NOT work. Use an HTTPS tunnel instead, for example:
`npx cloudflared tunnel --url http://localhost:5173` (and tunnel the API too, then set `VITE_API_URL`
and add the tunnel origin to the CORS list in `api/app/main.py`).

### What it does
- Lists open spots, nearest first
- Report a new spot: in-app camera (no gallery upload), GPS stamp, duplicate merge shown to the worker
- Record a cleanup: camera with the first photo as a faint adjustable outline, then the four-check result
- Offline queue (IndexedDB): photos taken without signal upload automatically when back online

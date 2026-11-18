# Free deployment (no card): Neon + Render + Cloudflare Pages

1. **Neon** (database): create a project, run `CREATE EXTENSION IF NOT EXISTS postgis;` in the SQL Editor,
   then paste `db/init.sql`, then `db/migrations/002_public.sql`. Copy the connection string.
2. **Load ward boundaries** (from the repo folder, Docker running):
   `docker compose exec -e DATABASE_URL='<neon string>' api python scripts/load_wards.py --replace`
3. **Render** (API): New > Blueprint > pick this repo (uses `render.yaml`). Set `DATABASE_URL` to the Neon string.
   Note the URL, e.g. `https://ecovision-api.onrender.com`. Check `/health`.
4. **Cloudflare Pages** (two projects, same repo, build `npm run build`, output `dist`):
   - `web/public-site`: `VITE_API_URL` = Render URL, `VITE_REPORT_URL` = field app URL
   - `web/field-pwa`: `VITE_API_URL` = Render URL
5. **Render again**: set `CORS_ORIGINS` = both Pages URLs, comma-separated, no trailing slash.

Limits: free Render sleeps after 15 min idle (open the site 5 min before presenting); photos are lost on restart;
no login yet, so do not share the link widely.

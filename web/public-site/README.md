# Public site
Map-first public view of every waste spot. Anyone can browse; no login.

```
cd web/public-site
copy .env.example .env
npm install
npm run dev        # http://localhost:5174
```
Apply the new tables once (existing database):
```
docker compose exec -T db psql -U ecovision -d ecovision < db/migrations/002_public.sql
```
Map tiles come from the public OpenStreetMap server, which is fine for development. For a real launch use a tile provider (MapTiler, Stadia) or self-host, and keep the attribution.

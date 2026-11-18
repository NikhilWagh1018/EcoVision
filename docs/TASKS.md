# Sprint 1 task board (Weeks 1-2)

## Data and models
- [ ] Move autolabel.py into ml/autolabel/ and commit tuned thresholds
- [ ] Set up Label Studio; import first auto-labelled batch; agree severity guidelines (written, with example photos)
- [ ] Collect 300+ Phursungi photos incl. clean spots and before/after pairs
## Backend and DB
- [ ] `docker compose up`, hit /docs, post a test report
- [ ] Load Pune ward boundaries (GeoJSON) into `wards`
- [ ] Replace DEV_USER_ID with OTP login + roles
## Verification and analytics
- [ ] Collect staged fraud set (reused, wrong place, edited, partial) to tune the 4 thresholds in .env
- [x] Heatmap + summary endpoints (/api/v1/analytics/heatmap, /api/v1/analytics/summary)
## Frontend
- [x] Scaffold field-pwa; camera + GPS capture; POST /reports (built, needs phone testing over HTTPS)
- [x] Ghost-overlay camera for the after photo (built, tune opacity and framing on real photos)
- [ ] Citizen proof-of-closure page (before/after slider, confirm or dispute)
- [ ] Admin dashboard scaffold (web/admin)

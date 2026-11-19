-- "I saw this too" and "Not garbage?" from the public, one vote per device per spot.
-- device_hash is a SHA-256 of a random id the browser makes for itself: no name, phone or IP is stored.
CREATE TABLE IF NOT EXISTS spot_signals (
  spot_id INT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('seen','not_garbage')),
  device_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (spot_id, kind, device_hash)
);

-- Copy of every uploaded photo, so a Render restart (which wipes its disk) cannot lose evidence.
CREATE TABLE IF NOT EXISTS photos (
  path TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

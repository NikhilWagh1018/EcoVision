CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE wards (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  office TEXT,
  responsible_officer TEXT,
  geom geometry(MultiPolygon, 4326)
);
CREATE INDEX wards_geom_gix ON wards USING GIST (geom);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen','warrior','officer','admin')),
  ward_id INT REFERENCES wards(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE spots (
  id SERIAL PRIMARY KEY,
  location geometry(Point, 4326) NOT NULL,
  ward_id INT REFERENCES wards(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','cleaned','disputed')),
  first_reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_cleaned_at TIMESTAMPTZ
);
CREATE INDEX spots_location_gix ON spots USING GIST (location);
CREATE INDEX spots_status_ix ON spots (status);

CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  spot_id INT NOT NULL REFERENCES spots(id),
  user_id INT REFERENCES users(id),
  kind TEXT NOT NULL DEFAULT 'before' CHECK (kind IN ('before','after')),
  photo_path TEXT NOT NULL,
  phash TEXT NOT NULL,
  location geometry(Point, 4326) NOT NULL,
  gps_accuracy_m REAL,
  captured_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reports_spot_ix ON reports (spot_id);

CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  report_id INT NOT NULL REFERENCES reports(id),
  model_version TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('clean','moderate','severe')),
  confidence REAL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  coverage_pct REAL,
  mask_path TEXT,
  needs_review BOOLEAN NOT NULL DEFAULT TRUE,
  reviewed_by INT REFERENCES users(id),
  corrected_severity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cleanups (
  id SERIAL PRIMARY KEY,
  spot_id INT NOT NULL REFERENCES spots(id),
  before_report_id INT NOT NULL REFERENCES reports(id),
  after_report_id INT NOT NULL REFERENCES reports(id),
  gps_ok BOOLEAN, time_ok BOOLEAN, hash_ok BOOLEAN, orb_ok BOOLEAN,
  distance_m REAL, time_gap_s REAL, phash_distance INT, orb_inliers INT,
  verdict TEXT CHECK (verdict IN ('clean','partial','not_cleaned','rejected','pending_review')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE confirmations (
  id SERIAL PRIMARY KEY,
  cleanup_id INT NOT NULL REFERENCES cleanups(id),
  user_id INT REFERENCES users(id),
  answer TEXT NOT NULL CHECK (answer IN ('cleaned','still_dirty')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  entity TEXT NOT NULL,
  entity_id INT NOT NULL,
  action TEXT NOT NULL,
  actor_id INT,
  details JSONB,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- dev seed: one placeholder user so the API works before auth exists
INSERT INTO users (phone, name, role) VALUES ('+910000000000', 'Dev Warrior', 'warrior');

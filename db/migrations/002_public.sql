-- Elected representatives shown on public pages. Every row MUST cite an official source.
CREATE TABLE IF NOT EXISTS representatives (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('MP','MLA','corporator')),
  constituency TEXT NOT NULL,
  source_url TEXT NOT NULL,
  verified_on DATE NOT NULL
);
CREATE TABLE IF NOT EXISTS ward_representatives (
  ward_id INT NOT NULL REFERENCES wards(id),
  representative_id INT NOT NULL REFERENCES representatives(id),
  PRIMARY KEY (ward_id, representative_id)
);

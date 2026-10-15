"""Load PMC prabhag/ward polygons into the `wards` table and link existing spots.

Inside the API container:
  docker compose exec api python scripts/load_wards.py --replace
  docker compose exec api python scripts/load_wards.py --replace --file seed/my_file.kml

Default file: seed/pmc-prabhags-2022.geojson (58 prabhags, full PMC area incl. merged villages;
DataMeet, traced from PMC's published ward maps, CC BY-SA 2.5 India).
For the official 2025 list (41 prabhags) download OpenCity's "PMC Electoral Wards 2025" KML
(data.opencity.in/dataset/pune-wards-info), put it in api/seed/ and pass it with --file.
Accepts .geojson or .kml. The ward name comes from the feature's name/Name1/Name property.
"""
import json
import os
import sys
import xml.etree.ElementTree as ET

from shapely.geometry import MultiPolygon, Polygon, mapping, shape
from sqlalchemy import create_engine, text

args = sys.argv[1:]
path = args[args.index("--file") + 1] if "--file" in args else "seed/pmc-prabhags-2022.geojson"
path = os.path.join(os.path.dirname(__file__), "..", path)


def read_kml(p):
    ns = {"k": "http://www.opengis.net/kml/2.2"}
    out = []
    for pm in ET.parse(p).getroot().iter("{http://www.opengis.net/kml/2.2}Placemark"):
        name = (pm.findtext("k:name", default="", namespaces=ns) or "").strip()
        polys = []
        for poly in pm.iter("{http://www.opengis.net/kml/2.2}Polygon"):
            def ring(el):
                c = el.find(".//k:coordinates", ns).text.split()
                return [tuple(map(float, x.split(",")[:2])) for x in c]
            outer = ring(poly.find("k:outerBoundaryIs", ns))
            holes = [ring(h) for h in poly.findall("k:innerBoundaryIs", ns)]
            polys.append(Polygon(outer, holes))
        if polys:
            out.append((name, MultiPolygon(polys)))
    return out


def read_geojson(p):
    out = []
    for f in json.load(open(p, encoding="utf-8"))["features"]:
        pr = f["properties"]
        name = pr.get("name") or pr.get("Name1") or pr.get("Name") or pr.get("NAME") or ""
        g = shape(f["geometry"]).buffer(0)
        out.append((str(name).strip(), g))
    return out


items = read_kml(path) if path.lower().endswith(".kml") else read_geojson(path)
engine = create_engine(os.environ["DATABASE_URL"])

with engine.begin() as c:
    existing = c.execute(text("SELECT count(*) FROM wards")).scalar_one()
    if existing and "--replace" not in args:
        print(f"wards already has {existing} rows. Add --replace to reload.")
    else:
        if existing:
            c.execute(text("UPDATE spots SET ward_id = NULL"))
            c.execute(text("UPDATE users SET ward_id = NULL"))
            if c.execute(text("SELECT to_regclass('ward_representatives')")).scalar():
                c.execute(text("DELETE FROM ward_representatives"))
            c.execute(text("DELETE FROM wards"))
        for name, g in items:
            c.execute(text(
                """INSERT INTO wards (name, geom)
                   VALUES (:n, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:g), 4326)))"""),
                {"n": name, "g": json.dumps(mapping(g))})
        print(f"loaded {len(items)} wards from {os.path.basename(path)}")
    n = c.execute(text(
        """UPDATE spots s SET ward_id = (SELECT w.id FROM wards w
                  WHERE ST_Contains(w.geom, s.location) LIMIT 1)
           WHERE s.ward_id IS NULL""")).rowcount
    print(f"linked {n} spots to wards")

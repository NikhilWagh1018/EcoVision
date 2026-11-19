import { useEffect, useState } from "react";
import MapPage from "./MapPage";
import Field from "./field/Field";
import { WardPage, WardsPage } from "./WardPages";
import "./field/field.css";

// Hash routes (work on any static host, no rewrite rules needed):
//   #/            map (landing page)      #/spot/12   map focused on spot 12
//   #/report      report a spot           #/wards     ward leaderboard
//   #/field       field-worker list       #/ward/12   one ward
const routeOf = () => location.hash.replace(/^#\/?/, "").split("?")[0];

export default function App() {
  const [route, setRoute] = useState(routeOf());
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const on = () => { setRoute(routeOf()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const goMap = (note?: string) => { setFlash(note ?? null); location.hash = "/"; };

  if (route === "report") return <Field key="report" start="report" onExit={goMap} />;
  if (route === "field") return <Field key="field" start="spots" onExit={goMap} />;
  if (route === "wards") return <WardsPage />;
  const ward = route.match(/^ward\/(\d+)$/);
  if (ward) return <WardPage key={route} id={Number(ward[1])} />;
  const spot = route.match(/^spot\/(\d+)$/);
  return <MapPage key={route} flash={flash} focusSpot={spot ? Number(spot[1]) : undefined} />;
}

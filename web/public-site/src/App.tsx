import { useEffect, useState } from "react";
import MapPage from "./MapPage";
import Field from "./field/Field";
import { WardPage, WardsPage } from "./WardPages";
import { KnowListPage, KnowPage } from "./KnowYourWard";
import "./field/field.css";

// Hash routes (work on any static host, no rewrite rules needed):
//   #/            map (landing page)      #/spot/12   map focused on spot 12
//   #/report      report a spot           #/wards     ward leaderboard
//   #/field       field-worker list       #/ward/12   one ward
//   #/cleanup/12  record a cleanup for spot 12
//   #/know        know your ward (41 prabhags)   #/know/12  one prabhag
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
  const cleanup = route.match(/^cleanup\/(\d+)$/);
  if (cleanup) {
    const id = Number(cleanup[1]);
    return <Field key={route} start="cleanup" spotId={id} onExit={(n) => { setFlash(n ?? null); location.hash = `/spot/${id}`; }} />;
  }
  if (route === "wards") return <WardsPage />;
  if (route === "know") return <KnowListPage />;
  const know = route.match(/^know\/(\d+)$/);
  if (know) return <KnowPage key={route} n={Number(know[1])} />;
  const ward = route.match(/^ward\/(\d+)$/);
  if (ward) return <WardPage key={route} id={Number(ward[1])} />;
  const spot = route.match(/^spot\/(\d+)$/);
  return <MapPage key={route} flash={flash} focusSpot={spot ? Number(spot[1]) : undefined} />;
}

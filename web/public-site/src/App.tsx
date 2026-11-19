import { useEffect, useState } from "react";
import MapPage from "./MapPage";
import Field from "./field/Field";
import "./field/field.css";

// Hash routes: "#/" map (landing page), "#/report" report a spot, "#/field" field-worker list.
// Hash routing needs no server rewrite rules, so it works on any static host.
const routeOf = () => location.hash.replace(/^#\/?/, "").split("?")[0];

export default function App() {
  const [route, setRoute] = useState(routeOf());
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setRoute(routeOf());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const goMap = (note?: string) => { setFlash(note ?? null); location.hash = "/"; };

  if (route === "report") return <Field key="report" start="report" onExit={goMap} />;
  if (route === "field") return <Field key="field" start="spots" onExit={goMap} />;
  return <MapPage flash={flash} />;
}

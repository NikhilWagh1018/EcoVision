import { useMemo, useState } from "react";
import { COMMITTEES, DATA_NOTES, LEADERS, PARTY, PMC_CONTACT, PRABHAGS, PartyCode, Prabhag } from "./data/pmc2026";
import { Top } from "./WardPages";
import "./know.css";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const seatTotals = (() => {
  const t = {} as Record<PartyCode, number>;
  for (const p of PRABHAGS) for (const m of p.members) t[m.party] = (t[m.party] ?? 0) + 1;
  return Object.entries(t).sort((a, b) => b[1] - a[1]) as [PartyCode, number][];
})();
const TOTAL = seatTotals.reduce((a, [, n]) => a + n, 0);

function PartyChip({ code }: { code: PartyCode }) {
  const p = PARTY[code];
  return <span className="kw-chip" style={{ background: p.color }} title={p.full}>{p.short}</span>;
}

function Contact({ context }: { context?: string }) {
  return (
    <section className="kw-contact">
      <h3>Raise it with PMC</h3>
      {context && <p className="kw-muted">{context}</p>}
      <div className="kw-actions">
        <a className="kw-btn" href={`tel:${PMC_CONTACT.tollFreeTel}`}>Call {PMC_CONTACT.tollFree}</a>
        <a className="kw-btn alt" href={PMC_CONTACT.whatsappLink} target="_blank" rel="noopener noreferrer">WhatsApp {PMC_CONTACT.whatsapp}</a>
        <a className="kw-btn alt" href={PMC_CONTACT.wardOffices} target="_blank" rel="noopener noreferrer">Ward office contacts</a>
      </div>
      <p className="kw-muted small">Numbers as reported by Free Press Journal on 23 Feb 2024. Confirm on <a href={PMC_CONTACT.site} target="_blank" rel="noopener noreferrer">pmc.gov.in</a>.</p>
    </section>
  );
}

function Notes() {
  return (
    <section className="kw-notes">
      <h3>About this data</h3>
      <ul>{DATA_NOTES.map((n) => <li key={n}>{n}</li>)}</ul>
    </section>
  );
}

function share(title: string) {
  const url = location.href;
  if (navigator.share) navigator.share({ title, url }).catch(() => undefined);
  else navigator.clipboard?.writeText(url).then(() => alert("Link copied"), () => undefined);
}


// Photos: put a square image at public/people/<id>.jpg (ids: mayor, commissioner, addl-commissioner-swm, or c-<prabhag>-<seat>).
function Avatar({ id, name, tint }: { id: string; name: string; tint?: string }) {
  const [bad, setBad] = useState(false);
  const initials = name.replace(/\(.*?\)/g, "").replace(/^(Dr|Adv|Shri)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return bad ? (
    <span className="kt-av" style={{ background: tint ?? "#DCE9EB", color: tint ? "#fff" : "var(--brand)" }} aria-hidden="true">{initials}</span>
  ) : (
    <img className="kt-av" src={`/people/${id}.jpg`} alt="" onError={() => setBad(true)} />
  );
}

function Node({ id, name, role, sub, tint, gap }: { id: string; name?: string; role: string; sub?: React.ReactNode; tint?: string; gap?: string }) {
  return (
    <div className={gap ? "kt-node gap" : "kt-node"}>
      {gap ? <span className="kt-av ghost" aria-hidden="true">?</span> : <Avatar id={id} name={name ?? "?"} tint={tint} />}
      <b>{gap ?? name}</b>
      <span className="kt-role">{role}</span>
      {sub && <span className="kt-sub">{sub}</span>}
    </div>
  );
}

function WardTree({ p, chairs }: { p: Prabhag; chairs: typeof COMMITTEES }) {
  const L = Object.fromEntries(LEADERS.map((l) => [l.id, l]));
  return (
    <section className="kt" aria-label="Who is responsible for this prabhag">
      <h3 className="kt-title">Know your ward</h3>
      <div className="kt-root"><small>Your ward</small><b>Prabhag {p.n}</b></div>
      <div className="kt-cols">
        <div className="kt-col">
          <h4>Officers</h4>
          <Node id="commissioner" name={L.commissioner.name} role="Municipal Commissioner" sub="PMC" />
          <Node id="addl-commissioner-swm" name={L["addl-commissioner-swm"].name} role="Additional Commissioner" sub="Solid Waste Management" />
          <Node id="dmc" gap="Name not listed yet" role="Deputy Commissioner" sub="Your zone" />
          <Node id="amc" gap="Name not listed yet" role="Assistant Municipal Commissioner" sub={<a href={PMC_CONTACT.wardOffices} target="_blank" rel="noopener noreferrer">Ward office contacts</a>} />
          <Node id="hi" gap="Name not listed yet" role="Health inspector" sub="Ward garbage officer. Start here" />
        </div>
        <div className="kt-col elected">
          <h4>Elected</h4>
          <Node id="mayor" name={L.mayor.name} role="Mayor" sub="BJP" tint={PARTY.B.color} />
          {chairs.map((c) => <Node key={c.office} id={`chair-${p.n}`} name={c.chair} role="Ward committee chair" sub={`${c.office} ward office`} tint="#5C6F73" />)}
          {p.members.map((m) => (
            <Node key={m.seat} id={`c-${p.n}-${m.seat}`} name={m.name} tint={PARTY[m.party].color}
              role={`Corporator · seat ${m.seat}`}
              sub={<><PartyChip code={m.party} />{m.name === "Manjusha Deepak Nagpure" && <em className="kw-tag">Mayor</em>}{m.name === "Parshuram Balkrishna Wadekar" && <em className="kw-tag">Deputy Mayor</em>}</>} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function KnowListPage() {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const k = norm(q);
    if (!k) return PRABHAGS;
    return PRABHAGS.filter((p) => norm(`${p.n} ${p.name} ${p.members.map((m) => m.name).join(" ")}`).includes(k));
  }, [q]);

  return (
    <div className="wp kw">
      <Top />
      <main className="wp-body">
        <h2>Know your ward</h2>
        <p className="wp-sub">Find your prabhag and the people elected and employed to fix what is wrong in it.</p>

        <input className="wp-search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search your area, prabhag number or a corporator's name" aria-label="Search prabhags" />

        <ul className="kw-grid">
          {shown.length === 0 && <li className="wp-msg">Nothing matches “{q}”. Try the name of a nearby locality.</li>}
          {shown.map((p) => (
            <li key={p.n}>
              <a className="kw-card" href={`#/know/${p.n}`}>
                <span className="kw-num">{p.n}</span>
                <span className="kw-body">
                  <b>{p.name}</b>
                  <small>{p.members.length} corporators</small>
                  <span className="kw-chips">{[...new Set(p.members.map((m) => m.party))].map((c) => <PartyChip key={c} code={c} />)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        <h3>City leadership</h3>
        <ul className="kw-people">
          {LEADERS.map((l) => (
            <li key={l.role}><small>{l.role}</small><b>{l.name}</b><span className="kw-muted">{l.note}</span></li>
          ))}
        </ul>

        <h3>How the 165 seats split</h3>
        <div className="kw-bar" role="img" aria-label={seatTotals.map(([c, n]) => `${PARTY[c].short} ${n}`).join(", ")}>
          {seatTotals.map(([c, n]) => <i key={c} style={{ width: `${(n * 100) / TOTAL}%`, background: PARTY[c].color }} />)}
        </div>
        <p className="kw-legend">{seatTotals.map(([c, n]) => <span key={c}><i style={{ background: PARTY[c].color }} />{PARTY[c].short} {n}</span>)}</p>

        <h3>Ward committees</h3>
        <p className="wp-sub">PMC runs 15 ward offices. Each has a ward committee headed by an elected chair.</p>
        <ul className="kw-people two">
          {COMMITTEES.map((c) => (
            <li key={c.office}>
              <small>{c.office}</small>
              <b>{c.chair}</b>
              <a href={`#/know/${c.prabhag}`}>Corporator, prabhag {c.prabhag}</a>
            </li>
          ))}
        </ul>

        <Contact />
        <Notes />
      </main>
    </div>
  );
}

export function KnowPage({ n }: { n: number }) {
  const p: Prabhag | undefined = PRABHAGS.find((x) => x.n === n);
  if (!p) {
    return (
      <div className="wp kw"><Top /><main className="wp-body">
        <p className="wp-back"><a href="#/know">← All prabhags</a></p>
        <p className="wp-msg">Prabhag {n} was not found. Pune has prabhags 1 to 41.</p>
      </main></div>
    );
  }
  const chairs = COMMITTEES.filter((c) => c.prabhag === p.n);
  const prev = p.n > 1 ? p.n - 1 : null;
  const next = p.n < PRABHAGS.length ? p.n + 1 : null;

  return (
    <div className="wp kw">
      <Top />
      <main className="wp-body">
        <p className="wp-back"><a href="#/know">← All prabhags</a></p>
        <div className="kw-head">
          <span className="kw-num big">{p.n}</span>
          <div>
            <h2>{p.name}</h2>
            <p className="wp-sub">Prabhag {p.n} of {PRABHAGS.length} · {p.members.length} corporators</p>
          </div>
        </div>
        <div className="kw-actions">
          <a className="kw-btn" href="#/report">Report garbage here</a>
          <button className="kw-btn alt" onClick={() => share(`Prabhag ${p.n} ${p.name}: your corporators`)}>Share</button>
        </div>

        <WardTree p={p} chairs={chairs} />

        <Contact context="Garbage not lifted? Say your prabhag number and the nearest landmark, and quote the EcoVision spot number if there is one." />

        <nav className="kw-pager" aria-label="Other prabhags">
          {prev ? <a href={`#/know/${prev}`}>← Prabhag {prev}</a> : <span />}
          {next ? <a href={`#/know/${next}`}>Prabhag {next} →</a> : <span />}
        </nav>
        <Notes />
      </main>
    </div>
  );
}

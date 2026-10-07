import { useState } from "react";
import type { VisitQueueEntry } from "../types";
import { Icon } from "./Icon";
import { StatusChip } from "./StatusChip";

export function QueueRail({ title, entries, activeId, onSelect }: { title: string; entries: VisitQueueEntry[]; activeId: string; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = entries.filter((entry) => `${entry.token} ${entry.patient} ${entry.status} ${entry.visitId}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <aside className="queue-rail" aria-label={title}>
    <div className="section-title"><h2>{title}</h2><StatusChip tone="primary">{entries.length}</StatusChip></div>
    <label className="queue-search"><Icon name="search" size={18} /><input aria-label={`Search ${title}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Patient or token" /></label>
    <div className="queue-entries">{filtered.map((entry) => <button type="button" key={entry.visitId || entry.token} className={`queue-entry ${entry.visitId === activeId ? "queue-entry-active" : ""}`} aria-pressed={entry.visitId === activeId} disabled={!entry.visitId} onClick={() => entry.visitId && onSelect(entry.visitId)}><strong>#{entry.token || "Pending"}</strong><b>{entry.patient}</b><span>{entry.appointment}</span><small>{entry.status}</small></button>)}</div>
    {!filtered.length && <p className="muted-copy">{entries.length ? "No matching visits." : "No pending visits."}</p>}
  </aside>;
}

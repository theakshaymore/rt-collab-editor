import React from "react";

function initials(name) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function PresenceList({ participants = [] }) {
  if (!participants || participants.length === 0)
    return <div className="text-muted">No one online</div>;
  return (
    <div>
      {participants.map((p) => (
        <div key={p.id || p} className="presence-item">
          <div className="presence-avatar">{initials(p.username || p)}</div>
          <div>
            <div style={{ fontWeight: 600 }}>{p.username || p}</div>
            <div className="small-muted">{p.id}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

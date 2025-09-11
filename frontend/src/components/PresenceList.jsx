import React from "react";

export default function PresenceList({ participants = [] }) {
  if (!participants || participants.length === 0)
    return <div className="text-muted">No one online</div>;
  return (
    <ul className="list-unstyled mb-0">
      {participants.map((p) => (
        <li key={p} className="mb-1">
          <span className="badge bg-light text-dark">{p}</span>
        </li>
      ))}
    </ul>
  );
}

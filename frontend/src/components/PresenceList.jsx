import React from "react";

export default function PresenceList({ participants = [] }) {
  if (!participants || participants.length === 0) {
    return <div className="text-muted">No one online</div>;
  }
  return (
    <ul className="list-unstyled mb-0">
      {participants.map((p) => (
        <li key={p.id} className="mb-1 d-flex align-items-center">
          <span className="badge bg-light text-dark me-2" title={p.id}>
            {p.username ? p.username.charAt(0).toUpperCase() : "U"}
          </span>
          <div>
            <div className="fw-semibold">{p.username || p.id}</div>
            <div className="small text-muted">{p.id}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

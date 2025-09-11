import React from "react";

export default function DocList({ docs = [], onCreateSuccess, onOpen, api }) {
  const createDoc = async () => {
    const title = prompt("Document title");
    if (!title) return;
    try {
      const res = await fetch(`${api}/api/documents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const j = await res.json();
      onCreateSuccess(j);
    } catch (e) {
      console.error(e);
      alert("Failed to create document");
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Documents</h6>
        <button className="btn btn-sm btn-success" onClick={createDoc}>
          New
        </button>
      </div>

      <ul className="list-group">
        {docs.map((d) => (
          <li
            key={d.id}
            className="list-group-item d-flex justify-content-between align-items-start"
          >
            <div>
              <div className="fw-bold">{d.title}</div>
              <div className="text-muted small">{d.updated_at}</div>
            </div>
            <div>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => onOpen(d)}
              >
                Open
              </button>
            </div>
          </li>
        ))}
        {docs.length === 0 && (
          <li className="list-group-item text-muted">No documents yet</li>
        )}
      </ul>
    </div>
  );
}

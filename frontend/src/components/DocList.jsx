import React from "react";

export default function DocList({ docs = [], onCreateSuccess, onOpen, api }) {
  const createDoc = async () => {
    const title = prompt("Document title");
    if (!title) return;
    const res = await fetch(`${api}/api/documents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const j = await res.json();
    onCreateSuccess(j);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Documents</h6>
        <button className="btn btn-sm btn-brand" onClick={createDoc}>
          New
        </button>
      </div>

      <div className="d-flex flex-column" style={{ gap: 10 }}>
        {docs.length === 0 && (
          <div className="text-muted">No documents yet</div>
        )}
        {docs.map((d) => (
          <div
            key={d.id}
            className="doc-card d-flex justify-content-between align-items-start"
          >
            <div>
              <div className="doc-title">{d.title}</div>
              <div className="doc-meta">{d.updated_at}</div>
            </div>
            <div>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => onOpen(d)}
              >
                Open
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

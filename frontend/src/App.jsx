import React, { useEffect, useRef, useState } from "react";
import { getSocket } from "./socket";
import Login from "./components/Login";
import DocList from "./components/DocList";
import EditorPane from "./components/EditorPane";
import ChatPanel from "./components/ChatPanel";
import PresenceList from "./components/PresenceList";
import "./index.css";

const DEFAULT_API = import.meta.env.VITE_API_URL || "https://rt-collab-editor-backend.onrender.com";

export default function App() {
  const [api] = useState(DEFAULT_API);
  const [user, setUser] = useState(null);
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [participants, setParticipants] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    fetch(`${api}/api/documents`)
      .then((r) => r.json())
      .then(setDocs)
      .catch(console.error);
    socketRef.current = getSocket(api, {
      userId: user.userId,
      username: user.username,
    });
    const s = socketRef.current;
    s.on("presence:update", ({ participants }) =>
      setParticipants(participants || [])
    );
    s.on("disconnect", () => setParticipants([]));
    return () => {
      if (s) {
        s.off("presence:update");
        s.off("disconnect");
      }
    };
  }, [api, user]);

  const handleLogin = (u) => setUser(u);
  const handleCreateDoc = (doc) => setDocs((p) => [doc, ...p]);
  const handleOpenDoc = (doc) => setSelectedDoc(doc);

  return (
    <>
      {!user ? (
        <div
          className="d-flex align-items-center justify-content-center"
          style={{ height: "100vh" }}
        >
          <div
            className="card p-4"
            style={{
              width: 520,
              borderRadius: 14,
              boxShadow: "var(--card-shadow)",
            }}
          >
            <div className="d-flex align-items-center mb-3">
              <div className="logo brand" style={{ marginRight: 12 }}>
                <div
                  className="logo"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    color: "#fff",
                    background:
                      "linear-gradient(135deg,var(--accent),var(--accent-2))",
                  }}
                >
                  RT
                </div>
              </div>
              <div>
                <h4 className="mb-0">Realtime Collab</h4>
                <div className="small-muted">Collaborative editing & chat</div>
              </div>
            </div>
            <Login onLogin={handleLogin} api={api} />
          </div>
        </div>
      ) : (
        <div className="app-shell">
          <aside className="sidebar">
            <div className="app-header">
              <div className="brand">
                <div className="logo">RT</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{user.username}</div>
                  <div className="small-muted">Active now</div>
                </div>
              </div>
              <div>
                <button
                  className="btn btn-sm btn-outline-soft"
                  onClick={() => {
                    // logout
                    setUser(null);
                    setSelectedDoc(null);
                    if (socketRef.current) socketRef.current.disconnect();
                    socketRef.current = null;
                  }}
                >
                  Logout
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <DocList
                docs={docs}
                onCreateSuccess={handleCreateDoc}
                onOpen={handleOpenDoc}
                api={api}
              />
            </div>

            <div style={{ marginTop: 18 }}>
              <h6 className="mb-2">Presence</h6>
              <PresenceList participants={participants} />
            </div>
          </aside>

          <main className="main">
            {!selectedDoc ? (
              <div
                style={{
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <h3>Open a document to start editing</h3>
                  <div className="small-muted">
                    Create new doc from the left panel
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div>
                    <h4 className="mb-0">{selectedDoc.title}</h4>
                    <div className="small-muted">
                      Last updated: {selectedDoc.updated_at}
                    </div>
                  </div>
                </div>

                <div className="row" style={{ gap: 20 }}>
                  <div style={{ flex: 1, minWidth: 640 }}>
                    <EditorPane
                      api={api}
                      user={user}
                      documentMeta={selectedDoc}
                      socket={socketRef.current}
                    />
                  </div>
                  <div style={{ width: 360 }}>
                    <ChatPanel
                      api={api}
                      user={user}
                      documentMeta={selectedDoc}
                      socket={socketRef.current}
                    />
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      )}
    </>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { getSocket } from "./socket";
import Login from "./components/Login";
import DocList from "./components/DocList";
import EditorPane from "./components/EditorPane";
import ChatPanel from "./components/ChatPanel";
import PresenceList from "./components/PresenceList";

const DEFAULT_API = "http://localhost:4001";

export default function App() {
  const [api] = useState(DEFAULT_API);
  const [user, setUser] = useState(null);
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [participants, setParticipants] = useState([]);
  const socketRef = useRef(null);

  // when user logs in, create socket and fetch docs
  useEffect(() => {
    if (!user) return;
    // fetch docs
    fetch(`${api}/api/documents`)
      .then((r) => r.json())
      .then(setDocs)
      .catch((e) => console.error(e));

    // create or reuse socket
    socketRef.current = getSocket(api, {
      userId: user.userId,
      username: user.username,
    });

    // presence updates
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
  const handleCreateDoc = (doc) => setDocs((prev) => [doc, ...prev]);
  const handleOpenDoc = (doc) => setSelectedDoc(doc);

  return (
    <div className="d-flex vh-100">
      {!user ? (
        <div className="container my-auto">
          <div className="row justify-content-center">
            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-body">
                  <Login onLogin={handleLogin} api={api} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <aside className="border-end bg-white" style={{ width: 320 }}>
            <div className="p-3">
              <div className="d-flex align-items-center mb-3">
                <div>
                  <h5 className="mb-0">Hello, {user.username}</h5>
                  <small className="text-muted">Realtime Collab</small>
                </div>
              </div>

              <DocList
                docs={docs}
                onCreateSuccess={handleCreateDoc}
                onOpen={handleOpenDoc}
                api={api}
              />

              <div className="mt-3">
                <h6 className="mb-2">Participants</h6>
                <PresenceList participants={participants} api={api} />
              </div>
            </div>
          </aside>

          <main className="flex-grow-1 p-4">
            {!selectedDoc ? (
              <div className="h-100 d-flex align-items-center justify-content-center">
                <div>
                  <h4>Select a document to open</h4>
                  <p className="text-muted">Create one from the left panel.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h4 className="mb-0">{selectedDoc.title}</h4>
                  <div>
                    <small className="text-muted me-3">
                      Version: {/* optional display */}
                    </small>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => {
                        // leave doc: emit leave, clear selection
                        const s = socketRef.current;
                        if (s)
                          s.emit(
                            "leave_document",
                            { documentId: selectedDoc.id },
                            () => {}
                          );
                        setSelectedDoc(null);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-8">
                    <div className="card h-100">
                      <div className="card-body">
                        <EditorPane
                          api={api}
                          user={user}
                          documentMeta={selectedDoc}
                          socket={socketRef.current}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="card h-100">
                      <div className="card-body">
                        <ChatPanel
                          api={api}
                          user={user}
                          documentMeta={selectedDoc}
                          socket={socketRef.current}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </>
      )}
    </div>
  );
}

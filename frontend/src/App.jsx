import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";

const API = "http://localhost:4000";

function Login({ onLogin }) {
  const [name, setName] = useState("");
  return (
    <div style={{ padding: 20 }}>
      <h2>Login (username only)</h2>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="username"
      />
      <button
        onClick={async () => {
          if (!name) return alert("enter username");
          const res = await fetch(API + "/api/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ username: name }),
          });
          const j = await res.json();
          onLogin(j);
        }}
      >
        Login
      </button>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [docs, setDocs] = useState([]);
  const [selected, setSelected] = useState(null);
  const socketRef = useRef(null);
  const [chat, setChat] = useState([]);
  const [content, setContent] = useState("");
  const [version, setVersion] = useState(0);
  const [participants, setParticipants] = useState([]);
  const editorRef = useRef();

  useEffect(() => {
    if (!user) return;

    fetch(API + "/api/documents")
      .then((r) => r.json())
      .then(setDocs);

    const socket = io(API, {
      auth: { userId: user.userId, username: user.username },
    });
    socketRef.current = socket;

    socket.on("connect", () => console.log("connected", socket.id));
    socket.on("presence:update", ({ participants }) =>
      setParticipants(participants)
    );
    socket.on("editor_patch", ({ content, version }) => {
      setContent(content);
      setVersion(version);
      if (editorRef.current) editorRef.current.innerText = content;
    });
    socket.on("chat_message", (msg) => setChat((prev) => [...prev, msg]));
    socket.on("sync_required", (snapshot) => {
      setContent(snapshot.content || "");
      setVersion(snapshot.version || 0);
      if (editorRef.current)
        editorRef.current.innerText = snapshot.content || "";
    });

    return () => socket.disconnect();
  }, [user]);

  async function createDoc() {
    const title = prompt("Document title");
    if (!title) return;
    const res = await fetch(API + "/api/documents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const d = await res.json();
    setDocs([d, ...docs]);
  }

  async function openDoc(doc) {
    setSelected(doc);
    socketRef.current.emit("join_document", { documentId: doc.id }, (resp) => {
      if (!resp.ok) return alert(resp.error || "failed to join");
      setContent(resp.document.content || "");
      setVersion(resp.document.version || 0);
      setChat(resp.chat || []);
      if (editorRef.current)
        editorRef.current.innerText = resp.document.content || "";
    });
  }

  function sendEdit() {
    const text = editorRef.current.innerText;
    socketRef.current.emit(
      "editor_change",
      {
        documentId: selected.id,
        content: text,
        clientVersion: version,
      },
      (ack) => {
        if (ack && ack.ok) setVersion(ack.version);
      }
    );
  }

  function sendChat() {
    const msg = prompt("message");
    if (!msg) return;
    socketRef.current.emit(
      "chat_message",
      { documentId: selected.id, body: msg },
      (ack) => {
        if (!ack || !ack.ok) alert("chat failed");
      }
    );
  }

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ width: 260, borderRight: "1px solid #ddd", padding: 12 }}>
        <h3>Welcome, {user.username}</h3>
        <button onClick={createDoc}>Create Document</button>
        <h4>Documents</h4>
        <ul>
          {docs.map((d) => (
            <li key={d.id} style={{ marginBottom: 8 }}>
              <div>
                <b>{d.title}</b>
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>{d.updated_at}</div>
              <button onClick={() => openDoc(d)}>Open</button>
            </li>
          ))}
        </ul>
        <h4>Active Participants</h4>
        <ul>
          {participants.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      <div style={{ flex: 1, padding: 12 }}>
        {!selected ? (
          <div>Select a document to open</div>
        ) : (
          <>
            <h2>{selected.title}</h2>
            <div>
              <div
                ref={editorRef}
                contentEditable
                onInput={() => setContent(editorRef.current.innerText)}
                style={{
                  minHeight: 300,
                  border: "1px solid #ccc",
                  padding: 12,
                }}
              />
              <div style={{ marginTop: 8 }}>
                <button onClick={sendEdit}>Save (send)</button>
                <button
                  onClick={() =>
                    socketRef.current.emit(
                      "leave_document",
                      { documentId: selected.id },
                      () => {}
                    )
                  }
                >
                  Leave
                </button>
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", gap: 20 }}>
              <div style={{ width: 300 }}>
                <h4>Chat</h4>
                <div
                  style={{
                    border: "1px solid #eee",
                    height: 200,
                    overflowY: "auto",
                    padding: 8,
                  }}
                >
                  {chat.map((m) => (
                    <div key={m.id}>
                      <b>{m.username}:</b> {m.body}
                    </div>
                  ))}
                </div>
                <button onClick={sendChat}>Send Chat</button>
              </div>

              <div style={{ flex: 1 }}>
                <h4>Presence</h4>
                <ul>
                  {participants.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

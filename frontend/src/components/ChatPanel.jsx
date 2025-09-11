import React, { useEffect, useState } from "react";

export default function ChatPanel({ api, user, documentMeta, socket }) {
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!documentMeta) return;
    fetch(`${api}/api/documents/${documentMeta.id}?chatLimit=50`)
      .then((r) => r.json())
      .then((j) => setChat(j.chat || []))
      .catch(console.error);
  }, [api, documentMeta]);

  useEffect(() => {
    if (!socket) return;
    const onMsg = (msg) => setChat((p) => [...p, msg]);
    socket.on("chat_message", onMsg);
    return () => socket.off("chat_message", onMsg);
  }, [socket]);

  const sendChat = () => {
    if (!input.trim()) return;
    socket.emit(
      "chat_message",
      { documentId: documentMeta.id, body: input.trim() },
      (ack) => {
        if (!ack || !ack.ok) return alert("Chat failed");
        setInput("");
      }
    );
  };

  return (
    <div>
      <h6 className="mb-2">Chat</h6>
      <div
        className="border rounded p-2 mb-2"
        style={{ height: 300, overflowY: "auto" }}
      >
        {chat.map((m) => (
          <div key={m.id} className="mb-2">
            <div className="small text-muted">
              {m.username || "anon"} •{" "}
              <small>{new Date(m.created_at).toLocaleString()}</small>
            </div>
            <div>{m.body}</div>
          </div>
        ))}
      </div>

      <div className="d-flex gap-2">
        <input
          className="form-control"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message"
        />
        <button className="btn btn-primary" onClick={sendChat}>
          Send
        </button>
      </div>
    </div>
  );
}

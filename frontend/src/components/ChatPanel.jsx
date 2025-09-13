import React, { useEffect, useState, useRef } from "react";

export default function ChatPanel({ api, user, documentMeta, socket }) {
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef();

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

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat]);

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
      <div className="chat-box mb-2" ref={scrollRef}>
        {chat.map((m) => (
          <div key={m.id} className="chat-msg">
            <div className="d-flex justify-content-between">
              <div className="fw-semibold">{m.username || "anon"}</div>
              <div className="small-muted">
                {new Date(m.created_at).toLocaleTimeString()}
              </div>
            </div>
            <div>{m.body}</div>
          </div>
        ))}
      </div>

      <div className="d-flex gap-2">
        <input
          className="form-control chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write a message..."
        />
        <button className="btn btn-brand" onClick={sendChat}>
          Send
        </button>
      </div>
    </div>
  );
}

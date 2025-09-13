// frontend/src/components/EditorPane.jsx
import React, { useEffect, useRef, useState } from "react";

export default function EditorPane({ api, user, documentMeta, socket }) {
  const editorRef = useRef();
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);

  // typing/autosave timers
  const typingTimer = useRef(null);
  const autosaveTimer = useRef(null);
  const lastTypingSent = useRef(0);
  const TYPING_DEBOUNCE_MS = 1500; // send typing:false after this idle time
  const AUTOSAVE_DEBOUNCE_MS = 1000; // autosave after user stops typing for this ms

  // who is typing (map userId -> { username, ts })
  const [typingUsers, setTypingUsers] = useState([]);

  // join document when metadata & socket available
  useEffect(() => {
    if (!documentMeta || !socket) return;
    socket.emit("join_document", { documentId: documentMeta.id }, (resp) => {
      if (!resp.ok) return alert(resp.error || "Failed to join");
      editorRef.current.innerText = resp.document.content || "";
      setVersion(resp.document.version || 0);
    });
  }, [documentMeta, socket]);

  // receive patches / sync messages
  useEffect(() => {
    if (!socket) return;
    const onPatch = ({ content, version: newVersion }) => {
      if (editorRef.current) editorRef.current.innerText = content;
      setVersion(newVersion);
    };

    const onSync = (snapshot) => {
      if (editorRef.current)
        editorRef.current.innerText = snapshot.content || "";
      setVersion(snapshot.version || 0);
    };

    const onTyping = ({ userId: tUserId, username, typing, ts }) => {
      // ignore own typing events
      if (tUserId === (user && user.userId)) return;

      setTypingUsers((prev) => {
        // copy
        const copy = prev.filter((p) => p.userId !== tUserId);
        if (typing) {
          copy.push({
            userId: tUserId,
            username: username || tUserId,
            ts: ts || Date.now(),
          });
        }
        return copy;
      });

      // prune stale typing entries after a short delay
      setTimeout(() => {
        setTypingUsers((prev2) =>
          prev2.filter((p) => Date.now() - (p.ts || 0) < 5000)
        );
      }, 2000);
    };

    socket.on("editor_patch", onPatch);
    socket.on("sync_required", onSync);
    socket.on("typing:update", onTyping);

    return () => {
      socket.off("editor_patch", onPatch);
      socket.off("sync_required", onSync);
      socket.off("typing:update", onTyping);
    };
  }, [socket, user]);

  // utility: emit typing true/false with light throttling
  const emitTyping = (isTyping) => {
    if (!socket || !documentMeta) return;
    const now = Date.now();
    // throttle start events slightly to avoid spamming
    if (isTyping && now - lastTypingSent.current < 500) return;
    lastTypingSent.current = now;
    socket.emit("typing", { documentId: documentMeta.id, typing: !!isTyping });
  };

  // autosave/send edit
  const sendEditNow = () => {
    if (!socket || !documentMeta) return;
    const text = editorRef.current.innerText;
    // set saving flag for UX
    setSaving(true);
    socket.emit(
      "editor_change",
      { documentId: documentMeta.id, content: text, clientVersion: version },
      (ack) => {
        setSaving(false);
        if (ack && ack.ok) {
          setVersion(ack.version);
        } else if (ack && ack.error === "version_mismatch" && ack.snapshot) {
          // server suggested snapshot
          if (editorRef.current)
            editorRef.current.innerText = ack.snapshot.content || "";
          setVersion(ack.snapshot.version || 0);
        }
      }
    );
  };

  // input handler: schedule autosave, handle typing indicator
  const onInput = () => {
    // clear previous autosave timer
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      sendEditNow();
    }, AUTOSAVE_DEBOUNCE_MS);

    // typing indicator: send typing:true immediately (throttled)
    emitTyping(true);

    // clear previous typing timer and set new to send typing:false after idle
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      emitTyping(false);
    }, TYPING_DEBOUNCE_MS);
  };

  // cleanup on unmount: ensure we send typing:false and clear timers
  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      if (socket && documentMeta) {
        socket.emit("typing", { documentId: documentMeta.id, typing: false });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // small UI: show who is typing (names)
  const typingText = () => {
    if (!typingUsers || typingUsers.length === 0) return null;
    const names = typingUsers.map((p) => p.username || p.userId);
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names[0]} and ${names.length - 1} others are typing...`;
  };

  return (
    <div>
      <div className="mb-2 d-flex justify-content-between">
        <div className="small-muted">
          Editing as <strong>{user.username}</strong>
        </div>
        <div>
          <span className="small-muted me-3">Version: {version}</span>
          <button
            className="btn btn-sm btn-brand"
            onClick={sendEditNow}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        className="editor"
        suppressContentEditableWarning
        onInput={onInput}
        // optional: onKeyUp or onMouseUp to emit cursor updates
      />

      <div style={{ marginTop: 8, minHeight: 22 }}>
        <div className="small-muted">{typingText()}</div>
      </div>
    </div>
  );
}

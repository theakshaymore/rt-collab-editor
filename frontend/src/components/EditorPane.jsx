import React, { useEffect, useRef, useState } from "react";

export default function EditorPane({ api, user, documentMeta, socket }) {
  const editorRef = useRef();
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!documentMeta || !socket) return;
    socket.emit("join_document", { documentId: documentMeta.id }, (resp) => {
      if (!resp.ok) return alert(resp.error || "Failed to join");
      editorRef.current.innerText = resp.document.content || "";
      setVersion(resp.document.version || 0);
    });
  }, [documentMeta, socket]);

  useEffect(() => {
    if (!socket) return;
    const onPatch = ({ content, version: newVersion }) => {
      if (editorRef.current) editorRef.current.innerText = content;
      setVersion(newVersion);
    };
    socket.on("editor_patch", onPatch);
    socket.on("sync_required", (snapshot) => {
      if (editorRef.current)
        editorRef.current.innerText = snapshot.content || "";
      setVersion(snapshot.version || 0);
    });
    return () => {
      socket.off("editor_patch", onPatch);
      socket.off("sync_required");
    };
  }, [socket]);

  const sendEdit = () => {
    const text = editorRef.current.innerText;
    if (!socket) return;
    setSaving(true);
    socket.emit(
      "editor_change",
      { documentId: documentMeta.id, content: text, clientVersion: version },
      (ack) => {
        setSaving(false);
        if (ack && ack.ok) setVersion(ack.version);
      }
    );
  };

  return (
    <div>
      <div className="mb-2 d-flex justify-content-between">
        <div className="small-muted">
          Editing as <strong>{user.username}</strong>
        </div>
        <div>
          <button className="btn btn-sm btn-outline-soft me-2">Share</button>
          <button className={`btn btn-sm btn-brand`} onClick={sendEdit}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        className="editor"
        suppressContentEditableWarning
        onInput={() => {}}
      />
      <div className="small-muted mt-2">Version: {version}</div>
    </div>
  );
}

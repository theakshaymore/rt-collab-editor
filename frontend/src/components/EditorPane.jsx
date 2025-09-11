import React, { useEffect, useRef, useState } from "react";

export default function EditorPane({ api, user, documentMeta, socket }) {
  const editorRef = useRef();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!documentMeta || !socket) return;
    socket.emit("join_document", { documentId: documentMeta.id }, (resp) => {
      if (!resp.ok) return alert(resp.error || "Failed to join");
      editorRef.current.innerText = resp.document.content || "";
      setVersion(resp.document.version || 0);
    });
    // cleanup handled in parent on close
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
      socket.off("editor_patch");
      socket.off("sync_required");
    };
  }, [socket]);

  const sendEdit = () => {
    const text = editorRef.current.innerText;
    if (!socket) return;
    socket.emit(
      "editor_change",
      { documentId: documentMeta.id, content: text, clientVersion: version },
      (ack) => {
        if (ack && ack.ok) setVersion(ack.version);
        else if (ack && ack.error === "version_mismatch") {
          // server will send sync_required
        }
      }
    );
  };

  return (
    <div>
      <div className="mb-2">
        <small className="text-muted">
          Editing as <strong>{user.username}</strong>
        </small>
      </div>

      <div
        ref={editorRef}
        contentEditable
        className="form-control"
        style={{ minHeight: 320, whiteSpace: "pre-wrap", overflowY: "auto" }}
        onInput={() => {}}
      />

      <div className="mt-2 d-flex justify-content-between">
        <div className="text-muted">Version: {version}</div>
        <div>
          <button className="btn btn-sm btn-primary me-2" onClick={sendEdit}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

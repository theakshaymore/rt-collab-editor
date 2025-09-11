import React, { useState } from "react";

export default function Login({ onLogin, api }) {
  const [name, setName] = useState("");

  const doLogin = async () => {
    if (!name.trim()) return alert("Please enter username");
    try {
      const res = await fetch(`${api}/api/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: name.trim() }),
      });
      const j = await res.json();
      if (j.userId) onLogin(j);
      else alert("Login failed");
    } catch (e) {
      console.error(e);
      alert("Login error");
    }
  };

  return (
    <div>
      <h3 className="mb-3">Sign in</h3>
      <div className="mb-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="form-control"
          placeholder="Enter a username"
        />
      </div>
      <div className="d-flex justify-content-between">
        <button className="btn btn-primary" onClick={doLogin}>
          Login
        </button>
        <button
          className="btn btn-outline-secondary"
          onClick={() => setName("")}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

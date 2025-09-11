const express = require("express");
const http = require("http");
const cors = require("cors");
const morgan = require("morgan");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter"); // optional if adapter installed
const Redis = require("ioredis");
const path = require("path");

//
const db = require("./db");
const redis = require("./redis");
const sockets = require("./sockets");

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// simple routes: login, docs
const Joi = require("joi");
const { v4: uuidv4 } = require("uuid");

app.post("/api/login", async (req, res) => {
  const schema = Joi.object({
    username: Joi.string().min(1).max(32).required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const { username } = value;
  // create or return user
  const r = await db.query(
    "SELECT id, username FROM users WHERE username = $1",
    [username]
  );
  let user;
  if (r.rows.length) {
    user = r.rows[0];
  } else {
    const ins = await db.query(
      "INSERT INTO users (username) VALUES ($1) RETURNING id, username",
      [username]
    );
    user = ins.rows[0];
  }

  // store mapping in Redis for quick username lookup from userId
  try {
    await redis.set(`user:name:${user.id}`, user.username);
    // optional: set a TTL if you want ephemeral mapping, e.g. 7 days
    // await redis.expire(`user:name:${user.id}`, 60 * 60 * 24 * 7);
  } catch (e) {
    console.warn("redis set user name failed", e.message);
  }

  return res.json({ userId: user.id, username: user.username });
});

app.post("/api/documents", async (req, res) => {
  const schema = Joi.object({ title: Joi.string().min(1).max(200).required() });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const { title } = value;
  const r = await db.query(
    "INSERT INTO documents (title) VALUES ($1) RETURNING id, title, updated_at",
    [title]
  );
  res.json(r.rows[0]);
});

app.get("/api/documents", async (req, res) => {
  const r = await db.query(
    "SELECT id, title, updated_at, version FROM documents ORDER BY updated_at DESC LIMIT 100"
  );
  // attach presence count from redis
  const docs = await Promise.all(
    r.rows.map(async (d) => {
      const count = await redis.scard(`presence:doc:${d.id}`);
      return { ...d, activeParticipants: count };
    })
  );
  res.json(docs);
});

app.get("/api/documents/:id", async (req, res) => {
  const docId = req.params.id;
  const limit = parseInt(req.query.chatLimit || "50", 10);
  const r = await db.query(
    "SELECT id, title, content, version, updated_at FROM documents WHERE id = $1",
    [docId]
  );
  if (!r.rows.length) return res.status(404).json({ error: "not found" });
  const doc = r.rows[0];
  const chat = await db.query(
    `SELECT cm.id, cm.body, cm.created_at, u.username
     FROM chat_messages cm LEFT JOIN users u ON u.id = cm.author_id
     WHERE cm.document_id = $1 ORDER BY cm.created_at DESC LIMIT $2`,
    [docId, limit]
  );
  res.json({ document: doc, chat: chat.rows.reverse() });
});

// http server + socket.io
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// optional Redis adapter (requires @socket.io/redis-adapter installed & REDIS_URL)
if (process.env.REDIS_URL) {
  const pubClient = new Redis(process.env.REDIS_URL);
  const subClient = pubClient.duplicate();
  try {
    io.adapter(createAdapter(pubClient, subClient));
  } catch (e) {
    console.warn("Redis adapter not set up (optional):", e.message);
  }
}

// attach socket handlers
sockets(io, { db, redis });

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log("Backend listening on", PORT));

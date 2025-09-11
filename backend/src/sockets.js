// sockets.js - minimal handlers: join_document, editor_change, cursor_update, chat_message
const { v4: uuidv4 } = require("uuid");

module.exports = (io, { db, redis }) => {
  // in-memory debounce timers and latest content per doc (for demo simplicity)
  const pendingSaveTimers = {}; // docId -> timeout
  const latestDocCache = {}; // docId -> { content, version }

  // helper to fetch usernames for a list of userIds (returns array of {id, username})
  async function buildParticipantsList(redisClient, userIds) {
    if (!userIds || userIds.length === 0) return [];
    const keys = userIds.map((id) => `user:name:${id}`);
    // mget returns array of values (or null) in same order
    let names;
    try {
      names = await redisClient.mget(...keys);
    } catch (e) {
      console.warn("redis mget failed", e.message);
      // fallback: return ids as username
      return userIds.map((id) => ({ id, username: id }));
    }
    return userIds.map((id, idx) => {
      return { id, username: names && names[idx] ? names[idx] : id };
    });
  }

  io.on("connection", (socket) => {
    // expect { userId, username } in auth
    const { userId, username } = socket.handshake.auth || {};
    if (!userId || !username) {
      socket.disconnect(true);
      return;
    }

    // add to global active users set
    redis.sadd("active_users", userId);

    socket.on("join_document", async ({ documentId }, ack) => {
      try {
        // validate doc exists
        const r = await db.query(
          "SELECT id, title, content, version FROM documents WHERE id = $1",
          [documentId]
        );
        if (!r.rows.length)
          return ack && ack({ ok: false, error: "document not found" });

        socket.join(`doc:${documentId}`);

        // add to presence set
        await redis.sadd(`presence:doc:${documentId}`, userId);

        // build participants list with usernames
        const ids = await redis.smembers(`presence:doc:${documentId}`);
        const participants = await buildParticipantsList(redis, ids);
        io.to(`doc:${documentId}`).emit("presence:update", { participants });

        // load snapshot (prefer in-memory cache -> redis -> db)
        let snapshot = latestDocCache[documentId];
        if (!snapshot) {
          const cached = await redis.get(`doc:cache:${documentId}`);
          if (cached) snapshot = JSON.parse(cached);
          else snapshot = r.rows[0];
          latestDocCache[documentId] = snapshot;
        }
        // return snapshot + recent chat
        const chatRes = await db.query(
          `SELECT cm.id, cm.body, cm.created_at, u.username
           FROM chat_messages cm LEFT JOIN users u ON u.id = cm.author_id
           WHERE cm.document_id = $1 ORDER BY cm.created_at DESC LIMIT 50`,
          [documentId]
        );
        ack &&
          ack({ ok: true, document: snapshot, chat: chatRes.rows.reverse() });
      } catch (err) {
        console.error("join_document err", err);
        ack && ack({ ok: false, error: err.message });
      }
    });

    socket.on("leave_document", async ({ documentId }) => {
      socket.leave(`doc:${documentId}`);
      await redis.srem(`presence:doc:${documentId}`, userId);

      // build participants list with usernames
      const ids = await redis.smembers(`presence:doc:${documentId}`);
      const participants = await buildParticipantsList(redis, ids);
      io.to(`doc:${documentId}`).emit("presence:update", { participants });
    });

    socket.on(
      "editor_change",
      async ({ documentId, content, clientVersion }, ack) => {
        try {
          // fetch current version (prefer in-memory)
          let snapshot = latestDocCache[documentId];
          if (!snapshot) {
            const cached = await redis.get(`doc:cache:${documentId}`);
            if (cached) snapshot = JSON.parse(cached);
            else {
              const r = await db.query(
                "SELECT content, version FROM documents WHERE id = $1",
                [documentId]
              );
              snapshot = r.rows[0] || { content: "", version: 0 };
            }
            latestDocCache[documentId] = snapshot;
          }

          if (clientVersion !== snapshot.version) {
            // client out of sync
            ack && ack({ ok: false, error: "version_mismatch", snapshot });
            socket.emit("sync_required", snapshot);
            return;
          }

          const newVersion = (snapshot.version || 0) + 1;
          const newSnapshot = {
            ...snapshot,
            content,
            version: newVersion,
            updated_at: new Date().toISOString(),
          };
          // update in-memory and redis cache
          latestDocCache[documentId] = newSnapshot;
          await redis.set(
            `doc:cache:${documentId}`,
            JSON.stringify(newSnapshot)
          );

          // broadcast to room
          io.to(`doc:${documentId}`).emit("editor_patch", {
            authorId: userId,
            content,
            version: newVersion,
          });

          // queue persistence with debounce (2s)
          if (pendingSaveTimers[documentId])
            clearTimeout(pendingSaveTimers[documentId]);
          pendingSaveTimers[documentId] = setTimeout(async () => {
            try {
              await db.query(
                "UPDATE documents SET content=$1, version=$2, updated_at=now(), last_edited_by=$3 WHERE id=$4",
                [newSnapshot.content, newSnapshot.version, userId, documentId]
              );
              // optionally insert into document_versions
              await db.query(
                "INSERT INTO document_versions(document_id, version, content, created_by) VALUES($1,$2,$3,$4)",
                [documentId, newSnapshot.version, newSnapshot.content, userId]
              );
            } catch (e) {
              console.error("persist doc err", e);
            }
          }, 2000);

          ack && ack({ ok: true, version: newVersion });
        } catch (err) {
          console.error("editor_change err", err);
          ack && ack({ ok: false, error: err.message });
        }
      }
    );

    socket.on("cursor_update", async ({ documentId, cursor }) => {
      // cursor: { pos, selStart, selEnd }
      const key = `cursor:doc:${documentId}`;
      // store small JSON per user
      await redis.hset(
        key,
        userId,
        JSON.stringify({ username, cursor, last_updated: Date.now() })
      );
      await redis.expire(key, 30); // ephemeral
      io.to(`doc:${documentId}`).emit("cursor_update", {
        userId,
        username,
        cursor,
      });
    });

    socket.on("chat_message", async ({ documentId, body }, ack) => {
      try {
        const r = await db.query(
          "INSERT INTO chat_messages(document_id, author_id, body) VALUES($1,$2,$3) RETURNING id, created_at",
          [documentId, userId, body]
        );
        const msg = {
          id: r.rows[0].id,
          body,
          created_at: r.rows[0].created_at,
          username,
        };
        io.to(`doc:${documentId}`).emit("chat_message", msg);
        ack && ack({ ok: true, message: msg });
      } catch (err) {
        console.error("chat_message err", err);
        ack && ack({ ok: false, error: err.message });
      }
    });

    socket.on("disconnect", async () => {
      // remove from all presence sets it's tricky to find which docs; for demo we remove from global and leave.
      await redis.srem("active_users", userId);
      // NOTE: presence per document will be cleared by TTL or when users explicitly leave in demo
    });
  });
};

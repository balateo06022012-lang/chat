export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    const match = url.pathname.match(/^\/room\/([^/]+)$/);

    if (!match) {
      return json({ error: "Not found" }, 404);
    }

    const room = decodeURIComponent(match[1]);

    if (request.method === "GET") {
      const after = Number(url.searchParams.get("after") || 0);
      const limit = Math.min(
        Number(url.searchParams.get("limit") || 50),
        100
      );

      const result = await env.DB
        .prepare(`
          SELECT id, userId, name, message, room, created_at
          FROM messages
          WHERE room = ? AND id > ?
          ORDER BY id ASC
          LIMIT ?
        `)
        .bind(room, after, limit)
        .all();

      return json({
        messages: result.results || []
      });
    }

    if (request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const userId = String(body.userId || "");
      const name = String(body.name || "");
      const message = String(body.message || "");

      if (!userId || !name || !message) {
        return json({
          error: "Missing userId, name or message"
        }, 400);
      }

      const result = await env.DB
        .prepare(`
          INSERT INTO messages
          (userId, name, message, room, created_at)
          VALUES (?, ?, ?, ?, ?)
        `)
        .bind(
          userId,
          name,
          message,
          room,
          Date.now()
        )
        .run();

      return json({
        ok: true,
        id: result.meta.last_row_id
      });
    }

    return json({ error: "Method not allowed" }, 405);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

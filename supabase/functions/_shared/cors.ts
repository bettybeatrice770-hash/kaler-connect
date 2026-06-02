// Shared CORS helper — only the whitelisted production origins are allowed.
// Used by every edge function in this project.

const allowedOrigins = [
  "https://knwa.netlify.app",
  "https://preview--kaler-connect.lovable.app",
  "https://kaler-connect.lovable.app",
];

const baseCors = {
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Vary": "Origin",
};

/** Returns the CORS headers to use for this request, or null if the origin is not allowed. */
export function corsHeadersFor(req: Request): Record<string, string> | null {
  const origin = req.headers.get("origin");
  if (!origin) {
    // Non-browser callers (curl, server-to-server, edge-to-edge) — no CORS headers needed.
    return { ...baseCors };
  }
  // Match exactly OR allow Lovable sandbox previews (id-preview--*.lovable.app)
  const normalized = origin.replace(/\/$/, "");
  const isLovablePreview = /^https:\/\/[a-z0-9-]+--kaler-connect\.lovable\.app$/.test(normalized) ||
                            /^https:\/\/id-preview--[a-z0-9-]+\.lovable\.app$/.test(normalized);
  if (allowedOrigins.includes(normalized) || isLovablePreview) {
    return { ...baseCors, "Access-Control-Allow-Origin": normalized };
  }
  return null;
}

/** Standard preflight + rejection handler. Returns a Response if the request should short-circuit, else null. */
export function handlePreflight(req: Request): Response | null {
  const headers = corsHeadersFor(req);
  if (!headers) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }
  return null;
}

/** Build a JSON response with the right CORS headers for the request. */
export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  const headers = corsHeadersFor(req) ?? {};
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

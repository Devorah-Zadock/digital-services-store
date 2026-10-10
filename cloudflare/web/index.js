// Runs only when no static file matches the request (static files are
// served directly, free). Maps a folder address like "/" to its
// index.html — the one thing html_handling = "none" doesn't do — so every
// URL behaves exactly as it did on Vercel.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/")) {
      url.pathname += "index.html";
      const res = await env.ASSETS.fetch(new Request(url.toString(), request));
      if (res.status === 200) return res;
    }
    return new Response("not found", { status: 404, headers: { "Content-Type": "text/plain; charset=UTF-8" } });
  },
};

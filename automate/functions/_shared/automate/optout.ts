// DeskKit Automate — "stop emailing me" for a business's clients.
//
// Every email to a client carries a signed link (business + address). The
// signature key is derived from the project's service key, so no extra
// secret is needed and a link can't be forged or pointed at another address.
// An address that opted out gets no more automated emails from that
// business — checked when a message is prepared AND again just before it
// is sent.

const enc = new TextEncoder();
let keyP: Promise<CryptoKey> | null = null;

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function key(): Promise<CryptoKey> {
  if (!keyP) {
    keyP = (async () => {
      const base = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      if (!base) throw new Error("no service key");
      const raw = await crypto.subtle.digest("SHA-256", enc.encode("deskkit-automate-optout-v1:" + base));
      return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
    })();
  }
  return keyP;
}

export function normEmail(e: string): string {
  return String(e || "").trim().toLowerCase();
}

export async function optoutToken(userId: string, email: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify({ u: userId, e: normEmail(email) })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(), enc.encode(body)));
  return body + "." + b64url(sig.slice(0, 18));
}

export async function readOptoutToken(t: string): Promise<{ userId: string; email: string } | null> {
  const m = /^([A-Za-z0-9_-]{10,600})\.([A-Za-z0-9_-]{24})$/.exec(String(t || ""));
  if (!m) return null;
  try {
    const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(), enc.encode(m[1]))).slice(0, 18);
    const got = fromB64url(m[2]);
    if (got.length !== sig.length) return null;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig[i] ^ got[i];
    if (diff) return null;
    const o = JSON.parse(new TextDecoder().decode(fromB64url(m[1])));
    if (typeof o?.u !== "string" || typeof o?.e !== "string" || !/^[0-9a-f-]{36}$/.test(o.u)) return null;
    return { userId: o.u, email: normEmail(o.e) };
  } catch {
    return null;
  }
}

// Page link (shown in the email footer) and one-click endpoint (mail apps' "unsubscribe" button).
export async function optoutLinks(publicBaseUrl: string, supabaseUrl: string, userId: string, email: string) {
  const t = await optoutToken(userId, email);
  return {
    page: `${publicBaseUrl}/optout.html?t=${t}`,
    oneClick: `${supabaseUrl}/functions/v1/client-optout?t=${t}`,
  };
}

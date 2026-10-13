// Unit tests for the site-ai-command validator: `deno test supabase/functions/_shared/site-ai-ops_test.ts`.
// No imports beyond the module itself (no network needed to run them).

import { cleanText, MAX_OPS, normalizeHex, parseSiteContext, validateCommandResult, type SiteContext } from "./site-ai-ops.ts";

function eq(actual: unknown, expected: unknown, msg = "") {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg}\n  expected: ${e}\n  actual:   ${a}`);
}
function ok(cond: unknown, msg = "") {
  if (!cond) throw new Error("assertion failed " + msg);
}

function ctx(over: Partial<SiteContext> = {}): SiteContext {
  return {
    ...parseSiteContext({
      availableTypes: ["hero", "services", "about", "contact"],
      activeTypes: ["hero", "services", "about"],
      variantOptions: { hero: ["default", "centered"], services: ["default", "grid"] },
      textFields: { businessName: "Dana Studio", heroTitle: "", tagline: "Hair & color", about: "We are a long about text.", servicesHeading: "", phone: "050-1234567", email: "a@b.co" },
      fonts: [{ key: "heebo", name: "Heebo" }, { key: "frankRuhl", name: "Frank Ruhl Libre" }],
      services: [{ name: "Cut", desc: "Short cut", price: "100" }, { name: "Color", desc: "", price: "" }],
      images: { hero: true, gallery: 0 },
      siteLang: "he",
    }),
    ...over,
  };
}

Deno.test("parseSiteContext caps and filters hostile context", () => {
  const c = parseSiteContext({
    availableTypes: ["hero", 5, "<script>", "a".repeat(200), "services"],
    activeTypes: "hero",
    variantOptions: { hero: ["centered", { x: 1 }], "bad key!": ["x"] },
    textFields: { about: "x".repeat(5000), __proto__: "y", notAField: "z", phone: 12345 },
    fonts: ["heebo", { key: "rubik", name: "R".repeat(500) }, { key: "evil;font" }, "heebo"],
    services: Array.from({ length: 50 }, () => ({ name: "n".repeat(100), desc: 3 })),
    images: { hero: "yes", gallery: 9999 },
    siteLang: "fr",
  });
  eq(c.availableTypes, ["hero", "services"]);
  eq(c.activeTypes, []);
  eq(c.variantOptions, { hero: ["centered"] });
  eq(Object.keys(c.textFields).sort(), ["about", "phone"]);
  eq(c.textFields.about.length, 500);
  eq(c.textFields.phone, "");
  eq(c.fonts.map((f) => f.key), ["heebo", "rubik"]);
  ok(c.fonts[1].name.length <= 40);
  eq(c.services.length, 20);
  eq(c.services[0].name.length, 40);
  eq(c.images, { hero: false, gallery: 20 });
  eq(c.siteLang, "he");
});

Deno.test("helpers: hex + text cleaning", () => {
  eq(normalizeHex("#2563eb"), "#2563EB");
  eq(normalizeHex("abc"), "#AABBCC");
  eq(normalizeHex("blue"), null);
  eq(normalizeHex("#12345"), null);
  eq(normalizeHex("url(javascript:1)"), null);
  eq(cleanText("  a\u0000b ‮c  ", 10), "a b c");
  eq(cleanText("line1\n\n\n\nline2", 50, true), "line1\n\nline2");
  eq(cleanText("line1\nline2", 50, false), "line1 line2");
  eq(cleanText(42, 10), null);
});

Deno.test("legacy single structural op still works and is spread at top level", () => {
  const r = validateCommandResult({ op: "setVariant", type: "hero", variant: "centered", explanation: "Hero centered" }, ctx());
  eq(r.op, "setVariant");
  eq(r.type, "hero");
  eq(r.variant, "centered");
  eq(r.ops, [{ op: "setVariant", type: "hero", variant: "centered" }]);
});

Deno.test("multi-op: colour + rewritten about", () => {
  const r = validateCommandResult({ ops: [
    { op: "setColor", color: "#2563eb" },
    { op: "setText", field: "about", value: "Short about." },
  ], explanation: "Blue + shorter about" }, ctx());
  eq(r.op, "batch");
  eq(r.ops, [{ op: "setColor", color: "#2563EB" }, { op: "setText", field: "about", value: "Short about." }]);
  eq(r.skipped, 0);
});

Deno.test("setFont only accepts listed fonts", () => {
  eq(validateCommandResult({ ops: [{ op: "setFont", font: "frankRuhl" }] }, ctx()).ops, [{ op: "setFont", font: "frankRuhl" }]);
  eq(validateCommandResult({ ops: [{ op: "setFont", font: "Comic Sans" }] }, ctx()).op, "unsupported");
  eq(validateCommandResult({ ops: [{ op: "setFont", font: "rubik" }] }, ctx()).op, "unsupported"); // real font, but not offered by this client
});

Deno.test("setText: only known fields that the client listed; caps; contact formats", () => {
  const c = ctx();
  eq(validateCommandResult({ ops: [{ op: "setText", field: "heroTitle", value: "T".repeat(300) }] }, c).ops, [{ op: "setText", field: "heroTitle", value: "T".repeat(60) }]);
  eq(validateCommandResult({ ops: [{ op: "setText", field: "address", value: "Tel Aviv" }] }, c).op, "unsupported"); // not sent by client
  eq(validateCommandResult({ ops: [{ op: "setText", field: "primaryColor", value: "#000" }] }, c).op, "unsupported");
  eq(validateCommandResult({ ops: [{ op: "setText", field: "__proto__", value: "x" }] }, c).op, "unsupported");
  eq(validateCommandResult({ ops: [{ op: "setText", field: "businessName", value: "   " }] }, c).op, "unsupported");
  eq(validateCommandResult({ ops: [{ op: "setText", field: "email", value: "not an email" }] }, c).op, "unsupported");
  eq(validateCommandResult({ ops: [{ op: "setText", field: "phone", value: "call me maybe" }] }, c).op, "unsupported");
  eq(validateCommandResult({ ops: [{ op: "setText", field: "phone", value: "+972 50-765-4321" }] }, c).ops, [{ op: "setText", field: "phone", value: "+972 50-765-4321" }]);
  eq(validateCommandResult({ ops: [{ op: "setText", field: "tagline", value: { html: "<b>" } }] }, c).op, "unsupported");
  eq(validateCommandResult({ ops: [{ op: "setText", field: "tagline", value: "Hair & color" }] }, c).op, "unsupported"); // no-op
  // headings may be cleared (= template default)
  eq(validateCommandResult({ ops: [{ op: "setText", field: "servicesHeading", value: "" }] }, ctx({ textFields: { servicesHeading: "Old" } })).ops, [{ op: "setText", field: "servicesHeading", value: "" }]);
  // the same field twice: first wins
  const r = validateCommandResult({ ops: [{ op: "setText", field: "tagline", value: "A" }, { op: "setText", field: "tagline", value: "B" }] }, c);
  eq(r.ops, [{ op: "setText", field: "tagline", value: "A" }]);
  eq(r.skipped, 1);
});

Deno.test("services: add / edit / remove with index checks", () => {
  const c = ctx();
  eq(validateCommandResult({ ops: [{ op: "addService", name: "Blow-dry", desc: "Quick", price: "80", extra: "x" }] }, c).ops, [{ op: "addService", name: "Blow-dry", desc: "Quick", price: "80" }]);
  eq(validateCommandResult({ ops: [{ op: "addService", name: "" }] }, c).op, "unsupported");
  eq(validateCommandResult({ ops: [{ op: "editService", index: 1, desc: "Full color" }] }, c).ops, [{ op: "editService", index: 1, desc: "Full color" }]);
  eq(validateCommandResult({ ops: [{ op: "editService", index: 2, name: "x" }] }, c).op, "unsupported");
  eq(validateCommandResult({ ops: [{ op: "editService", index: "0", name: "x" }] }, c).op, "unsupported");
  eq(validateCommandResult({ ops: [{ op: "editService", index: 0.5, name: "x" }] }, c).op, "unsupported");
  eq(validateCommandResult({ ops: [{ op: "editService", index: 0, name: "" }] }, c).op, "unsupported");
  eq(validateCommandResult({ ops: [{ op: "removeService", index: 0 }] }, c).ops, [{ op: "removeService", index: 0 }]);
  // never below one service row
  const both = validateCommandResult({ ops: [{ op: "removeService", index: 0 }, { op: "removeService", index: 1 }] }, c);
  eq(both.ops, [{ op: "removeService", index: 0 }]);
  eq(both.skipped, 1);
  // edit then remove the same row: the remove is dropped
  eq(validateCommandResult({ ops: [{ op: "editService", index: 0, price: "120" }, { op: "removeService", index: 0 }] }, c).ops, [{ op: "editService", index: 0, price: "120" }]);
  // cap on total services
  const full = ctx({ services: Array.from({ length: 12 }, (_, i) => ({ name: "s" + i, desc: "", price: "" })) });
  eq(validateCommandResult({ ops: [{ op: "addService", name: "one more" }] }, full).op, "unsupported");
});

Deno.test("structural ops keep their old rules; only one per answer", () => {
  const c = ctx();
  eq(validateCommandResult({ ops: [{ op: "removeSection", type: "hero" }] }, c).op, "unsupported");
  eq(validateCommandResult({ ops: [{ op: "addSection", type: "services" }] }, c).op, "unsupported");
  eq(validateCommandResult({ ops: [{ op: "addSection", type: "gallery" }] }, c).op, "unsupported");
  eq(validateCommandResult({ ops: [{ op: "reorder", order: ["hero", "about"] }] }, c).op, "unsupported");
  eq(validateCommandResult({ ops: [{ op: "setVariant", type: "about", variant: "grid" }] }, c).op, "unsupported");
  const two = validateCommandResult({ ops: [{ op: "addSection", type: "contact" }, { op: "removeSection", type: "about" }] }, c);
  eq(two.ops, [{ op: "addSection", type: "contact" }]);
  eq(two.skipped, 1);
});

Deno.test("removeImage only when there is one", () => {
  eq(validateCommandResult({ ops: [{ op: "removeImage", target: "hero" }] }, ctx()).ops, [{ op: "removeImage", target: "hero" }]);
  eq(validateCommandResult({ ops: [{ op: "removeImage", target: "gallery" }] }, ctx()).op, "unsupported");
  eq(validateCommandResult({ ops: [{ op: "removeImage", target: "../../etc" }] }, ctx()).op, "unsupported");
});

Deno.test("unsupported answers explain what CAN be done, in the UI language", () => {
  const he = validateCommandResult({ ops: [{ op: "unsupported", reason: "other", explanation: "אין חנות" }] }, ctx(), "he");
  eq(he.op, "unsupported");
  ok(String(he.explanation).startsWith("אין חנות"));
  ok(String(he.explanation).includes("אני יכול"));
  const en = validateCommandResult({ ops: [{ op: "unsupported", reason: "image" }] }, ctx(), "en");
  ok(String(en.explanation).includes("Images & media"));
  // garbage from the model
  for (const g of [null, "x", 42, [], { ops: "nope" }, { op: "deleteSite" }, { ops: [{ op: "eval", code: "1" }] }]) {
    const r = validateCommandResult(g, ctx(), "en");
    eq(r.op, "unsupported", JSON.stringify(g));
    ok(String(r.explanation).includes("I can:"));
    eq(r.ops, undefined);
  }
});

Deno.test("partial: doable ops survive, the image part becomes a note", () => {
  const r = validateCommandResult({ ops: [{ op: "setColor", color: "#000000" }, { op: "unsupported", reason: "image" }] }, ctx(), "he");
  eq(r.op, "setColor");
  eq(r.skipped, 1);
  ok(String(r.note).includes("תמונות ומדיה"));
});

Deno.test("at most MAX_OPS ops are considered", () => {
  const ops = Array.from({ length: MAX_OPS + 4 }, (_, i) => ({ op: "addService", name: "svc " + i }));
  const r = validateCommandResult({ ops }, ctx());
  eq((r.ops as unknown[]).length, MAX_OPS);
  eq(r.skipped, 4);
});

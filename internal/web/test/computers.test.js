import { beforeEach, describe, expect, test, vi } from "vitest";

// computers.js reads localStorage when it loads, so every test imports a fresh copy.
async function load(stored = {}) {
  localStorage.clear();
  for (const [key, value] of Object.entries(stored)) localStorage.setItem(key, value);
  vi.resetModules();
  return import("../static/js/computers.js");
}

const dev = { id: "d1", name: "dev", origin: "https://sessions.example", token: "t-dev" };
const mac = { id: "m1", name: "MacBook Pro de Alexander", origin: "https://10.0.1.154:8787", token: "t-mac" };

function healthResponse(body, ok = true) {
  return { ok, status: ok ? 200 : 404, json: async () => body };
}

describe("parsePairing", () => {
  let parsePairing;
  beforeEach(async () => ({ parsePairing } = await load()));

  test("reads the store apps' pairing link", () => {
    const link = "remotesessions://pair?v=1&id=m1&name=Mac&port=9000&hosts=10.0.1.154,fd00::1&token=abc&fp=xyz";
    expect(parsePairing(link)).toEqual({ token: "abc", id: "m1", name: "Mac", port: "9000", hosts: ["10.0.1.154", "fd00::1"] });
  });

  test("defaults the port to 8787 and allows no hosts", () => {
    expect(parsePairing("remotesessions://pair?token=abc")).toMatchObject({ port: "8787", hosts: [] });
  });

  test("accepts a bare token and trims whitespace", () => {
    expect(parsePairing("  abcdefghijklmnop-123  ")).toEqual({ token: "abcdefghijklmnop-123", hosts: [] });
  });

  test.each(["", "   ", "remotesessions://pair?id=m1", "short", "https://example.com/?token=abc"])("rejects %j", (text) => {
    expect(parsePairing(text)).toBeNull();
  });
});

describe("addresses", () => {
  test("candidateOrigins brackets IPv6 hosts", async () => {
    const { candidateOrigins } = await load();
    expect(candidateOrigins({ token: "x", port: "8787", hosts: ["10.0.1.154", "fd00::1"] }))
      .toEqual(["https://10.0.1.154:8787", "https://[fd00::1]:8787"]);
  });

  test("slug turns a computer name into a path segment", async () => {
    const { slug } = await load();
    expect(slug("MacBook Pro de Alexander")).toBe("macbook-pro-de-alexander");
    expect(slug("  Ordenador de Álvaro (2)  ")).toBe("ordenador-de-alvaro-2");
    expect(slug(null)).toBe("");
  });

  test("proxiedOrigin puts the computer under this page's address", async () => {
    const { proxiedOrigin } = await load();
    expect(proxiedOrigin("MacBook Pro")).toBe(`${location.origin}/macbook-pro`);
  });
});

describe("the store", () => {
  test("save keeps one entry per computer, sorted by name, and selects it", async () => {
    const store = await load();
    store.save(mac);
    store.save(dev);
    store.save({ ...dev, token: "new" });
    expect(store.list().map((c) => [c.name, c.token])).toEqual([["dev", "new"], ["MacBook Pro de Alexander", "t-mac"]]);
    expect(store.selected()).toMatchObject({ id: "d1" });
    expect(JSON.parse(localStorage.getItem("remote-sessions.computers"))).toHaveLength(2);
    expect(localStorage.getItem("remote-sessions.current")).toBe("d1");
  });

  test("selected falls back to the first computer and only offers ALL with two or more", async () => {
    const store = await load({ "remote-sessions.computers": JSON.stringify([dev]), "remote-sessions.current": "all" });
    expect(store.selected()).toMatchObject({ id: "d1" });
    store.save(mac);
    store.select(store.ALL);
    expect(store.selected()).toBe(store.ALL);
  });

  test("selected is null with nothing paired", async () => {
    const store = await load();
    expect(store.selected()).toBeNull();
  });

  test("forget removes the computer and moves the selection", async () => {
    const store = await load({ "remote-sessions.computers": JSON.stringify([dev, mac]), "remote-sessions.current": "m1" });
    store.forget("m1");
    expect(store.list().map((c) => c.id)).toEqual(["d1"]);
    expect(store.selected()).toMatchObject({ id: "d1" });
  });

  test("survives a corrupt stored list", async () => {
    const store = await load({ "remote-sessions.computers": "{not json" });
    expect(store.list()).toEqual([]);
  });

  test("migrate moves the first version's single key into the list", async () => {
    const store = await load({ "remote-sessions.token": "legacy" });
    vi.stubGlobal("fetch", vi.fn(async () => healthResponse({ ok: true, id: "d1", name: "dev", version: "1" })));
    await store.migrate();
    expect(store.list()).toEqual([{ id: "d1", name: "dev", origin: location.origin, token: "legacy" }]);
    expect(localStorage.getItem("remote-sessions.token")).toBeNull();
  });
});

describe("preferProxy", () => {
  test("moves a computer to this page's proxy when the proxy answers as that computer", async () => {
    const store = await load({ "remote-sessions.computers": JSON.stringify([dev, mac]) });
    const fetch = vi.fn(async () => healthResponse({ ok: true, id: "m1", name: mac.name, version: "1" }));
    vi.stubGlobal("fetch", fetch);
    await store.preferProxy();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe(`${location.origin}/macbook-pro-de-alexander/health`);
    expect(store.byId("m1").origin).toBe(`${location.origin}/macbook-pro-de-alexander`);
    expect(JSON.parse(localStorage.getItem("remote-sessions.computers"))[1].origin).toContain("/macbook-pro-de-alexander");
  });

  test.each([
    ["the proxy has no route for it", healthResponse({}, false)],
    ["another computer answers", healthResponse({ ok: true, id: "other", name: "x", version: "1" })],
  ])("keeps the computer's own address when %s", async (_, response) => {
    const store = await load({ "remote-sessions.computers": JSON.stringify([mac]) });
    vi.stubGlobal("fetch", vi.fn(async () => response));
    await store.preferProxy();
    expect(store.byId("m1").origin).toBe(mac.origin);
  });

  test("keeps the address when the proxy cannot be reached", async () => {
    const store = await load({ "remote-sessions.computers": JSON.stringify([mac]) });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await store.preferProxy();
    expect(store.byId("m1").origin).toBe(mac.origin);
  });
});

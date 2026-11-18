import { describe, expect, test, vi } from "vitest";
import { api, ApiError, describe as explain, launch, whenUnauthorized } from "../static/js/api.js";

const computer = { id: "m1", name: "Mac", origin: "https://sessions.example/mac", token: "secret" };

function respond(status, body) {
  return vi.fn(async () => ({ status, ok: status >= 200 && status < 300, json: async () => body }));
}

describe("api", () => {
  test("calls the computer's origin with its key and returns the JSON", async () => {
    const fetch = respond(200, { sessions: [] });
    vi.stubGlobal("fetch", fetch);
    await expect(api(computer, "POST", "/v1/sessions", { cwd: "/x" })).resolves.toEqual({ sessions: [] });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://sessions.example/mac/v1/sessions");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ Authorization: "Bearer secret", "Content-Type": "application/json" });
    expect(init.body).toBe('{"cwd":"/x"}');
  });

  test("returns null for 204", async () => {
    vi.stubGlobal("fetch", respond(204, null));
    await expect(api(computer, "DELETE", "/v1/sessions/1/remote-control")).resolves.toBeNull();
  });

  test("throws ApiError with the server's code and message", async () => {
    vi.stubGlobal("fetch", respond(409, { code: "open_elsewhere", error: "Open elsewhere" }));
    const error = await api(computer, "GET", "/v1/x").catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: "open_elsewhere", message: "Open elsewhere" });
  });

  test("tells the page when a computer rejects its key", async () => {
    const handler = vi.fn();
    whenUnauthorized(handler);
    vi.stubGlobal("fetch", respond(401, { code: "unauthorized", error: "no" }));
    await expect(api(computer, "GET", "/v1/sessions")).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledWith(computer);
  });
});

describe("describe", () => {
  test("translates known codes and falls back to the server's message", () => {
    expect(explain(new ApiError(400, { code: "outside_home" }))).toBe("Only folders inside your home folder can be used.");
    expect(explain(new ApiError(500, { code: "boom", error: "It broke" }))).toBe("It broke");
    expect(explain(new ApiError(500, {}))).toBe("HTTP 500");
  });

  test("points to the certificate when a computer cannot be reached", () => {
    const text = explain(new TypeError("Failed to fetch"), computer);
    expect(text).toContain("Cannot reach Mac (https://sessions.example/mac)");
    expect(text).toContain("open https://sessions.example/mac/health once");
  });
});

describe("launch", () => {
  const trustError = new ApiError(403, { code: "trust_required", folder: "/Users/me/web" });

  test("asks before trusting a folder and retries trusting it", async () => {
    const confirmTrust = vi.fn(async () => true);
    const call = vi.fn(async (trust) => { if (!trust) throw trustError; return "ok"; });
    await expect(launch(call, confirmTrust)).resolves.toBe("ok");
    expect(call.mock.calls).toEqual([[false], [true]]);
    expect(confirmTrust).toHaveBeenCalledWith("/Users/me/web");
  });

  test("gives up when the person does not trust the folder", async () => {
    const confirmTrust = vi.fn(async () => false);
    const call = vi.fn(async () => { throw trustError; });
    await expect(launch(call, confirmTrust)).rejects.toBe(trustError);
    expect(call).toHaveBeenCalledTimes(1);
  });

  test("does not ask for other errors", async () => {
    const confirmTrust = vi.fn(async () => true);
    const error = new ApiError(500, { code: "internal" });
    await expect(launch(async () => { throw error; }, confirmTrust)).rejects.toBe(error);
    expect(confirmTrust).not.toHaveBeenCalled();
  });
});

// The v1 API (docs/API.md) and the messages for its error codes.

import { token } from "./token.js";

export class ApiError extends Error {
  constructor(status, body) {
    super(body.error || `HTTP ${status}`);
    this.status = status;
    this.code = body.code || "internal";
    this.body = body;
  }
}

let onUnauthorized = () => {};

// Called when the computer rejects the key, e.g. after `pair --rotate`.
export function whenUnauthorized(handler) {
  onUnauthorized = handler;
}

export async function api(method, path, body) {
  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (response.status === 204) return null;
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (json.code === "unauthorized") onUnauthorized();
    throw new ApiError(response.status, json);
  }
  return json;
}

const messages = {
  open_elsewhere: "The conversation is open on the computer. Close it there or run /remote-control in it.",
  remote_control_timeout: "Remote Control did not answer in time. Is Claude Code logged in with a Claude subscription?",
  folder_access: "The computer does not let Remote Sessions open that folder (macOS: Full Disk Access).",
  outside_home: "Only folders inside your home folder can be used.",
};

export function describe(error) {
  if (error instanceof ApiError) return messages[error.code] || error.message;
  return `Cannot reach the computer (${error.message}).`;
}

// Runs a launch call; asks before trusting a folder, as the store apps do.
export async function launch(call) {
  try {
    return await call(false);
  } catch (error) {
    if (error instanceof ApiError && error.code === "trust_required"
      && confirm(`Claude Code asks whether you trust ${error.body.folder}. Trust it?`)) {
      return call(true);
    }
    throw error;
  }
}

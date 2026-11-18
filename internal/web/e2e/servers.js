// Two throwaway remote-sessions servers ("alpha" serves the page, "beta" is a second computer),
// each with its own config, token and fixture transcripts under one temporary folder.

import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export const computers = {
  alpha: { id: "aaaaaaaa-0000-4000-8000-000000000001", name: "Alpha Box", token: "alpha-token-0123456789", port: 18787 },
  beta: { id: "bbbbbbbb-0000-4000-8000-000000000002", name: "Beta Box", token: "beta-token-0123456789", port: 18788 },
};

// One transcript in Claude Code's JSONL format, in a project folder named after its cwd.
function transcript(projects, { id, cwd, title, prompt, reply, updated }) {
  const folder = join(projects, cwd.replaceAll("/", "-"));
  mkdirSync(folder, { recursive: true });
  const records = [
    { type: "user", uuid: `${id}-u`, cwd, timestamp: updated, message: { role: "user", content: prompt } },
    { type: "assistant", uuid: `${id}-a`, cwd, timestamp: updated, message: { role: "assistant", content: [{ type: "text", text: reply }, { type: "tool_use", name: "Read" }] } },
    ...(title ? [{ type: "custom-title", customTitle: title }] : []),
  ];
  const file = join(folder, `${id}.jsonl`);
  writeFileSync(file, records.map((record) => JSON.stringify(record)).join("\n") + "\n");
  // The server dates a conversation by its file's modification time.
  utimesSync(file, new Date(updated), new Date(updated));
}

const fixtures = {
  alpha: [
    { id: "11111111-1111-4111-8111-111111111111", cwd: "/work/web", title: "Fix the login form", prompt: "The login form rejects valid emails", reply: "Fixed the email regex.", updated: "2026-11-18T10:00:00.000Z" },
    { id: "22222222-2222-4222-8222-222222222222", cwd: "/work/api", title: "Add rate limiting", prompt: "Limit requests per token", reply: "Added a token bucket.", updated: "2026-11-17T10:00:00.000Z" },
  ],
  beta: [
    { id: "33333333-3333-4333-8333-333333333333", cwd: "/home/beta/notes", title: "Weekly notes", prompt: "Summarise this week", reply: "Here is the summary.", updated: "2026-11-16T10:00:00.000Z" },
  ],
};

export async function startServers() {
  const root = mkdtempSync(join(tmpdir(), "remote-sessions-e2e-"));
  const binary = join(root, "remote-sessions");
  execFileSync("go", ["build", "-o", binary, "./cmd/remote-sessions"], { cwd: resolve(import.meta.dirname, "../../.."), stdio: "inherit" });
  const children = [];
  for (const [key, computer] of Object.entries(computers)) {
    const home = join(root, key);
    const config = join(root, `${key}-config`);
    const claude = join(home, ".claude");
    mkdirSync(config, { recursive: true });
    for (const folder of ["Projects/web", "Projects/api", "Documents"]) mkdirSync(join(home, folder), { recursive: true });
    writeFileSync(join(config, "config.json"), JSON.stringify({ id: computer.id, token: computer.token, port: computer.port, name: computer.name, hosts: ["127.0.0.1"] }));
    for (const session of fixtures[key]) transcript(join(claude, "projects"), session);
    const child = spawn(binary, ["serve"], {
      env: { ...process.env, HOME: home, REMOTE_SESSIONS_CONFIG_DIR: config, CLAUDE_CONFIG_DIR: claude, REMOTE_SESSIONS_LANG: "en" },
      stdio: ["ignore", "inherit", "inherit"],
    });
    children.push(child);
    await waitForHealth(`https://127.0.0.1:${computer.port}/health`);
  }
  return () => {
    for (const child of children) child.kill();
    rmSync(root, { recursive: true, force: true });
  };
}

async function waitForHealth(url) {
  const deadline = Date.now() + 15000;
  // The servers use self-signed certificates; this check runs in Node, not in the browser under test.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch { /* not listening yet */ }
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error(`${url} did not answer`);
}

export const pairingLink = (computer) =>
  `remotesessions://pair?v=1&id=${computer.id}&name=${encodeURIComponent(computer.name)}&port=${computer.port}&hosts=127.0.0.1&token=${computer.token}`;

// The conversation list and one conversation, with Remote Control.

import { api, describe, launch } from "./api.js";
import { $, ago, el, setError, setOpenLink } from "./dom.js";
import { show } from "./nav.js";

export async function showList() {
  show("list");
  $("list-status").textContent = "Loading…";
  try {
    const { sessions } = await api("GET", "/v1/sessions");
    $("list-status").textContent = sessions.length ? "" : "No conversations yet.";
    $("sessions").replaceChildren(...sessions.map(sessionCard));
  } catch (error) {
    $("list-status").textContent = describe(error);
  }
}

function sessionCard(session) {
  const item = el("li");
  const badges = el("div");
  if (session.remote) badges.append(el("span", "badge remote", "Remote Control"));
  else if (session.running) badges.append(el("span", "badge", "Open on the computer"));
  item.append(
    el("div", "t", session.title),
    el("div", "s", session.lastPrompt || ""),
    badges,
    el("div", "muted", `${session.project || ""} · ${ago(session.updatedAt)}`),
  );
  item.addEventListener("click", () => {
    history.pushState({ view: "detail" }, "");
    showDetail(session);
  });
  return item;
}

const remoteControlPath = (session) => `/v1/sessions/${encodeURIComponent(session.id)}/remote-control`;

async function showDetail(session) {
  show("detail", session.title);
  $("detail-meta").textContent = session.cwd || "";
  $("messages").replaceChildren(el("li", "muted", "Loading…"));
  setError("detail-error", null);
  setOpenLink("open-claude", session.remote && session.remote.url);
  $("connect").hidden = Boolean(session.remote);
  $("connect").disabled = false;
  $("connect").onclick = () => connect(session);
  $("stop").hidden = !(session.running && session.running.kind === "remote-sessions");
  $("stop").onclick = () => stop(session);
  try {
    const { messages } = await api("GET", `/v1/sessions/${encodeURIComponent(session.id)}/messages?limit=60`);
    $("messages").replaceChildren(...messages.map((message) => {
      const item = el("li", message.role, message.text);
      if (message.tools && message.tools.length) item.append(el("span", "tools", `⚙ ${message.tools.join(", ")}`));
      return item;
    }));
    window.scrollTo(0, document.body.scrollHeight);
  } catch (error) {
    $("messages").replaceChildren(el("li", "error", describe(error)));
  }
}

async function connect(session) {
  const button = $("connect");
  button.disabled = true;
  button.textContent = "Starting Remote Control… (up to 45 s)";
  setError("detail-error", null);
  try {
    const result = await launch((trustFolder) => api("POST", remoteControlPath(session), trustFolder ? { trustFolder } : undefined));
    setOpenLink("open-claude", result.url);
    button.hidden = true;
    $("stop").hidden = false;
  } catch (error) {
    setError("detail-error", describe(error));
  } finally {
    button.disabled = false;
    button.textContent = "Connect with Remote Control";
  }
}

async function stop(session) {
  try {
    await api("DELETE", remoteControlPath(session));
    history.back();
  } catch (error) {
    setError("detail-error", describe(error));
  }
}

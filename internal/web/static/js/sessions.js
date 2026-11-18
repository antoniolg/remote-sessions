// @ts-check
// The conversation list (one computer or all of them) and one conversation, with Remote Control.

/** @import { Message, Session, SessionInfo } from "./api.js" */
/** @import { Computer } from "./computers.js" */
import { t } from "./i18n.js";
import { api, describe, launch } from "./api.js";
import { ALL, list, selected } from "./computers.js";
import { $, ago, el, setError, setOpenLink, skeleton } from "./dom.js";
import { show } from "./nav.js";

const LIST_TIMEOUT = 8000;
// With several computers the list waits this long for all of them before showing any,
// so rows do not jump around as each one answers; a slower one is added after it.
const SETTLE_TIME = 2000;
let listRun = 0;
// What the list shows now: kept so search and the project filter redraw without asking again.
/** @type {{ sessions: Session[], errors: string[], pending: number, all: boolean, holding: boolean }} */
const state = { sessions: [], errors: [], pending: 0, all: false, holding: false };

/** @param {Session} session */
const projectOf = (session) => session.project || "";

// The project filter offers the projects of the conversations loaded so far.
function renderProjects() {
  // A project asked for in the address waits here until its option exists.
  const current = $("project").value || $("project").dataset.wanted || "";
  const projects = [...new Set(state.sessions.map(projectOf).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  $("project").replaceChildren(new Option(t("all_projects"), ""), ...projects.map((name) => new Option(name, name)));
  $("project").value = projects.includes(current) ? current : "";
  // Keep the choice while computers are still answering: its project may arrive with them.
  if ($("project").value || !state.pending) delete $("project").dataset.wanted;
  else if (current) $("project").dataset.wanted = current;
  $("project").hidden = projects.length < 2;
}

/** @param {Session} session @param {string} query lowercase words @param {string} project */
function matches(session, query, project) {
  if (project && projectOf(session) !== project) return false;
  if (!query) return true;
  const text = [session.title, session.lastPrompt, session.project, session.cwd, state.all ? session.computer.name : ""].join(" ").toLowerCase();
  return query.split(/\s+/).every((word) => text.includes(word));
}

export function paintList() {
  const query = $("search").value.trim().toLowerCase();
  const project = $("project").value || $("project").dataset.wanted || "";
  const shown = state.holding ? [] : state.sessions.filter((session) => matches(session, query, project));
  const status = state.pending ? []
    : !state.sessions.length ? (state.errors.length ? [] : [t("no_conversations")])
    : !shown.length ? [t("no_matches")] : [];
  $("list-status").textContent = [...state.errors, ...status].join(" ");
  // While a computer is still answering, placeholders hold the place of its conversations,
  // enough of them to fill the screen.
  const screenful = Math.ceil(window.innerHeight / 90);
  const placeholders = state.pending ? skeleton(shown.length ? 2 : screenful, "card", ["70%", "95%", "40%"]) : [];
  $("sessions").setAttribute("aria-busy", String(state.pending > 0));
  $("sessions").replaceChildren(...shown.map((session) => sessionCard(session, state.all)), ...placeholders);
}

// Each computer's conversations appear as soon as that computer answers; a slow or absent one
// only adds its error line instead of holding the whole list.
export async function showList() {
  const choice = selected();
  const run = ++listRun;
  show("list");
  const computers = choice === ALL ? list() : choice ? [choice] : [];
  Object.assign(state, { sessions: [], errors: [], pending: computers.length, all: choice === ALL, holding: computers.length > 1 });
  const render = () => {
    if (run !== listRun) return;
    state.sessions.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    renderProjects();
    paintList();
  };
  render();
  if (state.holding) {
    setTimeout(() => {
      if (run !== listRun || !state.holding) return;
      state.holding = false;
      render();
    }, SETTLE_TIME);
  }
  await Promise.all(computers.map(async (computer) => {
    try {
      /** @type {{ sessions: SessionInfo[] }} */
      const result = await api(computer, "GET", "/v1/sessions", undefined, LIST_TIMEOUT);
      if (run === listRun) state.sessions.push(...result.sessions.map((session) => ({ ...session, computer })));
    } catch (error) {
      if (run === listRun) state.errors.push(describe(error, computer));
    }
    if (run !== listRun) return;
    state.pending -= 1;
    if (!state.pending) state.holding = false;
    render();
  }));
}

// Folders where this computer's conversations ran, newest first: the new-conversation shortcut.
/** @param {Computer} computer @returns {{ name: string, path: string }[]} */
export function recentFolders(computer) {
  const seen = new Set();
  /** @type {{ name: string, path: string }[]} */
  const folders = [];
  for (const session of state.sessions) {
    if (folders.length === 8) break;
    if (session.computer.id !== computer.id || !session.cwd || seen.has(session.cwd)) continue;
    seen.add(session.cwd);
    folders.push({ name: session.project || session.cwd, path: session.cwd });
  }
  return folders;
}

/** @param {Session} session @param {boolean} showComputer */
function sessionCard(session, showComputer) {
  const item = el("li");
  // One line under the prompt: state (coloured dot), computer, project and age.
  const meta = el("div", "muted meta-line");
  if (session.remote) meta.append(el("span", "state remote", "Remote Control"));
  else if (session.running) meta.append(el("span", "state", t("badge_open")));
  const where = [showComputer ? session.computer.name : null, session.project, ago(session.updatedAt)].filter(Boolean);
  if (where.length) meta.append((meta.childElementCount ? " · " : "") + where.join(" · "));
  item.append(
    el("div", "t", session.title),
    el("div", "s", session.lastPrompt || ""),
    meta,
  );
  item.addEventListener("click", () => {
    history.pushState({ view: "detail" }, "");
    showDetail(session);
  });
  return item;
}

/** @param {Session} session */
const remoteControlPath = (session) => `/v1/sessions/${encodeURIComponent(session.id)}/remote-control`;

/** @param {Session} session */
async function showDetail(session) {
  const { computer } = session;
  show("detail", session.title);
  $("detail-meta").textContent = [computer.name, session.cwd].filter(Boolean).join(" · ");
  $("messages").setAttribute("aria-busy", "true");
  $("messages").replaceChildren(...skeleton(4, (index) => (index % 2 ? "assistant" : "user"), ["90%", "75%", "50%"]));
  setError("detail-error", null);
  setOpenLink("open-claude", session.remote && session.remote.url);
  $("connect").hidden = Boolean(session.remote);
  $("connect").disabled = false;
  $("connect").onclick = () => connect(session);
  $("stop").hidden = !(session.running && session.running.kind === "remote-sessions");
  $("stop").onclick = () => stop(session);
  try {
    /** @type {{ messages: Message[] }} */
    const { messages } = await api(computer, "GET", `/v1/sessions/${encodeURIComponent(session.id)}/messages?limit=60`);
    $("messages").replaceChildren(...messages.map((message) => {
      const item = el("li", message.role, message.text);
      if (message.tools && message.tools.length) item.append(el("span", "tools", `⚙ ${message.tools.join(", ")}`));
      return item;
    }));
    window.scrollTo(0, document.body.scrollHeight);
  } catch (error) {
    $("messages").replaceChildren(el("li", "error", describe(error, computer)));
  } finally {
    $("messages").setAttribute("aria-busy", "false");
  }
}

/** @param {Session} session */
async function connect(session) {
  const button = $("connect");
  button.disabled = true;
  button.textContent = t("connecting");
  setError("detail-error", null);
  try {
    const result = await launch((trustFolder) =>
      api(session.computer, "POST", remoteControlPath(session), trustFolder ? { trustFolder } : undefined));
    setOpenLink("open-claude", result.url);
    button.hidden = true;
    $("stop").hidden = false;
  } catch (error) {
    setError("detail-error", describe(error, session.computer));
  } finally {
    button.disabled = false;
    button.textContent = t("connect");
  }
}

/** @param {Session} session */
async function stop(session) {
  try {
    await api(session.computer, "DELETE", remoteControlPath(session));
    history.back();
  } catch (error) {
    setError("detail-error", describe(error, session.computer));
  }
}

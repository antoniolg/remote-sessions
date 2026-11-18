// @ts-check
// Settings: the paired computers (select, forget, add) and what this page is.

/** @import { Computer } from "./computers.js" */
import { ask } from "./ask.js";
import { t } from "./i18n.js";
import { ALL, forget, list, select, selected } from "./computers.js";
import { $, el } from "./dom.js";
import { show } from "./nav.js";

/** @type {() => void} */
let onDone = () => {};
/** @type {() => void} */
let onAdd = () => {};

/** @param {Computer} computer @param {boolean} current */
function computerRow(computer, current) {
  const item = el("li", "split");
  const text = el("div");
  text.append(el("div", "t", computer.name), el("div", "muted", new URL(computer.origin).host));
  const end = el("div", "row");
  if (current) end.append(el("span", "check", "✓"));
  const remove = el("button", "small", t("forget"));
  remove.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (!await ask(t("forget_confirm", { name: computer.name }), { yes: t("forget"), no: t("cancel") })) return;
    forget(computer.id);
    if (list().length) renderComputers(); else onAdd();
  });
  end.append(remove);
  item.append(text, end);
  item.addEventListener("click", () => { select(computer.id); onDone(); });
  return item;
}

function renderComputers() {
  const choice = selected();
  $("computers").replaceChildren(...list().map((computer) => computerRow(computer, choice !== ALL && choice?.id === computer.id)));
}

export function showSettings() {
  show("settings", t("settings"));
  renderComputers();
  $("version").textContent = "";
  fetch("/health", { cache: "no-store" })
    .then((response) => response.json())
    .then((health) => { $("version").textContent = health.version; })
    .catch(() => {});
}

/** @param {{ done: () => void, add: () => void }} handlers */
export function setUpSettings({ done, add }) {
  onDone = done;
  onAdd = add;
  $("settings-add").onclick = add;
}

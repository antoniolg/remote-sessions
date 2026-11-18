// @ts-check
// Which screen is on, and the bar above it.

import { t } from "./i18n.js";
import { ALL, list, selected } from "./computers.js";
import { $, el } from "./dom.js";
import { stopScanner } from "./scanner.js";

const views = ["pair", "list", "detail", "create", "settings"];
export const ADD = "add";

// The computer picker, like the store apps: one computer, all of them, or a new one.
function renderPicker() {
  const computers = list();
  const choice = selected();
  const options = computers.map((computer) => new Option(computer.name, computer.id));
  if (computers.length > 1) options.unshift(new Option(t("all_computers"), ALL));
  options.push(new Option(t("add_computer_option"), ADD));
  $("computer").replaceChildren(...options);
  $("computer").value = choice === ALL ? ALL : (choice ? choice.id : ADD);
}

/**
 * @param {"pair" | "list" | "detail" | "create" | "settings"} view
 * @param {string | null} [title]
 */
export function show(view, title) {
  if (view !== "pair") stopScanner();
  for (const name of views) $(name).hidden = name !== view;
  const onList = view === "list";
  $("title").textContent = title || "Remote Sessions";
  $("title").hidden = onList && list().length > 0;
  $("computer").hidden = !onList || list().length === 0;
  if (onList) renderPicker();
  $("back").hidden = onList || (view === "pair" && list().length === 0);
  $("new").hidden = !onList || selected() === ALL;
  $("settings-open").hidden = !onList;
  $("filters").hidden = !onList || list().length === 0;
  document.body.classList.toggle("filtering", !$("filters").hidden);
  window.scrollTo(0, 0);
}

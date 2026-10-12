// Which screen is on, and the bar above it.

import { $ } from "./dom.js";
import { stopScanner } from "./scanner.js";

const views = ["pair", "list", "detail", "create"];

export function show(view, title) {
  if (view !== "pair") stopScanner();
  for (const name of views) $(name).hidden = name !== view;
  $("title").textContent = title || "Remote Sessions";
  $("back").hidden = view === "list" || view === "pair";
  $("new").hidden = view !== "list";
  window.scrollTo(0, 0);
}

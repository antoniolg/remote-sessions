// A new conversation: browse the computer's folders and start Claude Code in one.

import { api, describe, launch } from "./api.js";
import { $, el, setError, setOpenLink } from "./dom.js";
import { show } from "./nav.js";

let currentFolder = null;

export async function showCreate(path) {
  show("create", "New conversation");
  setError("create-error", null);
  setOpenLink("create-open", null);
  $("create-start").hidden = false;
  $("folder-path").textContent = "Loading…";
  try {
    const query = path ? `?path=${encodeURIComponent(path)}` : "";
    const listing = await api("GET", `/v1/folders${query}`);
    currentFolder = listing.path;
    $("folder-path").textContent = listing.path;
    const items = [];
    if (listing.parent) items.push(folderItem("‹ ..", listing.parent));
    for (const folder of listing.folders) items.push(folderItem(`📁 ${folder.name}`, folder.path));
    $("folders").replaceChildren(...items);
  } catch (error) {
    $("folder-path").textContent = describe(error);
  }
}

function folderItem(label, path) {
  const item = el("li", null, label);
  item.addEventListener("click", () => showCreate(path));
  return item;
}

export async function create() {
  const button = $("create-start");
  button.disabled = true;
  button.textContent = "Starting… (up to 45 s)";
  setError("create-error", null);
  try {
    const title = $("create-title").value.trim();
    const result = await launch((trustFolder) => api("POST", "/v1/sessions", { cwd: currentFolder, title, trustFolder }));
    setOpenLink("create-open", result.url);
    button.hidden = true;
  } catch (error) {
    setError("create-error", describe(error));
  } finally {
    button.disabled = false;
    button.textContent = "Start here";
  }
}

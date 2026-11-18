// @ts-check
// Remote Sessions web client: the store apps' features on top of the same v1 API (docs/API.md).
// Each screen lives in its own module under js/.

import { whenUnauthorized } from "./js/api.js";
import { forget, list, migrate, preferProxy, select } from "./js/computers.js";
import { create, showCreate } from "./js/create.js";
import { $ } from "./js/dom.js";
import { ADD } from "./js/nav.js";
import { setUpPairing, showPair } from "./js/pair.js";
import { paintList, showList } from "./js/sessions.js";
import { setUpSettings, showSettings } from "./js/settings.js";
import { t, translatePage } from "./js/i18n.js";
import { readFilters, writeFilters } from "./js/url.js";

translatePage();

// Offline shell. Chrome refuses service workers on a self-signed certificate; the page works without one.
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js", { scope: "/app/" }).catch(() => {});

function home() {
  if (list().length) { writeFilters(); showList(); } else showPair();
}

setUpPairing(() => {
  history.replaceState(null, "");
  showList();
});
whenUnauthorized((computer) => {
  forget(computer.id);
  showPair(t("key_rejected", { name: computer.name }));
});

$("back").onclick = () => (history.state ? history.back() : home());
$("new").onclick = () => { history.pushState({ view: "create" }, ""); showCreate(); };
$("create-start").onclick = create;
$("computer").onchange = () => {
  const picker = $("computer");
  picker.blur();
  if (picker.value === ADD) {
    history.pushState({ view: "pair" }, "");
    showPair();
    return;
  }
  select(picker.value);
  writeFilters();
  showList();
};
$("search").oninput = () => { writeFilters(); paintList(); };
$("project").onchange = () => { delete $("project").dataset.wanted; writeFilters(); paintList(); };
$("settings-open").onclick = () => { history.pushState({ view: "settings" }, ""); showSettings(); };
setUpSettings({
  done: () => (history.state ? history.back() : home()),
  add: () => { history.replaceState({ view: "pair" }, ""); showPair(); },
});
window.addEventListener("popstate", home);

migrate().then(preferProxy).then(() => { readFilters(); home(); });

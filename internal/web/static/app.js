// Remote Sessions web client: the store apps' features on top of the same v1 API (docs/API.md).
// Each screen lives in its own module under js/.

import { whenUnauthorized } from "./js/api.js";
import { create, showCreate } from "./js/create.js";
import { registerServiceWorker, showDiagnostics } from "./js/diagnostics.js";
import { $ } from "./js/dom.js";
import { setUpPairing, showPair } from "./js/pair.js";
import { showList } from "./js/sessions.js";
import { forgetToken, token } from "./js/token.js";

registerServiceWorker();
setUpPairing();
whenUnauthorized(() => {
  forgetToken();
  showPair("The computer did not accept the key. Pair again.");
});

$("back").onclick = () => history.back();
$("new").onclick = () => { history.pushState({ view: "create" }, ""); showCreate(); };
$("create-start").onclick = create;
$("diag-open").onclick = showDiagnostics;
$("diag-close").onclick = () => $("diag").close();
$("unpair").onclick = () => { forgetToken(); $("diag").close(); showPair(); };
window.addEventListener("popstate", () => { if (token()) showList(); });

if (token()) showList(); else showPair();

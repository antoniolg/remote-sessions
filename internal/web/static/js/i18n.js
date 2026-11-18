// @ts-check
// The client's text in English and Spanish, picked from the browser's language like the CLI picks its own.
// The Spanish wording follows the Android and iOS apps ("vincular", "Ajustes", "Abrir en Claude").

const en = {
  computer: "Computer",
  search: "Search conversations",
  project: "Project",
  back: "Back",
  settings: "Settings",
  new_conversation: "New conversation",
  pair_intro: "Scan the QR code shown by",
  scan: "Scan the QR code",
  reach_hint: "This browser cannot check that computer's certificate like the apps do. Open its address once, accept the certificate warning, then try again:",
  retry: "Try again",
  paste_summary: "Can't scan it? Paste the link",
  pair: "Pair",
  open_claude: "Open in Claude",
  connect: "Connect with Remote Control",
  connecting: "Starting Remote Control… (up to 45 s)",
  stop: "Stop on the computer",
  create_hint: "Claude Code starts in the folder you pick and opens in the Claude app with Remote Control.",
  recent_projects: "Recent projects",
  browse: "Browse",
  name_optional: "Name (optional)",
  start_here: "Start here",
  starting: "Starting… (up to 45 s)",
  computers: "Computers",
  add_computer_button: "+ Add a computer",
  forget_note: "Forgetting a computer only removes its key from this browser. To revoke access from the computer, run",
  about: "About",
  source_code: "Source code",
  version: "Version",
  new_conversation_on: "New conversation on {name}",
  error_open_elsewhere: "The conversation is open on the computer. Close it there or run /remote-control in it.",
  error_remote_control_timeout: "Remote Control did not answer in time. Is Claude Code logged in with a Claude subscription?",
  error_folder_access: "The computer does not let Remote Sessions open that folder (macOS: Full Disk Access).",
  error_outside_home: "Only folders inside your home folder can be used.",
  unreachable: "Cannot reach {where}. Is it on? If this browser has not accepted its certificate yet, open {health} once and accept it.",
  the_computer: "the computer",
  its_address: "its address",
  trust_folder: "Claude Code asks whether you trust {folder}. Trust it?",
  camera_unavailable: "This browser does not give pages the camera here. Paste the link below.",
  no_qr_reader: "This browser cannot read QR codes. Paste the link below.",
  camera_denied: "The camera was not allowed. Allow it in the browser's settings and try again, or paste the link below.",
  no_camera: "No camera available ({reason}). Paste the link below.",
  point_camera: "Point the camera at the code.",
  not_our_code: "That QR code is not a Remote Sessions code.",
  all_projects: "All projects",
  no_conversations: "No conversations yet.",
  no_matches: "No conversation matches.",
  badge_open: "Open on the computer",
  all_computers: "All computers",
  add_computer_option: "Add a computer…",
  add_computer: "Add a computer",
  cannot_reach_pairing: "Cannot reach {name} from this browser.",
  that_computer: "that computer",
  not_a_link: "That is not a pairing link.",
  forget: "Forget",
  forget_confirm: "Forget {name} in this browser?",
  key_rejected: "{name} did not accept the key. Pair it again.",
};

/** @type {Record<keyof typeof en, string>} */
const es = {
  computer: "Ordenador",
  search: "Buscar conversaciones",
  project: "Proyecto",
  back: "Atrás",
  settings: "Ajustes",
  new_conversation: "Nueva conversación",
  pair_intro: "Escanea el código QR que muestra",
  scan: "Escanear el código QR",
  reach_hint: "Este navegador no puede comprobar el certificado de ese ordenador como hacen las apps. Abre su dirección una vez, acepta el aviso del certificado y vuelve a intentarlo:",
  retry: "Reintentar",
  paste_summary: "¿No puedes escanearlo? Pega el enlace",
  pair: "Vincular",
  open_claude: "Abrir en Claude",
  connect: "Conectar con Remote Control",
  connecting: "Iniciando Remote Control… (hasta 45 s)",
  stop: "Detener en el ordenador",
  create_hint: "Claude Code se inicia en la carpeta que elijas y se abre en la app de Claude con Remote Control.",
  recent_projects: "Proyectos recientes",
  browse: "Explorar",
  name_optional: "Nombre (opcional)",
  start_here: "Empezar aquí",
  starting: "Iniciando… (hasta 45 s)",
  computers: "Ordenadores",
  add_computer_button: "+ Añadir ordenador",
  forget_note: "Olvidar un ordenador solo borra su clave de este navegador. Para revocar el acceso desde el ordenador, ejecuta",
  about: "Acerca de",
  source_code: "Código fuente",
  version: "Versión",
  new_conversation_on: "Nueva conversación en {name}",
  error_open_elsewhere: "La conversación está abierta en el ordenador. Ciérrala allí o ejecuta /remote-control en ella.",
  error_remote_control_timeout: "Remote Control no ha respondido a tiempo. ¿Has iniciado sesión en Claude Code con una suscripción de Claude?",
  error_folder_access: "El ordenador no deja a Remote Sessions abrir esa carpeta (macOS: Acceso total al disco).",
  error_outside_home: "Solo se pueden usar carpetas dentro de tu carpeta de inicio.",
  unreachable: "No se puede conectar con {where}. ¿Está encendido? Si este navegador aún no ha aceptado su certificado, abre {health} una vez y acéptalo.",
  the_computer: "el ordenador",
  its_address: "su dirección",
  trust_folder: "Claude Code pregunta si confías en {folder}. ¿Confiar?",
  camera_unavailable: "Este navegador no da acceso a la cámara aquí. Pega el enlace más abajo.",
  no_qr_reader: "Este navegador no puede leer códigos QR. Pega el enlace más abajo.",
  camera_denied: "No se ha permitido usar la cámara. Permítelo en los ajustes del navegador y vuelve a intentarlo, o pega el enlace más abajo.",
  no_camera: "No hay ninguna cámara disponible ({reason}). Pega el enlace más abajo.",
  point_camera: "Apunta la cámara al código.",
  not_our_code: "Ese código QR no es de Remote Sessions.",
  all_projects: "Todos los proyectos",
  no_conversations: "Todavía no hay conversaciones.",
  no_matches: "Ninguna conversación coincide.",
  badge_open: "Abierta en el ordenador",
  all_computers: "Todos los ordenadores",
  add_computer_option: "Añadir ordenador…",
  add_computer: "Añadir ordenador",
  cannot_reach_pairing: "No se puede conectar con {name} desde este navegador.",
  that_computer: "ese ordenador",
  not_a_link: "Esto no es un enlace de vinculación.",
  forget: "Olvidar",
  forget_confirm: "¿Olvidar {name} en este navegador?",
  key_rejected: "{name} no ha aceptado la clave. Vuelve a vincularlo.",
};

/** @typedef {keyof typeof en} Key */

const dictionaries = { en, es };

/**
 * The first of the browser's languages that the client speaks, English otherwise.
 * @param {readonly string[]} languages e.g. navigator.languages
 * @returns {keyof typeof dictionaries}
 */
export function pickLanguage(languages) {
  for (const tag of languages) {
    const base = tag.toLowerCase().split("-")[0];
    if (base === "es" || base === "en") return base;
  }
  return "en";
}

let language = pickLanguage(navigator.languages?.length ? navigator.languages : [navigator.language || "en"]);

export const currentLanguage = () => language;

/** @param {keyof typeof dictionaries} next */
export function setLanguage(next) {
  language = next;
}

/**
 * The text for key in the current language, with {name} placeholders filled in.
 * @param {Key} key
 * @param {Record<string, string | number>} [values]
 */
export function t(key, values = {}) {
  return dictionaries[language][key].replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
}

/** Translates index.html: data-i18n sets the text, data-i18n-placeholder and data-i18n-label the attributes. */
export function translatePage() {
  document.documentElement.lang = language;
  for (const node of document.querySelectorAll("[data-i18n]")) {
    node.textContent = t(/** @type {Key} */ (/** @type {HTMLElement} */ (node).dataset.i18n));
  }
  for (const node of document.querySelectorAll("[data-i18n-placeholder]")) {
    node.setAttribute("placeholder", t(/** @type {Key} */ (/** @type {HTMLElement} */ (node).dataset.i18nPlaceholder)));
  }
  for (const node of document.querySelectorAll("[data-i18n-label]")) {
    node.setAttribute("aria-label", t(/** @type {Key} */ (/** @type {HTMLElement} */ (node).dataset.i18nLabel)));
  }
}

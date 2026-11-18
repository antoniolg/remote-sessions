// @ts-check
// DOM helpers. Data from the server is always written with textContent, never as HTML.

import { currentLanguage } from "./i18n.js";

/**
 * Elements whose type matters to the code; every other id is a plain HTMLElement.
 * @typedef {{
 *   search: HTMLInputElement, "create-title": HTMLInputElement, "pair-input": HTMLTextAreaElement,
 *   project: HTMLSelectElement, computer: HTMLSelectElement, "scan-video": HTMLVideoElement,
 *   "create-open": HTMLAnchorElement, "open-claude": HTMLAnchorElement,
 *   "create-start": HTMLButtonElement, connect: HTMLButtonElement, stop: HTMLButtonElement,
 *   "scan-start": HTMLButtonElement, "pair-retry": HTMLButtonElement, "pair-save": HTMLButtonElement,
 *   "settings-add": HTMLButtonElement, "settings-open": HTMLButtonElement, new: HTMLButtonElement, back: HTMLButtonElement,
 * }} Elements
 */

/**
 * The element with this id. Every id the code asks for is in index.html, so a missing one is a bug.
 * @template {string} K
 * @param {K} id
 * @returns {K extends keyof Elements ? Elements[K] : HTMLElement}
 */

export function $(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} is missing from index.html`);
  return /** @type {any} */ (node);
}

/**
 * @template {keyof HTMLElementTagNameMap} T
 * @param {T} tag
 * @param {string | null} [className]
 * @param {string | null} [text]
 * @returns {HTMLElementTagNameMap[T]}
 */
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/** @param {string} id @param {string | null | undefined} text */
export function setError(id, text) {
  $(id).hidden = !text;
  $(id).textContent = text || "";
}

// After an await the tap no longer counts as a user gesture, so window.open would be blocked:
// the page shows a link and the second tap opens it (the Claude app if the OS hands it the link).
/** @param {"create-open" | "open-claude"} id @param {string | null | undefined} url */
export function setOpenLink(id, url) {
  // The URL comes from a computer's answer: only an https link is shown.
  const safe = url && /^https:\/\//i.test(url) ? url : null;
  $(id).hidden = !safe;
  if (safe) $(id).href = safe;
}


/** @param {string} iso @param {number} [now] */
export function ago(iso, now = Date.now()) {
  // Same language as the rest of the page.
  const relative = new Intl.RelativeTimeFormat(currentLanguage(), { numeric: "auto" });
  const seconds = (new Date(iso).getTime() - now) / 1000;
  /** @type {[Intl.RelativeTimeFormatUnit, number][]} */
  const units = [["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return relative.format(0, "minute");
}

// Grey placeholders shaped like the content that is on its way; screen readers get aria-busy instead.
/**
 * @param {number} count
 * @param {string | ((index: number) => string)} className
 * @param {string[]} lines widths of the grey bars, e.g. "60%"
 */
export function skeleton(count, className, lines) {
  return Array.from({ length: count }, (_, index) => {
    const item = el("li", `skeleton ${typeof className === "function" ? className(index) : className}`);
    item.setAttribute("aria-hidden", "true");
    for (const width of lines) {
      const bar = el("span", "sk-line");
      bar.style.width = width;
      item.append(bar);
    }
    return item;
  });
}

// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { ask } from "../static/js/ask.js";

// jsdom has <dialog> but not its modal methods; the e2e suite runs the real ones.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close ??= function () { this.removeAttribute("open"); };
});

const labels = { yes: "Trust", no: "Cancel" };

/** @param {string} label */
function press(label) {
  const button = [...document.querySelectorAll("dialog button")].find((node) => node.textContent === label);
  if (!button) throw new Error(`no ${label} button`);
  /** @type {HTMLButtonElement} */ (button).click();
}

describe("ask", () => {
  afterEach(() => { document.body.replaceChildren(); });

  test("shows the question in the page and answers yes", async () => {
    const answer = ask("Trust /home/me/web?", labels);
    const dialog = document.querySelector("dialog");
    expect(dialog?.open).toBe(true);
    expect(dialog?.textContent).toContain("Trust /home/me/web?");
    press("Trust");
    await expect(answer).resolves.toBe(true);
    expect(document.querySelector("dialog")).toBeNull();
  });

  test("answers no on cancel", async () => {
    const answer = ask("Trust it?", labels);
    press("Cancel");
    await expect(answer).resolves.toBe(false);
    expect(document.querySelector("dialog")).toBeNull();
  });
});

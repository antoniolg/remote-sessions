// @ts-check
// A yes/no question shown in the page. window.confirm() cannot be relied on: some embedded
// browsers (the Claude desktop app's browser pane) answer "no" without showing anything.

/**
 * Shows text with two buttons and resolves to true when the person picks yes.
 * Escape or the no button resolve to false.
 * @param {string} text
 * @param {{ yes: string, no: string }} labels
 * @returns {Promise<boolean>}
 */
export function ask(text, labels) {
  const dialog = document.createElement("dialog");
  dialog.className = "ask";
  const question = document.createElement("p");
  question.textContent = text;
  const actions = document.createElement("div");
  actions.className = "ask-actions";
  const no = document.createElement("button");
  no.type = "button";
  no.textContent = labels.no;
  const yes = document.createElement("button");
  yes.type = "button";
  yes.className = "primary";
  yes.textContent = labels.yes;
  actions.append(no, yes);
  dialog.append(question, actions);
  document.body.append(dialog);
  return new Promise((resolve) => {
    /** @param {boolean} answer */
    const finish = (answer) => {
      if (dialog.open) dialog.close();
      dialog.remove();
      resolve(answer);
    };
    yes.addEventListener("click", () => finish(true));
    no.addEventListener("click", () => finish(false));
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); finish(false); });
    dialog.showModal();
    yes.focus();
  });
}

import { afterEach, expect, test } from "vitest";
import { currentLanguage, pickLanguage, setLanguage, t, translatePage } from "../static/js/i18n.js";

afterEach(() => setLanguage("en"));

test("picks the first language the client speaks, English otherwise", () => {
  expect(pickLanguage(["es-ES", "en"])).toBe("es");
  expect(pickLanguage(["fr-FR", "es-MX"])).toBe("es");
  expect(pickLanguage(["de", "fr"])).toBe("en");
  expect(pickLanguage([])).toBe("en");
});

test("fills placeholders in the current language", () => {
  expect(t("forget_confirm", { name: "Mac" })).toBe("Forget Mac in this browser?");
  setLanguage("es");
  expect(currentLanguage()).toBe("es");
  expect(t("forget_confirm", { name: "Mac" })).toBe("¿Olvidar Mac en este navegador?");
});

test("every Spanish text uses the same placeholders as the English one", () => {
  const values = { name: "⟨name⟩", where: "⟨where⟩", health: "⟨health⟩", folder: "⟨folder⟩", reason: "⟨reason⟩" };
  const markers = (text) => (text.match(/⟨\w+⟩/g) || []).sort();
  for (const key of ["new_conversation_on", "unreachable", "trust_folder", "no_camera", "cannot_reach_pairing", "forget_confirm", "key_rejected"]) {
    setLanguage("en");
    const english = markers(t(key, values));
    setLanguage("es");
    expect(markers(t(key, values)), key).toEqual(english);
    expect(english.length, key).toBeGreaterThan(0);
  }
});

test("translatePage sets texts, placeholders, labels and the page language", () => {
  setLanguage("es");
  document.body.innerHTML = '<button data-i18n="retry">Try again</button><input data-i18n-placeholder="search" data-i18n-label="search">';
  translatePage();
  expect(document.documentElement.lang).toBe("es");
  expect(document.querySelector("button").textContent).toBe("Reintentar");
  expect(document.querySelector("input").getAttribute("placeholder")).toBe("Buscar conversaciones");
  expect(document.querySelector("input").getAttribute("aria-label")).toBe("Buscar conversaciones");
});

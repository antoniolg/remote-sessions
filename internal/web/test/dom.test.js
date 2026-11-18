import { beforeEach, expect, test } from "vitest";
import { $, ago, skeleton } from "../static/js/dom.js";

beforeEach(() => { document.body.innerHTML = '<input id="search">'; });

test("$ finds an element and fails loudly on a missing id", () => {
  expect($("search").tagName).toBe("INPUT");
  expect(() => $("nope")).toThrow("#nope is missing from index.html");
});

test("ago gives a short age: now, then minutes, hours or days", () => {
  const now = Date.parse("2026-11-18T12:00:00Z");
  const short = (unit, value) => new Intl.NumberFormat("en", { style: "unit", unit, unitDisplay: "short" }).format(value);
  expect(ago("2026-11-18T11:59:50Z", now)).toBe(new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(0, "minute"));
  expect(ago("2026-11-18T11:15:00Z", now)).toBe(short("minute", 45));
  expect(ago("2026-11-18T09:00:00Z", now)).toBe(short("hour", 3));
  expect(ago("2026-11-16T12:00:00Z", now)).toBe(short("day", 2));
});

test("skeleton builds hidden placeholders with one bar per width", () => {
  const items = skeleton(3, (index) => (index % 2 ? "assistant" : "user"), ["90%", "40%"]);
  expect(items).toHaveLength(3);
  expect(items[1].className).toBe("skeleton assistant");
  expect(items[0].getAttribute("aria-hidden")).toBe("true");
  expect([...items[0].children].map((bar) => bar.style.width)).toEqual(["90%", "40%"]);
});

test("setOpenLink only shows https links from a computer", async () => {
  const { setOpenLink } = await import("../static/js/dom.js");
  document.body.innerHTML = '<a id="open-claude" hidden></a>';
  setOpenLink("open-claude", "javascript:alert(1)");
  expect(document.getElementById("open-claude").hidden).toBe(true);
  setOpenLink("open-claude", "https://claude.ai/code/session_1");
  expect(document.getElementById("open-claude").hidden).toBe(false);
  expect(document.getElementById("open-claude").getAttribute("href")).toBe("https://claude.ai/code/session_1");
});

import { beforeEach, expect, test, vi } from "vitest";

const dev = { id: "d1", name: "dev", origin: "https://sessions.example", token: "a" };
const mac = { id: "m1", name: "MacBook Pro", origin: "https://sessions.example/macbook-pro", token: "b" };

async function load(computers, address = "/app/") {
  localStorage.clear();
  localStorage.setItem("remote-sessions.computers", JSON.stringify(computers));
  history.replaceState(null, "", address);
  document.body.innerHTML = '<input id="search"><select id="project"><option value="">All</option><option>loop</option></select>';
  vi.resetModules();
  const url = await import("../static/js/url.js");
  const store = await import("../static/js/computers.js");
  return { ...url, store };
}

beforeEach(() => localStorage.clear());

test("readFilters applies the computer, search and project from the address", async () => {
  const { readFilters, store } = await load([dev, mac], "/app/?computer=macbook-pro&q=fix%20login&project=web");
  readFilters();
  expect(store.selected()).toMatchObject({ id: "m1" });
  expect(document.getElementById("search").value).toBe("fix login");
  // The project's option arrives with the sessions; until then it waits in data-wanted.
  expect(document.getElementById("project").dataset.wanted).toBe("web");
});

test("readFilters accepts all, a computer id, and ignores an unknown computer", async () => {
  let { readFilters, store } = await load([dev, mac], "/app/?computer=all");
  readFilters();
  expect(store.selected()).toBe(store.ALL);
  ({ readFilters, store } = await load([dev, mac], "/app/?computer=m1"));
  readFilters();
  expect(store.selected()).toMatchObject({ id: "m1" });
  ({ readFilters, store } = await load([dev, mac], "/app/?computer=ghost"));
  readFilters();
  expect(store.selected()).toMatchObject({ id: "d1" });
});

test("writeFilters writes only what is set, without adding history", async () => {
  const { writeFilters, store } = await load([dev, mac]);
  store.select("m1");
  document.getElementById("search").value = "  loop  ";
  document.getElementById("project").value = "loop";
  const before = history.length;
  writeFilters();
  expect(location.search).toBe("?computer=macbook-pro&q=loop&project=loop");
  expect(history.length).toBe(before);
});

test("writeFilters leaves out the computer with a single one paired", async () => {
  const { writeFilters } = await load([dev], "/app/?computer=dev&q=x");
  writeFilters();
  expect(location.search).toBe("");
});

test("computers whose names look alike are written and read by id", async () => {
  const twin = { ...mac, id: "m2", name: "macbook pro" };
  const { readFilters, writeFilters, store } = await load([dev, mac, twin], "/app/?computer=m2");
  readFilters();
  expect(store.selected()).toMatchObject({ id: "m2" });
  writeFilters();
  expect(location.search).toBe("?computer=m2");
});

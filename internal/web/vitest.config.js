import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "https://sessions.example/app/" } },
    include: ["test/**/*.test.js"],
    restoreMocks: true,
  },
});

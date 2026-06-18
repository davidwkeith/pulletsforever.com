import { getViteConfig } from "astro/config";

// Astro-aware vitest config so `astro:assets` and `import.meta.glob`
// resolve inside unit tests. Runs the src/ suite; the worker suite has
// its own config under worker/.
export default getViteConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

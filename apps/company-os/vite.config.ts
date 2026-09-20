/// <reference types="vitest/config" />

import { existsSync } from "node:fs"
import { loadEnvFile } from "node:process"
import { fileURLToPath } from "node:url"

import { defineConfig } from "@continual/tanstack-start/vite"

const resolveApp = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url))
const nodePreset = process.env.NITRO_PRESET

export default defineConfig({
  // Long-lived Node hosts (containers, Railway) build with NITRO_PRESET=node_server;
  // the default stays Continual's request-scoped workerd deployment.
  nitro:
    nodePreset === undefined
      ? { preset: "cloudflare_module" }
      : { preset: nodePreset, noExternals: true },
  tanstackStart: {
    importProtection: {
      behavior: "error",
      client: {
        files: ["**/server/**", "**/server.ts", "**/*.server.*"],
      },
      server: {
        files: ["**/*.client.*"],
      },
    },
  },
  vite: ({ command, isPreview }) => {
    // The server reads configuration from the process environment; local
    // overrides come from these files, app-level first. Development defaults
    // live in src/app/server/config.ts, not in a file.
    if (command === "serve" && !isPreview)
      for (const file of [".env.local", "../../.env.local"])
        if (existsSync(new URL(file, import.meta.url)))
          loadEnvFile(new URL(file, import.meta.url))

    return {
      resolve: {
        alias: [
          // Use Shiki's portable WASM entry; Nitro's unwasm condition selects a raw file.
          { find: "shiki/wasm", replacement: "shiki/dist/wasm.mjs" },
          // Node builds otherwise resolve tslib's CommonJS entry, whose bundled
          // interop leaves the helper namespace undefined at runtime.
          { find: /^tslib$/, replacement: "tslib/tslib.es6.mjs" },
          ...(nodePreset === undefined
            ? []
            : [
                // These CommonJS shims require React at runtime, which loads a
                // second copy with no hook dispatcher. The ESM ports bundle with
                // the rest of the graph and use React's own implementation.
                {
                  find: /^use-sync-external-store\/shim(\/index(\.js)?)?$/,
                  replacement: resolveApp(
                    "./src/app/client/vendor/use-sync-external-store-shim.ts"
                  ),
                },
                {
                  find: /^use-sync-external-store\/(shim\/)?with-selector(\.js)?$/,
                  replacement: resolveApp(
                    "./src/app/client/vendor/use-sync-external-store-with-selector.ts"
                  ),
                },
              ]),
        ],
      },
      server: {
        // A moved port breaks VITE_APP_URL, MCP origin checks, and muscle memory; fail instead.
        strictPort: true,
        allowedHosts: [
          ".tensorlake.ai",
          ".e2b.app",
          ".proxy.daytona.work",
          ".modal.host",
          ...(process.env.CONTINUAL_ALLOWED_DEV_HOSTS?.split(",")
            .map((host) => host.trim())
            .filter(Boolean) ?? []),
        ],
      },
      test: {
        teardownTimeout: 120_000,
        projects: [
          {
            extends: true,
            test: {
              exclude: [
                "src/**/*-database.test.{ts,tsx}",
                "tools/**/*-live.test.ts",
              ],
              include: ["src/**/*.test.{ts,tsx}", "tools/**/*.test.ts"],
              name: "unit",
            },
          },
          {
            extends: true,
            test: {
              globalSetup: "./src/runtime/testing/global-setup.ts",
              include: ["src/**/*-database.test.ts"],
              hookTimeout: 60_000,
              name: "database",
              testTimeout: 60_000,
            },
          },
          {
            extends: true,
            test: {
              include: ["tools/agents/*-live.test.ts"],
              name: "agents-live",
              globalSetup: "./src/runtime/testing/global-setup.ts",
              fileParallelism: false,
            },
          },
        ],
      },
    }
  },
})

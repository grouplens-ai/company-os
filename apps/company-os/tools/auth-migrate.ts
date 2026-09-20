import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import { getMigrations } from "better-auth/db/migration"
import { Effect } from "effect"

import { betterAuthService } from "#/app/server/auth/better-auth.ts"
import { localConfigLayer } from "#/app/server/local-config.ts"

/**
 * Applies Better Auth's own credential tables. Business storage stays with
 * `pnpm db:migrate`; this runner only owns the identity provider's schema.
 */
Effect.gen(function* () {
  const { options } = yield* betterAuthService
  const { runMigrations, toBeAdded, toBeCreated } = yield* Effect.promise(() =>
    getMigrations(options)
  )
  if (toBeAdded.length === 0 && toBeCreated.length === 0) {
    yield* Effect.log("Better Auth schema is current.")
    return
  }
  yield* Effect.promise(() => runMigrations())
  yield* Effect.log("Better Auth schema applied.")
}).pipe(
  Effect.provide(localConfigLayer({ development: true })),
  NodeRuntime.runMain
)

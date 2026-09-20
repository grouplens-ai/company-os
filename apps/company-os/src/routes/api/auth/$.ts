import { createFileRoute } from "@tanstack/react-router"
import { Effect } from "effect"

import { applicationRuntime } from "#/app/server/application-runtime.ts"
import { betterAuthService } from "#/app/server/auth/better-auth.ts"

/** Better Auth owns sign-up, sign-in, and session endpoints under /api/auth. */
function handle(request: Request): Promise<Response> {
  return applicationRuntime.runPromise(
    betterAuthService.pipe(
      Effect.flatMap(({ auth }) => Effect.promise(() => auth.handler(request)))
    )
  )
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
})

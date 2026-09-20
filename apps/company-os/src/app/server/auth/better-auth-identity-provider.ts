import { Effect, Layer } from "effect"

import { betterAuthService } from "#/app/server/auth/better-auth.ts"
import {
  IdentityProvider,
  InvalidIdentityAssertion,
  type AuthenticatedSubject,
} from "#/runtime/server/auth/identity-provider.ts"

/**
 * Better Auth owns credentials and sessions in this deployment's database;
 * project admission stays with the configured email list.
 */
export const betterAuthIdentityProviderLayer = Layer.effect(
  IdentityProvider,
  Effect.gen(function* () {
    const { admitsEmail, auth } = yield* betterAuthService
    return {
      identify: Effect.fn("@company/BetterAuthIdentityProvider.identify")(
        function* (headers: Headers) {
          const session = yield* Effect.tryPromise({
            try: () => auth.api.getSession({ headers }),
            catch: () =>
              new InvalidIdentityAssertion({
                reason: "The session could not be verified.",
              }),
          })
          if (session === null) return null
          if (!admitsEmail(session.user.email))
            return yield* Effect.fail(
              new InvalidIdentityAssertion({
                reason: "This identity is not admitted to this project.",
              })
            )
          const subject: AuthenticatedSubject = {
            email: session.user.email,
            issuer: "better-auth",
            kind: "user",
            name: session.user.name || undefined,
            subject: session.user.id,
          }
          return subject
        }
      ),
    }
  })
)

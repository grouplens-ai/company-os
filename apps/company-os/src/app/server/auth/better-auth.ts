import type { BetterAuthOptions } from "better-auth"
import { Config, Effect, Redacted } from "effect"

/**
 * Admission list for this project. Every admitted identity has full business
 * access, so an empty list admits nobody: a deployment names its people.
 */
const admittedEmailsConfig = Config.String("AUTH_ALLOWED_EMAILS").pipe(
  Config.withDefault(""),
  Config.map((value) =>
    value
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  )
)

const baseUrlConfig = Config.String("AUTH_BASE_URL").pipe(
  Config.orElse(() => Config.String("VITE_APP_URL")),
  Config.withDefault("")
)

/**
 * Builds Better Auth from deployment configuration, including its own pool.
 * The library and its Node driver load only where this provider is selected.
 */
const makeBetterAuth = Effect.gen(function* () {
  const databaseUrl = yield* Config.Redacted("DATABASE_URL")
  const secret = yield* Config.Redacted("APP_SECRET")
  const baseURL = yield* baseUrlConfig
  const admittedEmails = yield* admittedEmailsConfig
  const admitsEmail = (email: string | null | undefined) => {
    const address = email?.trim().toLowerCase()
    return address !== undefined && admittedEmails.includes(address)
  }
  const { betterAuth } = yield* Effect.promise(() => import("better-auth"))
  const { Pool } = yield* Effect.promise(() => import("pg"))
  const options = {
    appName: "Company OS",
    ...(baseURL === "" ? {} : { baseURL, trustedOrigins: [baseURL] }),
    secret: Redacted.value(secret),
    database: new Pool({
      connectionString: Redacted.value(databaseUrl),
      max: 4,
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 12 },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    databaseHooks: {
      user: {
        create: {
          // The credential store never holds an account this project cannot admit.
          before: async (user: { email?: string | null }) => {
            if (!admitsEmail(user.email))
              throw new Error("This email is not admitted to this project.")
            return undefined
          },
        },
      },
    },
  } satisfies BetterAuthOptions
  return { admitsEmail, auth: betterAuth(options), options }
})

/** One instance per process; sessions and credentials share its connections. */
export const betterAuthService = Effect.runSync(Effect.cached(makeBetterAuth))

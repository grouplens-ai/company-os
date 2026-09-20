import { createAuthClient } from "better-auth/react"

/** Browser half of Better Auth; the server mounts the matching /api/auth routes. */
export const authClient = createAuthClient({ basePath: "/api/auth" })

/** Deployments that verify Better Auth sessions show credential controls. */
export const usesBetterAuth =
  import.meta.env.VITE_IDENTITY_PROVIDER === "betterAuth"

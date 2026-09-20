import { Button } from "@company/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@company/ui/card"
import { Field, FieldError, FieldLabel } from "@company/ui/field"
import { Input } from "@company/ui/input"
import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeftIcon } from "lucide-react"
import { useState } from "react"

import { authClient, usesBetterAuth } from "#/app/client/auth-client.ts"
import { appConfig } from "#/app/customization/config.ts"
import { pageOptions } from "#/app/ui/route-metadata.ts"

const page = {
  breadcrumb: "Sign in",
  description: `Sign in through your organization to open ${appConfig.identity.name}.`,
  title: "Sign in",
}

export const Route = createFileRoute("/sign-in")({
  ...pageOptions(page),
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo: typeof search.returnTo === "string" ? search.returnTo : undefined,
  }),
  component: SignIn,
})

function SignIn() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to {appConfig.identity.name}</CardTitle>
          <CardDescription>
            {usesBetterAuth
              ? "Use the email address your administrator admitted to this project."
              : "Open your organization’s sign-in link, then return to this app. Contact your administrator if you need the link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usesBetterAuth ? <CredentialsForm /> : <TryAgain />}
        </CardContent>
      </Card>
    </main>
  )
}

function TryAgain() {
  return (
    <Button
      variant="outline"
      nativeButton={false}
      render={<a href="/" aria-label="Try again" />}
    >
      <ArrowLeftIcon data-icon="inline-start" />
      Try again
    </Button>
  )
}

function CredentialsForm() {
  const { returnTo } = Route.useSearch()
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | undefined>(undefined)
  const [pending, setPending] = useState(false)
  const destination = returnTo ?? "/"

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(undefined)
    const result =
      mode === "signIn"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({
            email,
            name: name || email,
            password,
          })
    setPending(false)
    if (result.error) {
      setError(result.error.message ?? "Sign in failed.")
      return
    }
    // A full load lets the server resolve the new session for the app shell.
    window.location.assign(destination)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      {mode === "signUp" ? (
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      ) : null}
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input
          id="password"
          type="password"
          required
          minLength={12}
          autoComplete={mode === "signIn" ? "current-password" : "new-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <FieldError>{error}</FieldError> : null}
      </Field>
      <Button type="submit" disabled={pending}>
        {mode === "signIn" ? "Sign in" : "Create account"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setError(undefined)
          setMode(mode === "signIn" ? "signUp" : "signIn")
        }}
      >
        {mode === "signIn"
          ? "First time here? Create your account"
          : "Already have an account? Sign in"}
      </Button>
    </form>
  )
}

import { tmpdir } from "node:os"
import { join } from "node:path"

import { NodeServices } from "@effect/platform-node"
import { Codex } from "@openai/codex-sdk"
import { Config, Effect, FileSystem, Layer, type Schema } from "effect"

import { agentControllersEnabled } from "#/runtime/server/agent-controllers.ts"
import {
  Agent,
  AgentError,
  type AgentRunOptions,
  type AgentSession,
} from "#/runtime/server/agent.ts"
import { CodexAgent } from "#/runtime/server/codex-agent.ts"

/** Hosts without a Codex CLI never construct its client; controllers skip their runs. */
function disabledRun<A>(
  options: AgentRunOptions & { readonly outputSchema: Schema.Codec<A, unknown> }
): Effect.Effect<A, AgentError, AgentSession>
function disabledRun(
  options: AgentRunOptions & { readonly outputSchema?: undefined }
): Effect.Effect<void, AgentError, AgentSession>
function disabledRun(
  _options: AgentRunOptions
): Effect.Effect<never, AgentError> {
  return Effect.fail(
    new AgentError({ message: "Agent runs are disabled on this host." })
  )
}

const disabledAgentLayer = Layer.succeed(Agent, Agent.of({ run: disabledRun }))

/** Node controller host only. Provider/tool configuration belongs to the application. */
export const agentLayer = Layer.unwrap(
  Effect.gen(function* () {
    if (!(yield* agentControllersEnabled)) return disabledAgentLayer
    const fs = yield* FileSystem.FileSystem
    const workingDirectory = join(tmpdir(), "company-os-agent")
    yield* fs.makeDirectory(workingDirectory, { recursive: true })
    const url = yield* Config.String("COMPANY_OS_MCP_URL").pipe(
      Config.withDefault("http://localhost:3002/api/mcp")
    )
    return CodexAgent.layer(
      new Codex({
        config: { mcp_servers: { company_os: { url, required: true } } },
      }),
      {
        model: "gpt-5.6-luna",
        modelReasoningEffort: "low",
        workingDirectory,
        skipGitRepoCheck: true,
        sandboxMode: "read-only",
        approvalPolicy: "never",
        webSearchMode: "live",
      }
    )
  })
).pipe(Layer.provide(NodeServices.layer))

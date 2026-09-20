import { Config } from "effect"

/**
 * Hosts without a Codex CLI (plain containers, workerd) turn agent runs off:
 * controllers still reconcile, they just skip the agent.
 */
export const agentControllersEnabled = Config.Boolean(
  "AGENT_CONTROLLERS_ENABLED"
).pipe(Config.withDefault(true))

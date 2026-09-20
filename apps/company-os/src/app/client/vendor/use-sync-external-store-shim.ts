// oxlint-disable -- Ported dependency code: React owns these hook rules.
/**
 * React 18+ ships `useSyncExternalStore`, so the CommonJS shim only exists for
 * older peers. Node builds alias the package here: its `require("react")` would
 * otherwise load a second React copy with no hook dispatcher.
 */
export { useSyncExternalStore } from "react"

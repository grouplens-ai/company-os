// oxlint-disable -- Ported dependency code: React owns these hook rules.
import { useDebugValue, useMemo, useRef, useSyncExternalStore } from "react"

/**
 * Selector wrapper from `use-sync-external-store/shim/with-selector`, ported to
 * ESM so Node builds keep a single React instance. Behavior follows the
 * upstream MIT-licensed implementation by Meta Platforms, Inc.
 */
export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot: undefined | (() => Snapshot),
  selector: (snapshot: Snapshot) => Selection,
  isEqual?: (a: Selection, b: Selection) => boolean
): Selection {
  const instRef = useRef<
    { hasValue: false; value: null } | { hasValue: true; value: Selection }
  >(null)
  const inst =
    instRef.current === null
      ? (instRef.current = { hasValue: false, value: null })
      : instRef.current

  const [getSelection, getServerSelection] = useMemo(() => {
    // Memoize both the last snapshot and the last selection it produced.
    let hasMemo = false
    let memoizedSnapshot: Snapshot
    let memoizedSelection: Selection
    const memoizedSelector = (nextSnapshot: Snapshot) => {
      if (!hasMemo) {
        hasMemo = true
        memoizedSnapshot = nextSnapshot
        const nextSelection = selector(nextSnapshot)
        if (isEqual !== undefined && inst.hasValue) {
          const currentSelection = inst.value
          if (isEqual(currentSelection, nextSelection)) {
            memoizedSelection = currentSelection
            return currentSelection
          }
        }
        memoizedSelection = nextSelection
        return nextSelection
      }
      if (Object.is(memoizedSnapshot, nextSnapshot)) return memoizedSelection
      const nextSelection = selector(nextSnapshot)
      memoizedSnapshot = nextSnapshot
      if (isEqual !== undefined && isEqual(memoizedSelection, nextSelection))
        return memoizedSelection
      memoizedSelection = nextSelection
      return nextSelection
    }
    return [
      () => memoizedSelector(getSnapshot()),
      getServerSnapshot === undefined
        ? undefined
        : () => memoizedSelector(getServerSnapshot()),
    ] as const
  }, [getSnapshot, getServerSnapshot, selector, isEqual, inst])

  const value = useSyncExternalStore(
    subscribe,
    getSelection,
    getServerSelection
  )
  // The next render compares against this selection when isEqual is supplied.
  instRef.current = { hasValue: true, value }
  useDebugValue(value)
  return value
}

export default { useSyncExternalStoreWithSelector }

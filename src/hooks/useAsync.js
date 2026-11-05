import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Ejecuta una función async al montar (y cuando cambian `deps`).
 * Conserva los datos anteriores mientras recarga, para no parpadear.
 * Un 401 no se reporta aquí: el AuthContext ya cierra la sesión.
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [tick, setTick] = useState(0)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, status: 'loading', error: null }))
    fnRef
      .current()
      .then((data) => alive && setState({ status: 'ready', data, error: null }))
      .catch((error) => {
        if (alive && error?.code !== 'UNAUTHORIZED') setState({ status: 'error', data: null, error })
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, loading: state.status === 'loading', reload }
}

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 3-stage button state: idle -> loading -> success | error -> (auto) idle
 */
export type ActionState = 'idle' | 'loading' | 'success' | 'error';

const RESET_AFTER_MS = 1800;

/**
 * Ek button ke liye async action runner.
 *
 *   const save = useAsyncAction();
 *   const onSubmit = () => save.run(async () => { await api(); });
 *   <ActionButton state={save.state} onClick={onSubmit}>Save</ActionButton>
 *
 * - `fn` throw kare ya `false` return kare -> 'error' stage
 * - loading ke dauraan dobara call ignore hoti hai (double-submit protection)
 * - error rethrow nahi hota; `run` result ya `undefined` return karta hai
 */
export function useAsyncAction() {
  const [state, setState] = useState<ActionState>('idle');
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const settle = useCallback((next: ActionState) => {
    if (!mounted.current) return;
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (mounted.current) setState('idle');
    }, RESET_AFTER_MS);
  }, []);

  const run = useCallback(
    async <T,>(fn: () => Promise<T> | T): Promise<T | undefined> => {
      if (busy.current) return undefined;
      busy.current = true;
      if (timer.current) clearTimeout(timer.current);
      setState('loading');
      try {
        const result = await fn();
        settle(result === false ? 'error' : 'success');
        return result;
      } catch (err) {
        console.error('Action failed:', err);
        settle('error');
        return undefined;
      } finally {
        busy.current = false;
      }
    },
    [settle]
  );

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setState('idle');
  }, []);

  return { state, run, reset, isLoading: state === 'loading' };
}

/**
 * List ke har row ke buttons ke liye (approve / reject per item).
 *
 *   const rowAction = useKeyedAsyncAction();
 *   <ActionButton state={rowAction.stateOf(`approve-${id}`)} onClick={() => rowAction.run(`approve-${id}`, fn)} />
 */
export function useKeyedAsyncAction() {
  const [states, setStates] = useState<Record<string, ActionState>>({});
  const busy = useRef<Set<string>>(new Set());
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const t = timers.current;
    return () => {
      mounted.current = false;
      Object.values(t).forEach(clearTimeout);
    };
  }, []);

  const setKey = useCallback((key: string, value: ActionState) => {
    if (!mounted.current) return;
    setStates(prev => ({ ...prev, [key]: value }));
  }, []);

  const run = useCallback(
    async <T,>(key: string, fn: () => Promise<T> | T): Promise<T | undefined> => {
      if (busy.current.has(key)) return undefined;
      busy.current.add(key);
      if (timers.current[key]) clearTimeout(timers.current[key]);
      setKey(key, 'loading');
      let final: ActionState = 'success';
      try {
        const result = await fn();
        if (result === false) final = 'error';
        return result;
      } catch (err) {
        console.error('Action failed:', err);
        final = 'error';
        return undefined;
      } finally {
        busy.current.delete(key);
        setKey(key, final);
        timers.current[key] = setTimeout(() => setKey(key, 'idle'), RESET_AFTER_MS);
      }
    },
    [setKey]
  );

  const stateOf = useCallback((key: string): ActionState => states[key] || 'idle', [states]);
  const isAnyLoading = Object.values(states).some(s => s === 'loading');

  return { run, stateOf, isAnyLoading };
}

/**
 * @module use-storage-state
 *
 * Generic cross-platform key-value persistence layer for React Native + Web.
 *
 * This module knows nothing about files, file pickers, or any specific feature.
 * It's a reusable primitive — think of it as "useState, but the value survives
 * app restarts." Any string value you store here will be:
 *   - On native (iOS/Android): saved in SecureStore (hardware-backed encryption)
 *   - On web: saved in localStorage (browser storage)
 *
 * The hook returns a tuple `[state, setValue]` where `state` is `[isLoading, value]`:
 *   - `[true, null]`  → "haven't loaded the stored value yet"
 *   - `[false, null]`  → "loaded, and there was no stored value"
 *   - `[false, "abc"]` → "loaded, and the stored value is 'abc'"
 *
 * This loading state lets consumers show a spinner or skeleton while the
 * async storage read completes on mount, avoiding a flash of default content.
 *
 * Usage:
 *   const [[isLoading, value], setValue] = useStorageState('my-key');
 *   // value starts as null with isLoading=true, then resolves to the stored string
 *   // calling setValue('new') persists to SecureStore/localStorage immediately
 */
import { useEffect, useCallback, useReducer } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Type alias for the hook's return value.
 *
 * `T` is the type of the stored value (always `string` for this hook).
 * The tuple contains:
 *   1. `[boolean, T | null]` — a pair of (isLoading, value)
 *   2. `(value: T | null) => void` — a setter that both updates React state
 *      and persists the value to disk. Pass `null` to delete the key.
 */
type UseStateHook<T> = [[boolean, T | null], (value: T | null) => void];

/**
 * Internal helper that manages async state using `useReducer`.
 *
 * Why useReducer instead of useState?
 *   We need to track two things atomically: whether we're still loading, and
 *   the current value. With useState we'd need two separate state variables
 *   and risk a render where `isLoading` has updated but `value` hasn't (or vice
 *   versa). useReducer gives us a single dispatch that updates both in one shot.
 *
 * State transitions:
 *   Initial:  [true, null]   — "loading, no value yet"
 *   After dispatch(value):
 *             [false, value] — "loaded, here's the value (or null if none)"
 *
 * The reducer always sets `isLoading` to false because the only time we're
 * "loading" is before the first dispatch (the initial value). Every dispatch
 * represents a completed async operation that has resolved to a concrete value.
 */
function useAsyncState<T>(
  initialValue: [boolean, T | null] = [true, null]
): UseStateHook<T> {
  return useReducer(
    (state: [boolean, T | null], action: T | null = null): [boolean, T | null] => [
      false,
      action,
    ],
    initialValue
  ) as UseStateHook<T>;
}

/**
 * Persists a string value to the underlying storage, or deletes it.
 *
 * Platform behavior:
 *   - **Native (iOS/Android)**: Uses expo-secure-store, which stores data in
 *     the device's encrypted keychain (iOS Keychain / Android Keystore).
 *     This is appropriate for small sensitive data like auth tokens or
 *     serialized metadata. Note: SecureStore has a ~2KB value size limit per key.
 *   - **Web**: Uses browser localStorage. Wrapped in try/catch because
 *     localStorage can throw in private browsing mode or when storage is full.
 *
 * Passing `null` as the value removes the key entirely from storage.
 *
 * This function is exported so other modules (like use-file-picker) can
 * write directly to storage without going through the React hook lifecycle.
 */
export async function setStorageItemAsync(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.error('Local storage is unavailable:', e);
    }
  } else {
    if (value === null) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  }
}

/**
 * A persistent state hook — like `useState`, but the value survives app restarts.
 *
 * Returns `[state, setValue]` where `state` is `[isLoading, value]`:
 *   - On first render, state is `[true, null]` (loading, value unknown).
 *   - After the mount effect reads from storage, state becomes `[false, storedValue]`.
 *   - Calling `setValue('newVal')` updates both the React state AND writes to
 *     SecureStore/localStorage so the value persists across app restarts.
 *   - Calling `setValue(null)` deletes the key from storage.
 *
 * @param key - The storage key to read/write. Changing this key triggers a
 *              re-read from storage (via the useEffect dependency).
 */
export function useStorageState(key: string): UseStateHook<string> {
  const [state, setState] = useAsyncState<string>();

  // Read the stored value on mount (and whenever the key changes).
  //
  // This is the "hydrate from disk" step. On mount, React state is [true, null]
  // (meaning "loading, no value yet"). This effect reads the actual stored value
  // and dispatches it through setState, which transitions state to [false, value].
  //
  // The key is in the dependency array so that if the consumer changes the key,
  // we re-read from the new storage location.
  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          setState(localStorage.getItem(key));
        }
      } catch (e) {
        console.error('Local storage is unavailable:', e);
      }
    } else {
      SecureStore.getItemAsync(key).then((value: string | null) => {
        setState(value);
      });
    }
  }, [key]);

  // Returns a memoized setter that updates both React state and persistent storage.
  //
  // Why useCallback? Without it, a new function reference would be created on
  // every render, causing unnecessary re-renders in consumers that pass setValue
  // as a prop or include it in their own dependency arrays.
  //
  // The `key` dependency ensures the setter always writes to the correct storage
  // location if the key changes during the component's lifetime.
  const setValue = useCallback(
    (value: string | null) => {
      setState(value);
      setStorageItemAsync(key, value);
    },
    [key]
  );

  return [state, setValue];
}

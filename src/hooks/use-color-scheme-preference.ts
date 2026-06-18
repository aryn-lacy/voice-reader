import { Appearance } from 'react-native';
import { useEffect } from 'react';
import { useStorageState } from '@/hooks/use-storage-state';

export type ColorSchemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'color-scheme-preference';

/**
 * Maps a preference to the RN Appearance API.
 * 'system' → 'unspecified' (reset to OS-follow), 'light'/'dark' pass through.
 *
 * Note: RN's type for setColorScheme is ColorSchemeName = 'light' | 'dark'
 * | 'unspecified'. Passing 'unspecified' resets the override so the app
 * follows the OS — see Appearance.js in react-native 0.85. Older RN versions
 * used `null` here, but the type no longer permits it.
 */
function applyPreference(pref: ColorSchemePreference) {
  Appearance.setColorScheme(pref === 'system' ? 'unspecified' : pref);
}

function isValidPreference(value: string | null): value is ColorSchemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * Reads/writes the user's color scheme preference and applies it globally.
 * All useColorScheme() consumers (useTheme, _layout's ThemeProvider) pick up
 * the change automatically — no additional plumbing required.
 *
 * Returns:
 *   - preference: 'system' while loading or when no override is stored,
 *                 otherwise the stored 'light' | 'dark' | 'system'
 *   - setPreference(next): persists and applies immediately
 *
 * 'system' calls Appearance.setColorScheme('unspecified') → follows OS.
 */
export function useColorSchemePreference() {
  const [[isLoading, stored], setStored] = useStorageState(STORAGE_KEY);

  // Apply stored preference once hydration completes. Idempotent — safe to run
  // in every consumer. _layout.tsx must use this hook so the apply fires on
  // app start (not just when the user navigates to settings).
  useEffect(() => {
    if (isLoading) return;
    applyPreference(isValidPreference(stored) ? stored : 'system');
  }, [isLoading, stored]);

  const preference: ColorSchemePreference = isValidPreference(stored) ? stored : 'system';

  const setPreference = (next: ColorSchemePreference) => {
    setStored(next);
    applyPreference(next);
  };

  return [preference, setPreference] as const;
}

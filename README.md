# Voice Reader

An Expo SDK 56 React Native app demonstrating file selection with persistent storage across iOS, Android, and web.

Built with [Expo](https://expo.dev), [expo-router](https://docs.expo.dev/router/introduction/), and [expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/).

## Features

- **File Picker** — Select any file from the device using the native system picker
- **Persistent Storage** — Files are copied to the app's document directory and survive app restarts
- **Cross-Platform** — Works on iOS, Android, and web (with localStorage fallback)
- **Themed UI** — Light and dark mode support using a custom theme system
- **Metadata Persistence** — File name, size, type, and selection timestamp are saved in encrypted storage

## Get Started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

3. Open on your preferred platform:
   - iOS Simulator
   - Android Emulator
   - Web browser (`w` key)

## Architecture

### File Structure

```
src/
├── app/
│   ├── _layout.tsx          # Root layout: ThemeProvider + AnimatedSplashOverlay + AppTabs
│   ├── index.tsx            # Home screen with FilePickerCard
│   └── explore.tsx          # Explore tab
├── components/
│   ├── file-picker-card.tsx  # File picker UI (themed card with state management)
│   ├── app-tabs.tsx          # NativeTabs configuration (Home + Explore)
│   ├── themed-text.tsx       # Themed text component (title/subtitle/default/small/code)
│   ├── themed-view.tsx       # Themed view component (background/backgroundElement)
│   └── ...
├── hooks/
│   ├── use-file-picker.ts    # File selection + persistence business logic
│   ├── use-storage-state.ts  # Cross-platform key-value persistence hook
│   └── use-theme.ts          # Light/dark theme hook
└── constants/
    └── theme.ts              # Colors (light/dark) + Spacing constants
```

### Two-Storage Architecture

The app uses two separate storage locations for different purposes:

| What | Where | Why |
|------|-------|-----|
| **File content** (bytes) | `expo-file-system` `Paths.document` | Persistent disk storage that survives app restarts. Unlike `Paths.cache`, the OS won't delete files here under storage pressure. |
| **File metadata** (JSON) | `expo-secure-store` (native) / `localStorage` (web) | Encrypted key-value store for file name, size, type, and path. Small data (~2KB limit on native). Web falls back to `localStorage`. |

### Hook Architecture

#### `useStorageState(key)` — The Persistence Layer

A generic cross-platform key-value store hook. It knows nothing about files — it just saves and loads strings.

```typescript
// Returns [isLoading, value] and a setter
const [[isLoading, value], setValue] = useStorageState('my-key');
```

**How it works:**
- Uses `useReducer` (not `useState`) to track a `[boolean, value]` tuple atomically
- `[true, null]` = "loading, no value yet"
- `[false, "data"]` = "loaded, here's the value"
- On mount: reads from `expo-secure-store` (native) or `localStorage` (web)
- On `setValue`: updates both in-memory state and persistent storage simultaneously
- Think of it like `useState`, but the value survives app restarts

#### `useFilePicker()` — The Business Logic Layer

Wraps the entire file selection + persistence workflow.

```typescript
const { pickFile, selectedFile, isLoading, clearSelection, isRestoring } = useFilePicker();
```

**Operations:**

| Function | What it does |
|----------|-------------|
| `pickFile()` | Opens system picker via `File.pickFileAsync()`, copies file to `Paths.document`, saves metadata to SecureStore |
| `clearSelection()` | Deletes the file from disk, clears metadata from storage |
| `selectedFile` | Current file info (`SelectedFile` object) or `null` |
| `isRestoring` | `true` while loading saved data on mount |
| `isLoading` | `true` while a pick operation is in progress |

**Data flow on app launch:**
```
App opens → useFilePicker mounts
    ↓
Read metadata from SecureStore/localStorage
    ↓
Metadata found?
├── Yes → Parse JSON → Verify file exists on disk
│         ├── File exists → Set selectedFile (show in UI)
│         └── File gone   → Clear stale metadata
└── No  → Show "Pick a file" button
```

**Data flow on file selection:**
```
User taps "Pick a file"
    ↓
File.pickFileAsync() opens system picker
    ↓
User selects file → picker returns File with proper permissions
    ↓
Copy to Paths.document (persistent directory)
    ↓
Save metadata JSON to SecureStore/localStorage
    ↓
UI updates to show file info
```

### Navigation

The app uses [expo-router](https://docs.expo.dev/router/introduction/) with `NativeTabs` for file-based tab navigation:

- `src/app/_layout.tsx` — Root layout wrapping ThemeProvider + AnimatedSplashOverlay + AppTabs
- `src/components/app-tabs.tsx` — Configures `NativeTabs` with two tabs:
  - **Home** (`name="index"`) → renders `src/app/index.tsx`
  - **Explore** (`name="explore"`) → renders `src/app/explore.tsx`

The `name` prop maps directly to filenames in `src/app/`. The native tab bar is rendered by the platform (UITabBar on iOS, BottomNavigationView on Android).

### Theme System

All components use the custom theme system:

```typescript
// Colors available in light and dark variants
Colors = {
  light: { text, background, backgroundElement, backgroundSelected, textSecondary },
  dark:  { text, background, backgroundElement, backgroundSelected, textSecondary },
}

// Spacing scale
Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 }
```

Components: `ThemedText` (with `type` prop for title/subtitle/default/small/code), `ThemedView` (with `type` prop for backgroundElement), and `useTheme()` hook for accessing current colors.

## FAQ

### How do the hooks get called?

Hooks run when their parent component renders — there's no special wiring or event bus. The chain is:

```
Expo Router sees src/app/index.tsx → renders <HomeScreen />
    ↓
HomeScreen renders <FilePickerCard />
    ↓
FilePickerCard calls useFilePicker()
    ↓
useFilePicker() initializes state, runs useEffect on mount
```

`useFilePicker()` runs its restore `useEffect` (with `[]` deps) automatically after the first render. User interactions (`pickFile`, `clearSelection`) are passed as `onPress` handlers to `Pressable` components — standard React event handling.

### Why `File.pickFileAsync()` instead of `DocumentPicker`?

The new `File` class in expo-file-system SDK 56 has a sandboxed permission model. When `DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })` returns a file URI, that URI points to a cache path that the `File` class doesn't have `READ` permission for. So `sourceFile.copy(destFile)` fails with:

```
Error: Call to function 'FileSystemFile.copy' has been rejected.
→ Caused by: Missing 'READ' permission for accessing the file.
```

`File.pickFileAsync()` is the SDK 56-native file picker that:
- Opens the same system file picker UI
- Returns a `File` object **with proper READ permissions** (the picker grants them at the OS level)
- Makes subsequent operations like `copy()` work correctly

### Why `Paths.document` instead of `Paths.cache`?

- `Paths.cache` — the OS can clear this directory under storage pressure. Files here are NOT guaranteed to survive.
- `Paths.document` — persistent storage for app-created files. The OS will NOT delete files here. This is where user data should live.

Since we want files to persist across app restarts, `Paths.document` is the correct choice.

### Why is metadata stored separately from the file?

`expo-secure-store` has a ~2KB value limit on native platforms. File content (which could be megabytes) is stored on disk in `Paths.document`. Only the small metadata JSON (file name, size, type, path, timestamp) goes into SecureStore/localStorage.

### Why `useReducer` instead of `useState` in `useStorageState`?

The `useAsyncState` pattern uses `useReducer` to update two values atomically: the loading flag and the stored value. With `useState`, you'd need two separate state variables and risk rendering in an inconsistent state (e.g., loading=false but value still null during the brief moment between updates). `useReducer` applies both changes in a single dispatch.

### How does the restore-on-mount logic work?

```typescript
useEffect(() => {
  async function restoreSelection() {
    // 1. Read metadata from SecureStore or localStorage
    // 2. If found, parse the JSON
    // 3. Check if the file still exists on disk
    //    - If yes → restore it to the UI
    //    - If no  → clear the stale metadata
    // 4. Set isRestoring = false
  }
  restoreSelection();
}, []); // Empty deps = run once on mount
```

The file existence check (`file.exists`) is critical — the user might have cleared app data or the OS might have cleaned up storage. Without this check, the UI would show ghost metadata for a file that no longer exists.

### Does this work on web?

Yes. The `useStorageState` hook forks on `Platform.OS`:
- **Native** (iOS/Android): Uses `expo-secure-store` for encrypted persistence
- **Web**: Falls back to `localStorage`

`File.pickFileAsync()` works on all three platforms. `Paths.document` maps to an appropriate browser storage location on web.

## Dependencies

| Package | Purpose |
|---------|---------|
| `expo-file-system` (~56.0.7) | File class for pick/copy/read/delete operations |
| `expo-secure-store` (~56.0.4) | Encrypted key-value storage for file metadata |
| `expo-router` | File-based routing with NativeTabs |
| `expo-symbols` | SymbolView for platform-specific icons |

## License

Private repository.

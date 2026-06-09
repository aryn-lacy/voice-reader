/**
 * @module use-file-picker
 *
 * Business logic hook for file selection and persistence in the app.
 *
 * This hook combines two storage mechanisms to let the user pick a file and
 * have it survive across app restarts:
 *
 *   1. **File content** → Stored on disk in `Paths.document` (the app's
 *      persistent document directory). This is where actual file bytes live.
 *      We use Paths.document instead of Paths.cache because the OS can freely
 *      delete cache files under storage pressure — document dir is safe.
 *
 *   2. **File metadata** (name, size, mimeType, URI, timestamp) → Stored as
 *      a JSON string in SecureStore (native) or localStorage (web) via the
 *      `use-storage-state` module. This is separate from the file content
 *      because SecureStore has a ~2KB value limit and is designed for small
 *      key-value data, not binary file content.
 *
 * The hook exposes:
 *   - `pickFile()` — Opens the system document picker, copies the chosen file
 *     to persistent storage, saves metadata, and updates UI state.
 *   - `clearSelection()` — Deletes the file from disk and metadata from storage.
 *   - `selectedFile` — The currently selected file's metadata (null if none).
 *   - `isLoading` — True while a pick operation is in progress.
 *   - `isRestoring` — True during the initial mount restore (for showing spinners).
 *
 * Data flow:
 *   Mount → restore metadata from SecureStore → verify file exists → set state
 *   Pick → File.pickFileAsync() → copy to Paths.document → save metadata
 *   Clear → delete file from disk → delete metadata → clear state
 */
import { useCallback, useEffect, useState } from 'react';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { setStorageItemAsync } from './use-storage-state';

/**
 * Storage key used to persist the selected file's metadata in SecureStore
 * (native) or localStorage (web). The value stored under this key is a
 * JSON-serialized `SelectedFile` object.
 */
const STORAGE_KEY = 'selected_file_metadata';

/**
 * Metadata for a user-selected file. This is what gets persisted in
 * SecureStore/localStorage so we can reconstruct the UI after an app restart.
 *
 * Note: This does NOT contain the file's binary content — that lives on disk
 * at `localUri`. This is just the "pointer" plus display info.
 */
export interface SelectedFile {
  /** File name in the app's persistent document directory (e.g., "picked_1717935123456_report.pdf") */
  name: string;
  /** File size in bytes, if provided by the file picker */
  size: number | undefined;
  /** MIME type (e.g., "application/pdf"), if provided by the file picker */
  mimeType: string | undefined;
  /** URI in the app's persistent document directory — used to read the file contents */
  localUri: string;
  /** Original file name from the picker, used for display to the user */
  originalName: string;
  /** ISO 8601 timestamp of when the file was selected (e.g., "2026-06-09T14:30:00.000Z") */
  lastSelected: string;
}

/** Return type for the useFilePicker hook. */
interface UseFilePickerReturn {
  /** Pick a new file via the system document picker */
  pickFile: () => Promise<void>;
  /** Currently selected file info, or null if no file is selected */
  selectedFile: SelectedFile | null;
  /** Whether a pick operation is in progress (for showing loading spinners) */
  isLoading: boolean;
  /** Clear the current selection — deletes file from disk and metadata from storage */
  clearSelection: () => Promise<void>;
  /** Whether we're loading saved data on mount (true until restore completes) */
  isRestoring: boolean;
}

/**
 * Hook that manages file selection, persistence, and restoration.
 *
 * On mount, it attempts to restore a previously selected file by reading
 * metadata from SecureStore/localStorage and verifying the file still exists
 * on disk. If the file was deleted (e.g., user cleared app data), it cleans
 * up the stale metadata.
 *
 * The hook manages three pieces of React state:
 *   - `selectedFile` — the current file metadata (or null)
 *   - `isLoading` — true while a pick/copy operation is in flight
 *   - `isRestoring` — true during the initial mount restore
 */
export function useFilePicker(): UseFilePickerReturn {
  /** The currently selected file's metadata. Null if no file is selected. */
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);

  /** True while the user is actively picking/copying a file. Drives loading UI. */
  const [isLoading, setIsLoading] = useState(false);

  /**
   * True during the initial mount restore. Starts as `true` and flips to
   * `false` once we've attempted to read saved metadata from storage.
   * Consumers can use this to show a skeleton/spinner instead of "no file selected"
   * during the brief moment before the async storage read completes.
   */
  const [isRestoring, setIsRestoring] = useState(true);

  /**
   * Restores the previously selected file metadata on component mount.
   *
   * This effect runs exactly once (empty dependency array `[]`) when the hook
   * first initializes. It reads saved metadata from SecureStore (native) or
   * localStorage (web), parses it as JSON, then verifies the referenced file
   * still exists on disk before restoring the UI state.
   *
   * Restore flow:
   *   1. Read the JSON string from SecureStore/localStorage using STORAGE_KEY
   *   2. Parse it into a `SelectedFile` object
   *   3. Check if the file at `localUri` still exists on disk
   *      - If yes → restore state so the UI shows the previously selected file
   *      - If no → the file was deleted (user cleared app data, OS cleanup, etc.)
   *        so we delete the stale metadata to avoid showing a ghost entry
   *   4. Set `isRestoring` to false regardless of outcome
   *
   * Why verify file existence? The file on disk could have been deleted if:
   *   - The user cleared the app's data in system settings
   *   - The OS cleaned up storage (unlikely in Paths.document, but possible)
   *   - The app was uninstalled and reinstalled
   * We don't want to display metadata pointing to a nonexistent file.
   */
  useEffect(() => {
    async function restoreSelection() {
      try {
        // Read the stored JSON metadata. Platform fork is necessary because
        // SecureStore is async (returns a Promise) while localStorage is synchronous.
        let storedValue: string | null = null;
        if (Platform.OS === 'web') {
          storedValue = localStorage.getItem(STORAGE_KEY);
        } else {
          // Dynamic require to avoid importing SecureStore at the top level on web,
          // where it doesn't exist. This keeps the web bundle clean.
          const SecureStore = require('expo-secure-store');
          storedValue = await SecureStore.getItemAsync(STORAGE_KEY);
        }

        if (storedValue) {
          const metadata: SelectedFile = JSON.parse(storedValue);

          // Verify the file still exists on disk before restoring.
          // This prevents showing metadata for a file that was deleted externally.
          const file = new File(metadata.localUri);
          if (file.exists) {
            // File is still there — restore the UI state.
            setSelectedFile(metadata);
          } else {
            // File was deleted (app data cleared, etc.) — remove stale metadata
            // so we don't show a ghost entry on next mount either.
            await setStorageItemAsync(STORAGE_KEY, null);
          }
        }
      } catch (error) {
        // If JSON.parse fails or storage read errors, log and continue with no file.
        // The app is still usable — we just won't show a previously selected file.
        console.error('Error restoring file selection:', error);
      } finally {
        // Always flip isRestoring to false, even on error.
        // This ensures consumers don't show a loading spinner forever.
        setIsRestoring(false);
      }
    }
    restoreSelection();
  }, []);

  /**
   * Opens the system document picker, copies the selected file to persistent
   * storage, saves metadata, and updates UI state.
   *
   * Pick flow:
   *   1. Open the native file picker via `File.pickFileAsync()` (SDK 56 API)
   *   2. User selects a file → returns a File object with proper READ permissions
   *   3. If a previously selected file exists, delete it from disk to avoid
   *      accumulating orphaned files in the document directory
   *   4. Copy the file from the picker's temp location to Paths.document
   *      (persistent storage)
   *   5. Build a `SelectedFile` metadata object with the new file's info
   *   6. Persist the metadata as JSON in SecureStore/localStorage
   *   7. Update React state to reflect the new selection
   *
   * We use `File.pickFileAsync()` instead of `DocumentPicker` because the new
   * `File` class in SDK 56 has a sandboxed permission model. DocumentPicker's
   * cache URIs don't grant READ permission to the `File` class, so
   * `sourceFile.copy(destFile)` fails. `File.pickFileAsync()` returns a File
   * with proper permissions, avoiding this entirely.
   *
   * The file name is prefixed with `picked_{timestamp}_` to avoid collisions
   * if the user picks files with the same name at different times.
   */
  const pickFile = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use the SDK 56 File picker API which handles sandbox permissions properly.
      // DocumentPicker → File.copy() fails because DocumentPicker returns cache
      // URIs that the new File class doesn't have READ permission for.
      // File.pickFileAsync() returns a File with proper permissions.
      const result = await File.pickFileAsync({
        mimeTypes: ['*/*'],
        multipleFiles: false,
      });

      // User cancelled the picker dialog — exit early, no state changes needed.
      if (result.canceled) {
        return;
      }

      // The picked file with proper READ permissions granted by the picker.
      const pickedFile = result.result;

      // Destination in persistent document directory.
      // Paths.document survives app restarts; the picker's temp location does not.
      const destFile = new File(Paths.document, `picked_${Date.now()}_${pickedFile.name}`);

      // Clean up the previously selected file (if any) before copying the new one.
      if (selectedFile) {
        try {
          const oldFile = new File(selectedFile.localUri);
          if (oldFile.exists) {
            oldFile.delete();
          }
        } catch {
          // Ignore cleanup errors — the old file may already be gone.
        }
      }

      // Copy from the picker's temp location to our persistent document directory.
      // This works because File.pickFileAsync() grants READ permission on the source.
      await pickedFile.copy(destFile);

      // Build the metadata object for the newly copied file.
      const metadata: SelectedFile = {
        name: destFile.name,
        size: pickedFile.size || undefined,
        mimeType: pickedFile.type || undefined,
        localUri: destFile.uri,
        originalName: pickedFile.name,
        lastSelected: new Date().toISOString(),
      };

      // Persist the metadata to SecureStore (native) or localStorage (web).
      await setStorageItemAsync(STORAGE_KEY, JSON.stringify(metadata));

      // Update React state to reflect the new selection in the UI.
      setSelectedFile(metadata);
    } catch (error) {
      console.error('Error picking file:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile]);

  /**
   * Clears the current file selection by deleting the file from disk,
   * removing metadata from storage, and resetting React state.
   *
   * Clear flow:
   *   1. If a file is selected, delete it from the persistent document directory
   *   2. Delete the metadata key from SecureStore/localStorage
   *   3. Reset React state to null
   *
   * Cleanup errors are ignored because the file may already be deleted
   * (e.g., if the user manually deleted it or the OS cleaned up).
   * The important thing is that both storage locations are cleared.
   */
  const clearSelection = useCallback(async () => {
    if (selectedFile) {
      try {
        // Delete the file from the persistent document directory.
        const file = new File(selectedFile.localUri);
        if (file.exists) {
          file.delete();
        }
      } catch {
        // Ignore deletion errors — the file might already be gone.
        // We still want to clear the metadata and state regardless.
      }
    }
    // Remove the metadata from SecureStore/localStorage.
    await setStorageItemAsync(STORAGE_KEY, null);
    // Reset React state so the UI shows "no file selected".
    setSelectedFile(null);
  }, [selectedFile]); // selectedFile is needed to know which file to delete

  return { pickFile, selectedFile, isLoading, clearSelection, isRestoring };
}

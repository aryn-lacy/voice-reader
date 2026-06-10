import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFilePicker } from '@/hooks/use-file-picker';
import { useTheme } from '@/hooks/use-theme';

function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined || bytes === null) {
    return 'Unknown size';
  }
  if (bytes === 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  // Show decimals only for KB and above
  const formatted = exponent === 0 ? value.toString() : value.toFixed(1);
  return `${formatted} ${units[exponent]}`;
}

function formatRelativeTime(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();

  if (diffMs < 0) {
    return 'just now';
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'just now';
  }
  if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }
  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  if (days < 30) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }

  // Beyond 30 days, show a formatted date
  return then.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: then.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export type FilePickerCardProps = {
  style?: ViewStyle;
};

export function FilePickerCard({ style }: FilePickerCardProps) {
  const { pickFile, selectedFile, isLoading, clearSelection, isRestoring } = useFilePicker();
  const theme = useTheme();

  if (isRestoring) {
    return (
      <ThemedView type="backgroundElement" style={[styles.card, style]}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView type="backgroundElement" style={[styles.card, style]}>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.text} />
          <ThemedText style={styles.loadingText}>Selecting file...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!selectedFile) {
    return (
      <ThemedView type="backgroundElement" style={[styles.card, style]}>
        <Pressable
          onPress={pickFile}
          style={({ pressed }) => [styles.pickButton, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
          <SymbolView
            tintColor={theme.text}
            name={{ ios: 'doc.badge.plus', android: 'note_add', web: 'note_add' }}
            size={20}
          />
          <ThemedText type="link">Pick a file</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={[styles.card, style]}>
      {/* File info header */}
      <View style={styles.fileInfoRow}>
        <SymbolView
          tintColor={theme.text}
          name={{ ios: 'doc.fill', android: 'description', web: 'description' }}
          size={24}
        />
        <View style={styles.fileDetails}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {selectedFile.originalName}
          </ThemedText>
          <View style={styles.fileMetaRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {formatFileSize(selectedFile.size)}
            </ThemedText>
            {selectedFile.mimeType && (
              <ThemedText type="small" themeColor="textSecondary">
                {' \u00B7 '}
                {selectedFile.mimeType}
              </ThemedText>
            )}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Selected: {formatRelativeTime(selectedFile.lastSelected)}
          </ThemedText>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={pickFile}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            tintColor={theme.text}
            name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}
            size={14}
          />
          <ThemedText type="link">Change file</ThemedText>
        </Pressable>

        <Pressable
          onPress={clearSelection}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            tintColor={theme.text}
            name={{ ios: 'trash', android: 'delete', web: 'delete' }}
            size={14}
          />
          <ThemedText type="link">Clear</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  loadingText: {
    fontSize: 14,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  fileInfoRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  fileDetails: {
    flex: 1,
    gap: Spacing.half,
  },
  fileMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
});

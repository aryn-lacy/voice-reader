import { Platform, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Dropdown } from "@/components/ui/dropdown";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useColorSchemePreference } from "@/hooks/use-color-scheme-preference";
import { useTheme } from "@/hooks/use-theme";

export default function SettingsScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();
  const [preference, setPreference] = useColorSchemePreference();

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
    >
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Settings</ThemedText>
        </ThemedView>

        <ThemedView style={styles.sectionsWrapper}>
          <ThemedView style={styles.settingRow}>
            <ThemedText type="default">Theme</ThemedText>
            <Dropdown
              options={[
                { value: "light", label: "☀️ Light" },
                { value: "dark", label: "🌙 Dark" },
                { value: "system", label: "🖥️ System" },
              ]}
              value={preference}
              onChange={setPreference}
            />
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
  },
  titleContainer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  sectionsWrapper: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

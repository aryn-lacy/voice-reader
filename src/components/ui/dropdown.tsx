import { useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type DropdownOption<T extends string> = { value: T; label: string };
export type DropdownProps<T extends string> = {
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function Dropdown<T extends string>({ options, value, onChange }: DropdownProps<T>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find((opt) => opt.value === value)?.label ?? '';

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [pressed && styles.pressed]}>
        <ThemedView type="backgroundElement" style={styles.trigger}>
          <ThemedText type="smallBold">{selectedLabel}</ThemedText>
          <SymbolView
            name={{ ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }}
            size={14}
            weight="bold"
            tintColor={theme.text}
            style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
          />
        </ThemedView>
      </Pressable>

      <Modal transparent={true} visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <ThemedView type="backgroundElement" style={styles.card}>
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    selected && { backgroundColor: theme.backgroundSelected },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="default" themeColor={selected ? 'text' : 'textSecondary'}>
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.half,
    marginHorizontal: Spacing.four,
    marginTop: Spacing.six,
    maxWidth: 320,
    alignSelf: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});

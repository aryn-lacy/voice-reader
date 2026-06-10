import { render, screen } from '@testing-library/react-native';
import { HintRow } from '@/components/hint-row';

// Mock useColorScheme since components depend on theme
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

describe('HintRow', () => {
  it('renders with default props', async () => {
    await render(<HintRow />);
    expect(screen.getByText('Try editing')).toBeTruthy();
    expect(screen.getByText('app/index.tsx')).toBeTruthy();
  });

  it('renders with custom props', async () => {
    await render(<HintRow title="Hello" hint="world.tsx" />);
    expect(screen.getByText('Hello')).toBeTruthy();
    expect(screen.getByText('world.tsx')).toBeTruthy();
  });
});

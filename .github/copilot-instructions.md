# Voice Reader - Copilot Instructions

## Project Overview
Voice Reader is a React Native app built with Expo SDK 56, React 19, and TypeScript 6. It uses expo-router for navigation with typed routes and the React Compiler enabled.

## Before Writing Code
**Always read the Expo SDK 56 documentation at https://docs.expo.dev/versions/v56.0.0/** before writing any Expo-related code. The API changes between versions.

## Tech Stack
- **Framework**: Expo SDK 56 (managed workflow — no native ios/ or android/ directories)
- **React**: 19.2.3
- **React Native**: 0.85.3
- **TypeScript**: 6.x
- **Routing**: expo-router with typed routes (`experiments.typedRoutes: true`)
- **React Compiler**: Enabled via `experiments.reactCompiler: true` in app.json

## Project Structure
```
src/
  app/          # Route screens (expo-router file-based routing)
  components/   # Reusable UI components
  hooks/        # Custom React hooks
  constants/    # Theme, colors, spacing
  global.css    # CSS custom properties for web fonts
assets/         # Static assets (images, etc.)
```

## Path Aliases
- `@/*` → `./src/*` (components, hooks, constants)
- `@/assets/*` → `./assets/*` (images, static files)

## Commands
- `npm start` — Start Expo dev server
- `npm test` — Run Jest tests
- `npm run lint` — Run ESLint
- `npm run ios` / `npm run android` / `npm run web` — Platform-specific

## Testing
- **Framework**: Jest with jest-expo preset
- **Component testing**: @testing-library/react-native
- **Test location**: `__tests__/` directories
- **Mocking**: Mock `@/hooks/use-color-scheme` for theme-dependent components
- **Pattern**: Use `render()` from RNTL, `screen.getByText()`, jest matchers

## Key Patterns
- **Theming**: Components use `useTheme()` hook which returns light/dark color objects from `@/constants/theme`. It wraps `useColorScheme()` — always mock `useColorScheme` in tests.
- **Components**: `ThemedText`, `ThemedView` are base components. Use them instead of raw `Text`/`View`.
- **Platform-specific**: Some files have `.web.tsx` variants (e.g., `animated-icon.web.tsx`, `app-tabs.web.tsx`, `use-color-scheme.web.ts`). These provide web-specific implementations.
- **CSS**: `global.css` defines font variables for web. Imported in `constants/theme.ts`.

## Code Style
- TypeScript strict mode enabled
- Functional components with named exports (not default)
- Path aliases for imports (use `@/` not relative paths)

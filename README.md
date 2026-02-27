# Mini Vidi

web-based video compression tool


## Stack

- Vite + React + TypeScript
- React Router for navigation
- ffmpeg.wasm (`@ffmpeg/ffmpeg` + `@ffmpeg/util`)
- lil-gui for interactive controls

## Pages

- `src/Pages/Home.tsx`: landing page.
- `src/Pages/Browse.tsx`: drag-and-drop folder browser with a collapsible table,
  sorting, and live hover effects. Includes subfolder root navigation (font-weight corresponds to file size)
- `src/Pages/Compress.tsx`: ffmpeg.wasm compressor with presets, custom settings,
  status console, and file drop input.

Routes are defined in `src/App.tsx`:

- `/` → `Home`
- `/browse` → `Browse`
- `/convert` → `Compress`

## Modules

- `src/modules/browse/useBrowseGui.ts`: lil-gui controls for hover/trail tuning.
- `src/modules/dropzone/TrailDropZone.tsx`: reusable drop zone with hover trail
  effect.
- `src/modules/ffmpeg/ffmpegClient.ts`: ffmpeg loader and transcode helpers.
- `src/modules/compress/presetStorage.ts`: custom preset persistence via
  `localStorage`.

## Key Functions

- `transcodeFileToMp4(...)` in `src/modules/ffmpeg/ffmpegClient.ts`:
  ffmpeg execution with scaling, fps, bitrate caps, and audio options.
- `useBrowseGui(...)` in `src/modules/browse/useBrowseGui.ts`:
  lil-gui setup for trail spread and font selection.
- `TrailDropZone` in `src/modules/dropzone/TrailDropZone.tsx`:
  drop handling + animated hover trail.

## Dev

```sh
pnpm dev
```
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

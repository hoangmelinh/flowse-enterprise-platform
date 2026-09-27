import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Setting state inside useEffect (e.g. resetting a form when isOpen changes)
      // is an intentional pattern throughout this codebase. Disabling to reduce noise.
      'react-hooks/set-state-in-effect': 'off',
      // Allow context files and utility files to export both components and non-components.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
])

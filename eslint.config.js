import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'docs/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      // This project documents its component contracts in AGENTS.md, not prop-types.
      'react/prop-types': 'off',
      // `const { backgroundImageData, ...rest } = state` is the intentional pattern
      // for omitting the image data from share/storage/export payloads.
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
      // Help/tip copy contains straight quotes by design (see the markdown rules).
      'react/no-unescaped-entities': 'off',
      // The following are deliberate, documented design decisions (AGENTS.md):
      // inline sliders/selects/pickers carry their own aria-label rather than a
      // wired <label>, and each layer row is a non-interactive wrapper around a
      // real <button aria-pressed>. Kept as warnings so genuinely new gaps surface.
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
    },
  },
  {
    files: ['tests/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
    },
  },
  prettier,
]

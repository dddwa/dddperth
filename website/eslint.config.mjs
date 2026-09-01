import { configs } from '@nx/eslint-plugin'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import jsonParser from 'jsonc-eslint-parser'
import ts from 'typescript-eslint'
import baseConfig from '../eslint.config.mjs'

const __dirname = import.meta.dirname

export default [
    {
        // Plain node script that boots the e2e dev server; not part of the
        // TypeScript project, so the type-aware rules can't parse it.
        ignores: ['e2e/start-dev-server.mjs'],
    },
    ...baseConfig,
    {
        ignores: [
            'build',
            'out-tsc',
            'test-results',
            'node_modules',
            'eslint.config.js',
            'eslint.config.cjs',
            'vite.config.js',
            'mocks/index.js',
            'safe-routes.d.ts',
            'postcss.config.cjs',
            'app/styled-system',
            'scripts/**',
        ],
    },
    ...configs['flat/base'],
    ...configs['flat/javascript'],
    ...configs['flat/typescript'],
    ...ts.configs.recommendedTypeChecked,
    react.configs.flat.recommended, // This is not a plugin object, but a shareable config object
    react.configs.flat['jsx-runtime'], // Add this if you are using React 17+
    jsxA11y.flatConfigs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
        rules: {
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    enforceBuildableLibDependency: true,
                    allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
                    depConstraints: [
                        {
                            sourceTag: '*',
                            onlyDependOnLibsWithTags: ['*'],
                        },
                    ],
                },
            ],
            // Override or add rules here
            '@typescript-eslint/consistent-type-exports': 'error',
            '@typescript-eslint/consistent-type-imports': 'error',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/only-throw-error': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/no-empty-interface': 'off',
            '@typescript-eslint/require-await': 'off',
            'react/no-unescaped-entities': 'off',
            'react/prop-types': 'off',
            'prefer-const': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/unbound-method': 'off',
            // These rules are expensive to run..
            '@typescript-eslint/restrict-template-expressions': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
        },
    },
    {
        files: ['**/*.json'],
        rules: {
            '@nx/dependency-checks': [
                'error',
                {
                    ignoredFiles: [
                        '{projectRoot}/eslint.config.{js,cjs,mjs}',
                        '{projectRoot}/vite.config.{js,ts,mjs,mts}',
                    ],
                    ignoredDependencies: [
                        'vite',
                        '@react-router/dev',
                        '@pandacss/dev',
                        '@park-ui/panda-preset',
                        'pandacss-preset-typography',
                        'lru-cache',
                        'msw',
                        'vitest',
                        '@testing-library/react',
                        // Workspace libraries — Vite consumes source directly via pnpm symlinks,
                        // so they don't need an Nx build target. The rule otherwise flags them as obsolete.
                        '@ddd/conference-config',
                    ],
                },
            ],
        },
        languageOptions: {
            parser: jsonParser,
        },
    },
    {
        files: ['**/package.json'],
        rules: {
            '@nx/nx-plugin-checks': 'error',
        },
        languageOptions: {
            parser: jsonParser,
        },
    },
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
            },
        },
    },
    {
        settings: {
            react: { version: 'detect' },
            // eslint-plugin-jsx-a11y only recognises lowercase JSX tags
            // (`<div>`, `<button>`, ...) out of the box. This codebase renders
            // almost everything through PandaCSS's styled-system (`<Box>`,
            // `<Flex>`, `<Grid>`, `<Container>`, ...), which are just `<div>`s
            // under the hood — without this mapping, jsx-a11y silently skips
            // every element written that way, including real bugs like an
            // onClick handler on a `<Box>` with no keyboard equivalent.
            'jsx-a11y': {
                components: {
                    Box: 'div',
                    Flex: 'div',
                    Grid: 'div',
                    Container: 'div',
                    VStack: 'div',
                    HStack: 'div',
                    Divider: 'hr',
                },
            },
        },
    },
    {
        files: ['**/*.tsx', '**/*.jsx'],
        rules: {
            // Not part of jsx-a11y's `recommended` config, but a live,
            // non-deprecated rule worth enforcing here: catches an
            // aria-hidden element that's still keyboard-focusable (a real
            // keyboard trap for screen reader + keyboard users).
            //
            // `prefer-tag-over-role` was also tried here but produced only
            // false positives against deliberate patterns already in this
            // codebase — role="rowheader"/"columnheader" on a CSS-grid-based
            // schedule (not a real <table>, so <th> isn't available),
            // role="img" on labelled inline <svg> icons, and role="status"
            // on a live region (a standard, well-supported pattern; the
            // suggested <output> alternative has different, form-associated
            // semantics). Left out rather than forcing those into worse
            // markup just to satisfy the rule.
            'jsx-a11y/no-aria-hidden-on-focusable': 'error',
        },
    },
    {
        files: ['*.json', '**/*.js', '**/*.jsx', '**/*.json', 'eslint.config.js'],
        ...ts.configs.disableTypeChecked,
    },
]

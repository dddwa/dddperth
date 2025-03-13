import { configs } from '@nx/eslint-plugin'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import jsonParser from 'jsonc-eslint-parser'
import ts from 'typescript-eslint'
import baseConfig from '../eslint.config.mjs'

const __dirname = import.meta.dirname

export default [
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
            'remix-routes.d.ts',
            'postcss.config.cjs',
            'app/styled-system',
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
                    ignoredDependencies: ['tslib'],
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
        },
    },
    {
        files: ['*.json', '**/*.js', '**/*.jsx', '**/*.json', 'eslint.config.js'],
        ...ts.configs.disableTypeChecked,
    },
]

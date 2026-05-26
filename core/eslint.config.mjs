import nxEslintPlugin from '@nx/eslint-plugin'
import ts from 'typescript-eslint'

export default [
    {
        ignores: [
            '**/dist',
            '**/out-tsc',
            '**/build',
            '**/.react-router',
            '**/node_modules',
            'eslint.config.js',
            'eslint.config.cjs',
            'eslint.config.mjs',
            'infra/main.parameters.json',
            'infra/project.json',
            'infra/**/*.json',
            'nx.json',
            '**/vite.config.*.timestamp*',
            '**/vitest.config.*.timestamp*',
        ],
    },
    { plugins: { '@nx': nxEslintPlugin } },
    // Register @typescript-eslint/parser for .ts/.tsx files. Without this,
    // projects with no local eslint config (e.g. @ddd/conference-config) fall
    // back to espree and fail to parse type-only syntax. Website's config layers
    // its own typed-rule setup on top of this.
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: ts.parser,
        },
    },
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
        rules: {
            'prefer-const': 'off',
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    enforceBuildableLibDependency: true,
                    allow: [],
                    depConstraints: [
                        {
                            sourceTag: '*',
                            onlyDependOnLibsWithTags: ['*'],
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['**/*.js', '**/*.jsx', 'eslint.config.js'],
        ...ts.configs.disableTypeChecked,
    },
]

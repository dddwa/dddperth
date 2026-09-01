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
                    // conference-stub's themes legitimately import the
                    // defineTheme helper from website/themes/. It's a typed
                    // identity function for theme config, not website runtime
                    // code, but it lives there so the token contract and its
                    // helper stay together. A fork needs the same exemption
                    // one level deeper (core/website/...), so match both.
                    // Remove once defineTheme moves to @ddd/conference-config.
                    allow: ['^.*/website/themes/theme-builder$'],
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

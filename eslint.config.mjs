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
        ],
    },
    { plugins: { '@nx': nxEslintPlugin } },
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
        files: ['*.json', '**/*.js', '**/*.jsx', '**/*.json', 'eslint.config.js'],
        ...ts.configs.disableTypeChecked,
    },
]

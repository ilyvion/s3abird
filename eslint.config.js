import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

import vue from 'eslint-plugin-vue'

import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

export default [
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
    },
    withOverrides(vue.configs['flat/recommended'][0], {
        languageOptions: {
            parserOptions: {
                parser: tsParser,
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
    }),
    withOverrides(vue.configs['flat/recommended'][1], {
        languageOptions: {
            parserOptions: {
                parser: tsParser,
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
    }),
    withOverrides(vue.configs['flat/recommended'][2], {}),
    withOverrides(vue.configs['flat/recommended'][3], {}),
    withOverrides(vue.configs['flat/recommended'][4], {}),
    withOverrides(eslintPluginPrettierRecommended, {
        rules: {
            'prettier/prettier': [
                'error',
                {
                    endOfLine: 'auto',
                },
                {
                    usePrettierrc: true,
                },
            ],
        },
    }),
    {
        ignores: ['node_modules/*', 'dist/*', '*.config.*'],
    },
]

function withOverrides(baseConfig, overrides = {}) {
    return {
        ...baseConfig,
        ...overrides,
        rules: {
            ...baseConfig.rules,
            ...(overrides.rules || {}),
        },
        languageOptions: {
            ...baseConfig.languageOptions,
            ...(overrides.languageOptions || {}),
            parserOptions: {
                ...(baseConfig.languageOptions?.parserOptions || {}),
                ...(overrides.languageOptions?.parserOptions || {}),
            },
        },
        plugins: {
            ...baseConfig.plugins,
            ...(overrides.plugins || {}),
        },
    }
}

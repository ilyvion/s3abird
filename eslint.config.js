import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

import vue from 'eslint-plugin-vue'

import pluginPrettier from 'eslint-plugin-prettier'
import prettier from 'eslint-config-prettier'

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
    {
        ignores: ['node_modules/*', 'dist/*', '*.config.*'],
    },
    {
        plugins: {
            prettier: pluginPrettier,
        },
        rules: {
            'prettier/prettier': 'warn',
            'vue/html-indent': 'off',
            'vue/html-closing-bracket-newline': 'off',
            'vue/max-attributes-per-line': 'off',
            'vue/singleline-html-element-content-newline': 'off',
            'vue/multiline-html-element-content-newline': 'off',
            'vue/html-self-closing': 'off',
            'vue/first-attribute-linebreak': 'off',
        },
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

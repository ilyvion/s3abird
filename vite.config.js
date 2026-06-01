import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createHtmlPlugin } from 'vite-plugin-html'
import tailwindcss from '@tailwindcss/vite'
import { analyzer } from 'vite-bundle-analyzer'

export default defineConfig({
    plugins: [
        vue(),
        createHtmlPlugin({
            inject: {
                data: {
                    ga: process.env.VITE_GA_TRACKING_ID || null,
                },
            },
        }),
        tailwindcss(),
        analyzer({ analyzerMode: 'static' }),
    ],
    server: {
        port: 3000,
    },
    build: {
        outDir: 'dist',
    },
})

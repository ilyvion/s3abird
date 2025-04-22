import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createHtmlPlugin } from 'vite-plugin-html'
import tailwindcss from '@tailwindcss/vite'

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
    ],
    server: {
        port: 3000,
    },
    build: {
        outDir: 'dist',
    },
})

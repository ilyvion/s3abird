import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
    test: {
        environment: 'node',
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,vue}'],
            exclude: ['src/main-vite.ts', 'src/**/*.d.ts', 'src/catppuccin*.ts'],
            reporter: ['text', 'html'],
        },
    },
})

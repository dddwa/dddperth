import type { Config } from '@react-router/dev/config'

export default {
    buildDirectory: 'build/remix',
    ssr: true,
    future: {
        v8_viteEnvironmentApi: true,
    },
} satisfies Config

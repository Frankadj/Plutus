import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget =
    env.VITE_PROXY_TARGET?.trim() ||
    env.VITE_API_BASE_URL?.trim() ||
    env.VITE_API_BASE?.trim() ||
    'http://127.0.0.1:3001'
  const extraAllowedHosts = (env.VITE_ALLOWED_HOSTS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  const hmrHost = env.VITE_HMR_HOST?.trim()
  const hmrClientPort = Number(env.VITE_HMR_CLIENT_PORT || 0)
  const hmrPort = Number(env.VITE_HMR_PORT || 0)

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: [
        '.loca.lt',
        '.lhr.life',
        '.localhost.run',
        '.ngrok-free.app',
        '.ngrok.app',
        ...extraAllowedHosts,
      ],
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
      hmr: hmrHost
        ? {
            host: hmrHost,
            protocol: env.VITE_HMR_PROTOCOL?.trim() || 'ws',
            clientPort:
              Number.isFinite(hmrClientPort) && hmrClientPort > 0
                ? hmrClientPort
                : undefined,
            port:
              Number.isFinite(hmrPort) && hmrPort > 0 ? hmrPort : undefined,
          }
        : undefined,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true,
    },
  }
})

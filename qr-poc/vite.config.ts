import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      "process.env.VITE_PRIVATE_KEY": JSON.stringify(env.VITE_PRIVATE_KEY),
      "process.env.VITE_INFURA_API_KEY": JSON.stringify(env.VITE_INFURA_API_KEY),
    },
  }
})
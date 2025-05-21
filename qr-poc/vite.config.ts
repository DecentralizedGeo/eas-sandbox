import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, `${process.cwd()}/..`, '')
  console.log(`env: ${JSON.stringify(env)}`)
  // Check for privateKey inside the function scope
  if (!env.VITE_PRIVATE_KEY && !env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not found in .env file. Please add your wallet's private key.");
  }

  return {
    plugins: [react()],
    define: {
      "process.env.PRIVATE_KEY": JSON.stringify(env.PRIVATE_KEY),
      "process.env.INFURA_API_KEY": JSON.stringify(env.INFURA_API_KEY),
    },
  }
})
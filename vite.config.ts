import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Serves server/check.ts during `npm run dev`, the way Vercel serves it in
 * production. Put ANTHROPIC_API_KEY in .env.local to try the AI check locally.
 */
function devApi(): Plugin {
  return {
    name: 'lemonade-dev-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY
      server.middlewares.use('/api/check', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const mod = await server.ssrLoadModule('/server/check.ts')
        const response: Response = await mod.POST(
          new Request('http://localhost/api/check', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        )
        res.statusCode = response.status
        res.setHeader('content-type', 'application/json')
        res.end(await response.text())
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devApi()],
})

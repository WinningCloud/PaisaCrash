import { Router } from 'express'

const router = Router()

const SIGNED_URL_API = 'https://api.elevenlabs.io/v1/convai/conversation/get-signed-url'

export const voiceConfigured = () => Boolean(process.env.ELEVENLABS_AGENT_ID?.trim())

// GET /api/elevenlabs/signed-url
// Private agent (API key set): returns { signedUrl }, valid for ~15 minutes.
// Public agent (agent id only): returns { agentId }; the id is not a secret.
router.get('/signed-url', async (_req, res) => {
  const agentId = process.env.ELEVENLABS_AGENT_ID?.trim()
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim()

  if (!agentId) {
    return res.status(503).json({ error: 'Voice agent is not configured (ELEVENLABS_AGENT_ID missing).' })
  }
  if (!apiKey) return res.json({ agentId })

  try {
    const r = await fetch(`${SIGNED_URL_API}?agent_id=${encodeURIComponent(agentId)}`, {
      headers: { 'xi-api-key': apiKey },
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) {
      console.error(`[elevenlabs] get-signed-url failed: ${r.status}`)
      return res.status(502).json({ error: 'ElevenLabs refused the request. Check your API key and agent id.' })
    }
    const { signed_url: signedUrl } = await r.json()
    if (!signedUrl) throw new Error('no signed_url in response')
    res.json({ signedUrl })
  } catch (err) {
    console.error('[elevenlabs]', err.message)
    res.status(502).json({ error: 'Could not reach ElevenLabs.' })
  }
})

export default router

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import elevenlabs, { voiceConfigured } from './routes/elevenlabs.js'

const app = express()
const PORT = process.env.PORT || 5000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.use(cors({ origin: CLIENT_ORIGIN.split(',').map((o) => o.trim()) }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, voice: voiceConfigured() })
})

app.use('/api/elevenlabs', elevenlabs)

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(voiceConfigured() ? 'Voice agent: configured' : 'Voice agent: NOT configured (game runs in text mode)')
})

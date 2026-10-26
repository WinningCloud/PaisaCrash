# Paisa Crash Test

A retro pixel-art game where you live ten years of an Indian adult's financial life, from age 22 to 32. Every year random events hit (layoffs, hospital bills, UPI scams, weddings, bonuses), your choices cause later events, and a voice mascot called Paisa Pal talks you through it, praising or roasting each decision.

Built for the theme "MoneyMatters: make money make sense".

## How it plays

Each year has three steps:

1. **Budget.** Split your monthly surplus between fun, emergency fund, SIP investing and loan prepayment. The sliders always add up to 100%.
2. **Events.** You get two to three cards a year, each with two to four choices. Many choices schedule a consequence for later. Skip health insurance and a medical emergency costs far more a few years on. Take a loan for a wedding and the EMI follows you for years.
3. **Year end.** Salary, 6% inflation, an 8% raise (unless you lost your job), debt interest, EMIs and market returns are applied. Returns run between 4% and 14%, with an occasional crash year.

Pick a starting life: a Fresher (₹30k a month), a Student on stipend (₹12k) or a Family earner (₹60k, one dependent, a car loan). The game ends after ten years, or early in a Debt Spiral if your loans outgrow your income.

## Features

- 47 event cards: 27 drawn at random, 20 that only appear as consequences of earlier choices.
- Seeded random numbers (mulberry32), so a run can be reproduced from its seed.
- Game engine in plain JavaScript with no UI code, in `client/src/game`.
- Paisa Pal, an ElevenLabs voice agent. It reacts to every card, decision and year, can pick an option when you say it, explain money terms and read out your game state. If voice is unavailable the game runs in text mode.
- Plain-language tooltips for jargon such as SIP, EMI, CIBIL and emergency fund.
- Amounts in INR with Indian digit grouping.
- Auto-save to the browser. Continue from the title screen.

## Tech

- Client: React 19, Vite 6, Framer Motion, `@elevenlabs/react`
- Server: Express 5, cors, dotenv
- No database. Saves live in `localStorage`.

## Setup

Needs Node 20 or newer.

```bash
# terminal 1: server
cd server
npm install
cp .env.example .env
npm run dev

# terminal 2: client
cd client
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the server on port 5000. The game is fully playable without any voice setup.

Other client scripts: `npm run build` and `npm run preview`.

## Voice agent

Create the agent in the ElevenLabs dashboard using `server/agent/paisa-pal-agent.md`. It has the system prompt, first message, voice settings, dynamic variables and the three client tools the game provides: `make_choice`, `get_game_state` and `explain_term`.

Then fill in `server/.env`:

| Variable | Purpose |
| --- | --- |
| `PORT` | Server port. Default 5000. |
| `CLIENT_ORIGIN` | Allowed browser origin(s), comma separated. Default `http://localhost:5173`. |
| `ELEVENLABS_AGENT_ID` | Your agent's id. |
| `ELEVENLABS_API_KEY` | Optional. Leave empty for a public agent. |

With a public agent the browser connects using the agent id alone. With a private agent (authentication on) the server uses the API key to request a short-lived signed URL, so the key never reaches the browser. The browser needs microphone permission, which works on `localhost` and HTTPS.

If the button shows "Voice offline", check that the server is running and the agent id is set.

## API

| Route | Description |
| --- | --- |
| `GET /api/health` | `{ ok, voice }`, where `voice` says whether an agent is configured. |
| `GET /api/elevenlabs/signed-url` | `{ signedUrl }` for a private agent, or `{ agentId }` for a public one. |

## Project layout

```
client/src/
  game/         engine, events, RNG, formatting, glossary
    deck/       event cards grouped by theme
  screens/      title, character select, budget, event, game over
  components/   HUD, pixel UI kit, mascot, dialog box, voice button
  store/        game state reducer and localStorage save
  voice/        ElevenLabs hook and the text the agent receives
  styles/       pixel.css (tokens and components), screens.css
server/
  src/          Express app and routes
  agent/        Paisa Pal prompt and dashboard settings
```

## Status

Working: character setup, budget, the event deck with delayed consequences, yearly simulation, HUD, save and continue, voice agent.

Not built yet: the year summary screen (year results currently appear as notifications), scoring and rank titles, the Crash Test Report with the Monte Carlo and airbag toggles, the leaderboard, and sound effects.

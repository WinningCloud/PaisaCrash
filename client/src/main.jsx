import { StrictMode } from 'react'
import { ConversationProvider } from '@elevenlabs/react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { GameProvider } from './store/useGameStore.jsx'
import './index.css'
import './styles/pixel.css'
import './styles/screens.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <ConversationProvider>
        <GameProvider>
          <App />
        </GameProvider>
      </ConversationProvider>
    </ToastProvider>
  </StrictMode>,
)

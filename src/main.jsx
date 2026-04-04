import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MDAQuizApp from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MDAQuizApp />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// The 3D electric drill demo lives entirely under its own hash route and is
// loaded on demand, so visitors of the main Corrige.moi app never pay for
// three.js in their bundle.
const root = createRoot(document.getElementById('root')!)
const isDrillDemo = window.location.hash.startsWith('#/drill3d')

const load = isDrillDemo ? import('./drill3d/DrillApp.tsx') : import('./App.tsx')

load.then(({ default: RootComponent }) => {
  root.render(
    <StrictMode>
      <RootComponent />
    </StrictMode>,
  )
})

// A hash-only change (e.g. pasting a different #/... URL in the same tab)
// does not reload the page, but which app to mount is only decided once,
// above. Force a real reload so the route switch is picked up.
window.addEventListener('hashchange', () => window.location.reload())

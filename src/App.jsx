import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './lib/store.jsx'
import VisionBoard from './VisionBoard.jsx'
import Pool from './pages/Pool.jsx'

function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<VisionBoard />} />
          <Route path="/pool" element={<Pool />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}

export default App

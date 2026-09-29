import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './lib/store.jsx'
import LoginSheet from './components/LoginSheet.jsx'
import VisionBoard from './VisionBoard.jsx'
import Pool from './pages/Pool.jsx'
import Cumplidos from './pages/Cumplidos.jsx'

function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<VisionBoard />} />
          <Route path="/pool" element={<Pool />} />
          <Route path="/cumplidos" element={<Cumplidos />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <LoginSheet />
    </StoreProvider>
  )
}

export default App

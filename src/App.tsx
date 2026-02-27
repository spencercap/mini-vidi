import { Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Browse from './Pages/Browse'
import Compress from './Pages/Compress'
import Home from './Pages/Home'
import './App.css'

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/convert" element={<Compress />} />
        <Route path="/browse" element={<Browse />} />
      </Routes>
    </>
  )
}

export default App

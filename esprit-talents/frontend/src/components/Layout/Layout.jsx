import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: '#F4F4F4' }}>
      {/* Barre de navigation horizontale en haut */}
      <Navbar />

      {/* Corps : sidebar + contenu */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

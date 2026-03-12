import { Link, useLocation } from 'react-router-dom'

export default function Layout({ children }) {
  const location = useLocation()
  const isGame = location.pathname.startsWith('/solo') || location.pathname.startsWith('/room')

  return (
    <div className="min-h-screen flex flex-col">
      {!isGame && (
        <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="text-xl font-bold text-purple-400 hover:text-purple-300 transition-colors">
              ⚔️ WordBattle
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link
                to="/"
                className={`px-3 py-1 rounded-full transition-colors ${location.pathname === '/' ? 'bg-purple-600 text-white' : 'text-white/60 hover:text-white'}`}
              >
                בית
              </Link>
              <Link
                to="/settings"
                className={`px-3 py-1 rounded-full transition-colors ${location.pathname === '/settings' ? 'bg-purple-600 text-white' : 'text-white/60 hover:text-white'}`}
              >
                מילים
              </Link>
            </nav>
          </div>
        </header>
      )}
      <main className="flex-1">{children}</main>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import EspritLogo from '../UI/EspritLogo'
import { getNotifications, getUnreadCount, markRead, markAllRead } from '../../api/notifications'

const TYPE_COLOR = {
  success: '#22c55e',
  info:    '#3b82f6',
  warning: '#f59e0b',
  error:   '#ef4444',
}
const TYPE_ICON = { success: '✓', info: 'i', warning: '!', error: '✕' }

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [notifs, setNotifs]   = useState([])
  const [unread, setUnread]   = useState(0)
  const [openNotif, setOpenNotif] = useState(false)
  const [openUser,  setOpenUser]  = useState(false)
  const notifRef = useRef(null)
  const userRef  = useRef(null)

  const loadNotifs = async () => {
    try {
      const [n, c] = await Promise.all([getNotifications(), getUnreadCount()])
      setNotifs(n.data)
      setUnread(c.data.count)
    } catch {}
  }

  useEffect(() => {
    loadNotifs()
    const t = setInterval(loadNotifs, 15000)
    return () => clearInterval(t)
  }, [])

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setOpenNotif(false)
      if (userRef.current  && !userRef.current.contains(e.target))  setOpenUser(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNotifClick = async (n) => {
    if (!n.is_read) {
      await markRead(n.id)
      loadNotifs()
    }
    if (n.link) navigate(n.link)
    setOpenNotif(false)
  }

  const handleMarkAll = async () => {
    await markAllRead()
    loadNotifs()
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase()
  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso)
    const m = Math.floor(diff / 60000)
    if (m < 1)  return 'A l\'instant'
    if (m < 60) return `Il y a ${m}min`
    const h = Math.floor(m / 60)
    if (h < 24) return `Il y a ${h}h`
    return `Il y a ${Math.floor(h / 24)}j`
  }

  return (
    <header
      className="h-16 flex items-center justify-between px-6 border-b shrink-0 z-40"
      style={{ backgroundColor: '#ffffff', borderColor: '#E8E8E8' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <EspritLogo size="sm" />
        <div className="w-px h-6 bg-gray-200" />
        <span className="text-sm font-semibold" style={{ color: '#4A4A4A' }}>
          Gestion des Talents
        </span>
      </div>

      {/* Actions droite */}
      <div className="flex items-center gap-2">

        {/* Help */}
        <button
          onClick={() => navigate('/help')}
          title="Aide"
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors text-gray-400 hover:text-gray-700 hover:bg-gray-100"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setOpenNotif(p => !p); setOpenUser(false) }}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100 relative"
            style={{ color: '#4A4A4A' }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unread > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold"
                style={{ backgroundColor: '#E30613', fontSize: '10px' }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {openNotif && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-xl shadow-xl border overflow-hidden"
              style={{ backgroundColor: '#fff', borderColor: '#E8E8E8', top: '100%' }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: '#F0F0F0' }}
              >
                <span className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>
                  Notifications {unread > 0 && <span className="text-xs text-gray-400">({unread} non lues)</span>}
                </span>
                {unread > 0 && (
                  <button
                    onClick={handleMarkAll}
                    className="text-xs font-medium"
                    style={{ color: '#E30613' }}
                  >
                    Tout marquer lu
                  </button>
                )}
              </div>

              {/* Liste */}
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">Aucune notification</p>
                ) : notifs.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b"
                    style={{
                      borderColor: '#F5F5F5',
                      backgroundColor: n.is_read ? '#fff' : '#FFF9F9',
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                      style={{ backgroundColor: TYPE_COLOR[n.type] || '#3b82f6' }}
                    >
                      {TYPE_ICON[n.type] || 'i'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-medium leading-tight truncate"
                        style={{ color: '#1A1A1A' }}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#8C8C8C' }}>
                          {n.body}
                        </p>
                      )}
                      <p className="text-xs mt-1" style={{ color: '#B0B0B0' }}>
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ backgroundColor: '#E30613' }} />
                    )}
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t text-center" style={{ borderColor: '#F0F0F0' }}>
                <button
                  onClick={() => { navigate('/notifications'); setOpenNotif(false) }}
                  className="text-xs font-medium"
                  style={{ color: '#E30613' }}
                >
                  Voir tout l'historique
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profil utilisateur */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => { setOpenUser(p => !p); setOpenNotif(false) }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: '#E30613' }}
            >
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold leading-tight" style={{ color: '#1A1A1A' }}>
                {user?.prenom} {user?.nom}
              </p>
              <p className="text-xs leading-tight" style={{ color: '#8C8C8C' }}>
                {user?.departement}
              </p>
            </div>
            <svg width="14" height="14" fill="none" stroke="#8C8C8C" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {openUser && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-xl shadow-xl border overflow-hidden"
              style={{ backgroundColor: '#fff', borderColor: '#E8E8E8', top: '100%' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: '#F0F0F0' }}>
                <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{user?.prenom} {user?.nom}</p>
                <p className="text-xs mt-0.5" style={{ color: '#8C8C8C' }}>{user?.email}</p>
              </div>
              {[
                { label: 'Mon profil', icon: '👤', to: '/profil' },
                { label: 'Aide',       icon: '❓', to: '/help'   },
              ].map(item => (
                <button
                  key={item.to}
                  onClick={() => { navigate(item.to); setOpenUser(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors text-sm"
                  style={{ color: '#4A4A4A' }}
                >
                  <span>{item.icon}</span>{item.label}
                </button>
              ))}
              <div className="border-t" style={{ borderColor: '#F0F0F0' }}>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-left transition-colors text-sm"
                  style={{ color: '#E30613' }}
                >
                  <span>→</span> Se deconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

import { useEffect, useState } from 'react'
import { getNotifications, markRead, markAllRead } from '../../api/notifications'
import toast from 'react-hot-toast'

const TYPE_COLOR = { success: '#22c55e', info: '#3b82f6', warning: '#f59e0b', error: '#ef4444' }
const TYPE_LABEL = { success: 'Succes', info: 'Information', warning: 'Avertissement', error: 'Erreur' }

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState([])
  const [filter, setFilter] = useState('all')

  const load = () => getNotifications().then(r => setNotifs(r.data)).catch(() => {})
  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  const handleMarkAll = async () => {
    await markAllRead()
    toast.success('Toutes les notifications marquees comme lues')
    load()
  }

  const handleRead = async (id) => {
    await markRead(id)
    load()
  }

  const filtered = filter === 'all'
    ? notifs
    : filter === 'unread'
      ? notifs.filter(n => !n.is_read)
      : notifs.filter(n => n.type === filter)

  const unreadCount = notifs.filter(n => !n.is_read).length

  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso)
    const m = Math.floor(diff / 60000)
    if (m < 1) return "A l'instant"
    if (m < 60) return `Il y a ${m} min`
    const h = Math.floor(m / 60)
    if (h < 24) return `Il y a ${h}h`
    return new Date(iso).toLocaleDateString('fr-FR')
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Notifications</h2>
          <p className="text-sm mt-1" style={{ color: '#8C8C8C' }}>
            {unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Tout est lu'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="text-sm font-medium px-4 py-2 rounded-lg border transition-colors"
            style={{ borderColor: '#E30613', color: '#E30613' }}
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[['all', 'Toutes'], ['unread', 'Non lues'], ['success', 'Succes'], ['info', 'Info'], ['warning', 'Alertes']].map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: filter === k ? '#E30613' : '#F4F4F4',
              color: filter === k ? '#fff' : '#4A4A4A',
            }}
          >
            {lbl}
            {k === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 bg-white text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-4xl mb-3">🔔</p>
            <p className="text-sm" style={{ color: '#8C8C8C' }}>Aucune notification dans cette categorie</p>
          </div>
        )}
        {filtered.map(n => (
          <div
            key={n.id}
            className="bg-white rounded-xl border p-4 flex items-start gap-4 transition-colors cursor-pointer"
            style={{
              borderColor: n.is_read ? '#E8E8E8' : '#FFD0D0',
              backgroundColor: n.is_read ? '#fff' : '#FFFAFA',
            }}
            onClick={() => !n.is_read && handleRead(n.id)}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: TYPE_COLOR[n.type] || '#3b82f6' }}
            >
              {n.type === 'success' ? '✓' : n.type === 'error' ? '✕' : n.type === 'warning' ? '!' : 'i'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>{n.title}</p>
                <span className="text-xs shrink-0" style={{ color: '#B0B0B0' }}>{timeAgo(n.created_at)}</span>
              </div>
              {n.body && (
                <p className="text-sm mt-1" style={{ color: '#4A4A4A' }}>{n.body}</p>
              )}
              <span
                className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${TYPE_COLOR[n.type]}20`, color: TYPE_COLOR[n.type] }}
              >
                {TYPE_LABEL[n.type] || n.type}
              </span>
            </div>
            {!n.is_read && (
              <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: '#E30613' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

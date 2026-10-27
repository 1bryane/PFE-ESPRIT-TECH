import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getUsers } from '../../api/users'
import { getConversations } from '../../api/chat'
import api from '../../api/client'

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'maintenant'
  if (diff < 3600) return `${Math.floor(diff / 60)} min`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`
  return new Date(iso).toLocaleDateString('fr-FR')
}

export default function ChatPage() {
  const { user } = useAuth()
  const { userId } = useParams()
  const [users, setUsers]             = useState([])
  const [conversations, setConversations] = useState([])
  const [search, setSearch]           = useState('')
  const [activeUser, setActiveUser]   = useState(null)
  const [messages, setMessages]       = useState([])
  const [input, setInput]             = useState('')
  const wsRef                         = useRef(null)
  const bottomRef                     = useRef(null)

  const loadConversations = () =>
    getConversations().then(r => setConversations(r.data)).catch(() => {})

  // Charger liste utilisateurs (pour recherche) + conversations existantes (triees par recence)
  useEffect(() => {
    getUsers({ search }).then(r => setUsers(r.data)).catch(() => {})
  }, [search])

  useEffect(() => {
    loadConversations()
    const interval = setInterval(loadConversations, 10000)
    return () => clearInterval(interval)
  }, [])

  // Ouvrir conversation initiale si userId dans URL
  useEffect(() => {
    if (userId) {
      getUsers().then(r => {
        const u = r.data.find(u => String(u.id) === userId)
        if (u) openConversation(u)
      }).catch(() => {})
    }
  }, [userId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const openConversation = async (otherUser) => {
    setActiveUser(otherUser)
    // Charger historique (le backend marque les messages recus comme lus)
    try {
      const { data } = await api.get(`/chat/history/${otherUser.id}`)
      setMessages(data)
    } catch { setMessages([]) }
    // Rafraichir la liste des conversations pour faire disparaitre le badge non-lu
    loadConversations()

    // WebSocket
    if (wsRef.current) wsRef.current.close()
    const token = localStorage.getItem('access_token')
    const ws = new WebSocket(`ws://localhost:8002/chat/ws/${token}`)
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.from === otherUser.id || msg.to === otherUser.id) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev
          return [...prev, { id: msg.id, sender_id: msg.from, receiver_id: msg.to, content: msg.content, created_at: msg.created_at, is_read: false }]
        })
      }
      loadConversations()
    }
    wsRef.current = ws
  }

  useEffect(() => () => wsRef.current?.close(), [])

  const sendMessage = (e) => {
    e.preventDefault()
    if (!input.trim() || !activeUser || wsRef.current?.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ to: activeUser.id, content: input.trim() }))
    setInput('')
  }

  // Conversations existantes triees par recence + reste des utilisateurs (sans conversation) en dessous
  const convoUserIds = new Set(conversations.map(c => c.user_id))
  const filteredUsers = users.filter(u => {
    if (u.id === user?.id) return false
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (
      u.nom?.toLowerCase().includes(s) ||
      u.prenom?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s)
    )
  })

  const usersById = Object.fromEntries(users.map(u => [u.id, u]))
  const showConversations = !search.trim()
  const otherUsers = showConversations
    ? filteredUsers.filter(u => !convoUserIds.has(u.id))
    : filteredUsers

  return (
    <div className="flex h-screen">
      {/* Liste conversations / utilisateurs */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800 mb-3">Chat</h2>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div className="flex-1 overflow-auto">
          {/* Conversations triees par message le plus recent en premier */}
          {showConversations && conversations.map(c => {
            const u = usersById[c.user_id] || { id: c.user_id, nom: c.nom, prenom: c.prenom, role: c.role }
            return (
              <button key={c.user_id} onClick={() => openConversation(u)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${activeUser?.id === u.id ? 'bg-red-50' : ''}`}>
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-sm font-semibold text-red-700 shrink-0">
                  {c.prenom?.[0]}{c.nom?.[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${c.unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                      {c.prenom} {c.nom}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(c.last_message_at)}</span>
                  </div>
                  <p className={`text-xs truncate ${c.unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                    {c.last_message}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span
                    className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full text-white px-1 shrink-0"
                    style={{ backgroundColor: '#E30613' }}
                  >
                    {c.unread > 99 ? '99+' : c.unread}
                  </span>
                )}
              </button>
            )
          })}

          {/* Separateur si on a a la fois conversations et autres utilisateurs */}
          {showConversations && conversations.length > 0 && otherUsers.length > 0 && (
            <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Autres utilisateurs
            </p>
          )}

          {/* Utilisateurs sans conversation existante / resultats de recherche */}
          {otherUsers.map(u => (
            <button key={u.id} onClick={() => openConversation(u)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${activeUser?.id === u.id ? 'bg-red-50' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-sm font-semibold text-red-700 shrink-0">
                {u.prenom?.[0]}{u.nom?.[0]}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-gray-800 truncate">{u.prenom} {u.nom}</p>
                <p className="text-xs text-gray-400 truncate">{u.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Zone messages */}
      <div className="flex-1 flex flex-col">
        {activeUser ? (
          <>
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-sm font-bold text-red-700">
                {activeUser.prenom?.[0]}{activeUser.nom?.[0]}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{activeUser.prenom} {activeUser.nom}</p>
                <p className="text-xs text-gray-400">{activeUser.role}</p>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4 space-y-3 bg-gray-50">
              {messages.map((m, i) => (
                <div key={m.id || i} className={`flex ${m.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-sm px-4 py-2 rounded-2xl text-sm ${
                    m.sender_id === user?.id ? 'bg-red-600 text-white' : 'bg-white border border-gray-200 text-gray-800'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={sendMessage} className="bg-white border-t border-gray-200 px-6 py-3 flex gap-3">
              <input value={input} onChange={e => setInput(e.target.value)}
                placeholder="Ecrivez un message..."
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              <button type="submit" disabled={!input.trim()}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-medium">
                Envoyer
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Selectionnez un utilisateur pour commencer une conversation
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getUnreadCount } from '../../api/chat'

const MENUS = {
  candidat: [
    { to: '/offres',        icon: '📋', label: 'Offres' },
    { to: '/profil',        icon: '👤', label: 'Mon Profil' },
    { to: '/candidatures',  icon: '📨', label: 'Candidatures' },
    { to: '/notifications', icon: '🔔', label: 'Notifications' },
    { to: '/help',          icon: '❓', label: 'Aide' },
  ],
  enseignant: [
    { to: '/dashboard',        icon: '📊', label: 'Tableau de bord' },
    { to: '/evaluations',      icon: '⭐', label: 'Evaluations' },
    { to: '/formations',       icon: '🎓', label: 'Formations' },
    { to: '/recommandations',  icon: '🏅', label: 'Recommandations' },
    { to: '/plans-carriere',   icon: '🗺️', label: 'Plan de carriere' },
    { to: '/aria',             icon: '🤖', label: 'ARIA IA' },
    { to: '/chat',             icon: '💬', label: 'Chat' },
    { to: '/notifications',    icon: '🔔', label: 'Notifications' },
    { to: '/help',             icon: '❓', label: 'Aide' },
  ],
  talent: [
    { to: '/dashboard',        icon: '📊', label: 'Tableau de bord' },
    { to: '/evaluations',      icon: '⭐', label: 'Evaluations' },
    { to: '/formations',       icon: '🎓', label: 'Formations & Talent' },
    { to: '/recommandations',  icon: '🏅', label: 'Mes Recommandations' },
    { to: '/plans-carriere',   icon: '🗺️', label: 'Plan de carriere' },
    { to: '/distinctions',     icon: '🥇', label: 'Mes Distinctions' },
    { to: '/aria',             icon: '🤖', label: 'ARIA IA' },
    { to: '/chat',             icon: '💬', label: 'Chat' },
    { to: '/notifications',    icon: '🔔', label: 'Notifications' },
    { to: '/help',             icon: '❓', label: 'Aide' },
  ],
  rp_coord: [
    { to: '/dashboard',        icon: '📊', label: 'Tableau de bord' },
    { to: '/rp/offres',        icon: '📋', label: 'Offres & Recrutement' },
    { to: '/evaluations',      icon: '⭐', label: 'Mes Evaluations' },
    { to: '/formations',       icon: '🎓', label: 'Mes Formations' },
    { to: '/recommandations',  icon: '🏅', label: 'Recommandations' },
    { to: '/aria',             icon: '🤖', label: 'ARIA IA' },
    { to: '/chat',             icon: '💬', label: 'Chat' },
    { to: '/notifications',    icon: '🔔', label: 'Notifications' },
    { to: '/help',             icon: '❓', label: 'Aide' },
  ],
  rp_chef: [
    { to: '/chef/dashboard',   icon: '📊', label: 'Tableau de bord' },
    { to: '/rp/offres',        icon: '📋', label: 'Offres' },
    { to: '/evaluations',      icon: '⭐', label: 'Mes Evaluations' },
    { to: '/formations',       icon: '🎓', label: 'Mes Formations' },
    { to: '/recommandations',  icon: '🏅', label: 'Recommandations' },
    { to: '/plans-carriere',   icon: '🗺️', label: 'Plans Carriere' },
    { to: '/aria',             icon: '🤖', label: 'ARIA IA' },
    { to: '/chat',             icon: '💬', label: 'Chat' },
    { to: '/notifications',    icon: '🔔', label: 'Notifications' },
    { to: '/help',             icon: '❓', label: 'Aide' },
  ],
  rdff: [
    { to: '/rdff/formations',  icon: '🎓', label: 'Formations' },
    { to: '/aria',             icon: '🤖', label: 'ARIA IA' },
    { to: '/chat',             icon: '💬', label: 'Chat' },
    { to: '/notifications',    icon: '🔔', label: 'Notifications' },
    { to: '/help',             icon: '❓', label: 'Aide' },
  ],
  chef_admin: [
    { to: '/dashboard',        icon: '📊', label: 'Tableau de bord' },
    { to: '/rh/recrutement',   icon: '🧑‍💼', label: 'Recrutement' },
    { to: '/rh/effectifs',     icon: '👥', label: 'Effectifs' },
    { to: '/recommandations',  icon: '🏅', label: 'Validation Talent' },
    { to: '/plans-carriere',   icon: '🗺️', label: 'Plans Carriere' },
    { to: '/distinctions',     icon: '🥇', label: 'Distinctions' },
    { to: '/chat',             icon: '💬', label: 'Chat' },
    { to: '/notifications',    icon: '🔔', label: 'Notifications' },
    { to: '/help',             icon: '❓', label: 'Aide' },
  ],
  direction_etudes: [
    { to: '/direction-etudes/dashboard', icon: '📊', label: 'Tableau de bord' },
    { to: '/evaluations',                icon: '⭐', label: 'Evaluations' },
    { to: '/recommandations',            icon: '🏅', label: 'Recommandations' },
    { to: '/chat',                       icon: '💬', label: 'Chat' },
    { to: '/notifications',              icon: '🔔', label: 'Notifications' },
    { to: '/help',                       icon: '❓', label: 'Aide' },
  ],
  direction: [
    { to: '/direction/dashboard', icon: '🏛️', label: 'Supervision' },
    { to: '/distinctions',        icon: '🥇', label: 'Distinctions' },
    { to: '/plans-carriere',      icon: '🗺️', label: 'Plans Carriere' },
    { to: '/recommandations',     icon: '🏅', label: 'Recommandations' },
    { to: '/chat',                icon: '💬', label: 'Chat' },
    { to: '/notifications',       icon: '🔔', label: 'Notifications' },
    { to: '/help',                icon: '❓', label: 'Aide' },
  ],
  // Nouveaux rôles — memes capacites que leurs equivalents legacy (cup = rp_coord, chef_dept = rp_chef),
  // juste scopes sur une unite/departement different selon le perimetre de chaque utilisateur
  cup: [
    { to: '/dashboard',        icon: '📊', label: 'Tableau de bord' },
    { to: '/rp/offres',        icon: '📋', label: 'Offres & Recrutement' },
    { to: '/evaluations',      icon: '⭐', label: 'Evaluations Unite' },
    { to: '/formations',       icon: '🎓', label: 'Mes Formations' },
    { to: '/recommandations',  icon: '🏅', label: 'Recommandations' },
    { to: '/aria',             icon: '🤖', label: 'ARIA IA' },
    { to: '/chat',             icon: '💬', label: 'Chat' },
    { to: '/notifications',    icon: '🔔', label: 'Notifications' },
    { to: '/help',             icon: '❓', label: 'Aide' },
  ],
  chef_dept: [
    { to: '/chef/dashboard',   icon: '📊', label: 'Tableau de bord' },
    { to: '/rp/offres',        icon: '📋', label: 'Offres' },
    { to: '/evaluations',      icon: '⭐', label: 'Evaluations Dept.' },
    { to: '/formations',       icon: '🎓', label: 'Mes Formations' },
    { to: '/recommandations',  icon: '🏅', label: 'Recommandations' },
    { to: '/plans-carriere',   icon: '🗺️', label: 'Plans Carriere' },
    { to: '/aria',             icon: '🤖', label: 'ARIA IA' },
    { to: '/chat',             icon: '💬', label: 'Chat' },
    { to: '/notifications',    icon: '🔔', label: 'Notifications' },
    { to: '/help',             icon: '❓', label: 'Aide' },
  ],
  direction_dept: [
    { to: '/direction-dept/dashboard', icon: '🏢', label: 'Ma Direction' },
    { to: '/recommandations',          icon: '🏅', label: 'Recommandations' },
    { to: '/distinctions',             icon: '🥇', label: 'Distinctions' },
    { to: '/chat',                     icon: '💬', label: 'Chat' },
    { to: '/notifications',            icon: '🔔', label: 'Notifications' },
    { to: '/help',                     icon: '❓', label: 'Aide' },
  ],
  responsable: [
    { to: '/dashboard',        icon: '📊', label: 'Tableau de bord' },
    { to: '/chat',             icon: '💬', label: 'Chat' },
    { to: '/notifications',    icon: '🔔', label: 'Notifications' },
    { to: '/help',             icon: '❓', label: 'Aide' },
  ],
  cps: [
    { to: '/dashboard',        icon: '📊', label: 'Tableau de bord' },
    { to: '/chat',             icon: '💬', label: 'Chat' },
    { to: '/notifications',    icon: '🔔', label: 'Notifications' },
    { to: '/help',             icon: '❓', label: 'Aide' },
  ],
  charge_mission: [
    { to: '/dashboard',        icon: '📊', label: 'Tableau de bord' },
    { to: '/chat',             icon: '💬', label: 'Chat' },
    { to: '/notifications',    icon: '🔔', label: 'Notifications' },
    { to: '/help',             icon: '❓', label: 'Aide' },
  ],
}

const ROLE_LABELS = {
  candidat:          'Candidat',
  enseignant:        'Enseignant',
  talent:            'Talent ESPRIT',
  rp_coord:          'RP Coordinateur',
  rp_chef:           'Chef Dept. Ped.',
  rdff:              'Resp. Formations',
  chef_admin:        'Admin / RH',
  direction_etudes:  'Direction des Etudes',
  direction:         'Direction Generale',
  cup:               'CUP',
  chef_dept:         'Chef de Departement',
  direction_dept:    'Direction',
  responsable:       'Responsable',
  cps:               'CPS',
  charge_mission:    'Charge de Mission',
}

export default function Sidebar() {
  const { user } = useAuth()
  const links = MENUS[user?.role] || []
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user?.id) return
    const fetchUnread = () => getUnreadCount().then(r => setUnread(r.data.unread)).catch(() => {})
    fetchUnread()
    const interval = setInterval(fetchUnread, 15000)
    return () => clearInterval(interval)
  }, [user?.id])

  // Affiche le sous_role s'il est défini (ex: "CUP — Algorithmique")
  const roleBadge = user?.sous_role
    ? `${ROLE_LABELS[user?.role] || user?.role} — ${user.sous_role.replace(/_/g, ' ')}`
    : (ROLE_LABELS[user?.role] || user?.role)

  return (
    <aside
      className="w-56 h-full flex flex-col border-r shrink-0"
      style={{ backgroundColor: '#1A1A1A', borderColor: '#2C2C2C' }}
    >
      {/* Rôle badge */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: '#2C2C2C' }}
      >
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold"
          style={{ backgroundColor: '#E30613', color: 'white' }}
        >
          {user?.is_talent && <span>★</span>}
          {roleBadge}
        </div>
        {user?.perimetre && (
          <p className="text-xs mt-1 truncate" style={{ color: '#888' }}>
            {user.perimetre}
          </p>
        )}
        {!user?.perimetre && user?.departement && (
          <p className="text-xs mt-1.5 truncate" style={{ color: '#666' }}>
            {user.departement}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard' || to === '/'}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
            style={({ isActive }) => ({
              backgroundColor: isActive ? '#E30613' : 'transparent',
              color: isActive ? '#ffffff' : '#9CA3AF',
              fontWeight: isActive ? '600' : '400',
            })}
            onMouseEnter={(e) => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.backgroundColor = '#2C2C2C'
                e.currentTarget.style.color = '#ffffff'
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.style.backgroundColor.includes('227')) {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#9CA3AF'
              }
            }}
          >
            <span className="w-5 text-center text-base leading-none">{icon}</span>
            <span className="truncate flex-1">{label}</span>
            {to === '/chat' && unread > 0 && (
              <span
                className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full text-white px-1"
                style={{ backgroundColor: '#E30613' }}
              >
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer — version */}
      <div
        className="px-4 py-3 border-t"
        style={{ borderColor: '#2C2C2C' }}
      >
        <p className="text-xs" style={{ color: '#444' }}>ESPRIT Talents v1.0</p>
        <p className="text-xs mt-0.5" style={{ color: '#333' }}>Honoris United Universities</p>
      </div>
    </aside>
  )
}

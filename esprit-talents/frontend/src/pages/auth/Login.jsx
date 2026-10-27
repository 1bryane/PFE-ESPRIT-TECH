import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { login, me } from '../../api/auth'
import toast from 'react-hot-toast'
import EspritLogo, { HonorisLogo } from '../../components/UI/EspritLogo'

const TEST_ACCOUNTS = [
  {
    groupe: 'Recrutement',
    color: '#3b82f6',
    comptes: [
      { role: 'Candidat',  email: 'candidat1@esprit.tn',  pwd: 'cand123',  nom: 'Mohamed Hajji',   dept: 'Informatique' },
      { role: 'Candidat',  email: 'candidat2@esprit.tn',  pwd: 'cand123',  nom: 'Ines Oueslati',   dept: 'Genie Civil'  },
    ],
  },
  {
    groupe: 'Corps Enseignant',
    color: '#22c55e',
    comptes: [
      { role: 'Talent ESPRIT (★)', email: 'enseignant1@esprit.tn', pwd: 'ens123', nom: 'Ahmed Ben Salah', dept: 'Informatique' },
      { role: 'Enseignant',        email: 'enseignant2@esprit.tn', pwd: 'ens123', nom: 'Fatma Amri',      dept: 'Informatique' },
      { role: 'Enseignant',        email: 'enseignant3@esprit.tn', pwd: 'ens123', nom: 'Sami Cherni',     dept: 'Informatique' },
    ],
  },
  {
    groupe: 'Unites & Departements',
    color: '#06b6d4',
    comptes: [
      { role: 'CUP',              email: 'cup.algo@esprit.tn',    pwd: 'cup123',    nom: 'Yassine Mansouri', dept: 'CUP — Algorithmique' },
      { role: 'CUP',              email: 'cup.web@esprit.tn',     pwd: 'cup123',    nom: 'Rim Jlassi',       dept: 'CUP — Web & Mobile' },
      { role: 'CUP',              email: 'rp.coord@esprit.tn',    pwd: 'rpcoord123',nom: 'Rami Trabelsi',    dept: 'CUP — Systemes Distribues' },
      { role: 'Chef Departement', email: 'chef.dept@esprit.tn',   pwd: 'chef123',   nom: 'Nizar Boubaker',   dept: 'Chef Dept — Informatique' },
      { role: 'Chef Departement', email: 'rp.chef@esprit.tn',     pwd: 'rpchef123', nom: 'Syrine Karoui',    dept: 'Chef Dept — Genie Civil' },
      { role: 'Direction Dept.',  email: 'dir.dept.rh@esprit.tn', pwd: 'dirrh123',  nom: 'Olfa Chaouachi',   dept: 'Direction RH' },
      { role: 'Direction Dept.',  email: 'dir.dept.si@esprit.tn', pwd: 'dirsi123',  nom: 'Hatem Rekik',      dept: 'Direction SI' },
    ],
  },
  {
    groupe: 'Formation & RH',
    color: '#8b5cf6',
    comptes: [
      { role: 'RDFF',      email: 'rdff@esprit.tn',  pwd: 'rdff123',  nom: 'Anis Mbarki',   dept: 'Formation' },
      { role: 'Admin RH',  email: 'admin@esprit.tn', pwd: 'admin123', nom: 'Chef Admin',    dept: 'Administration' },
      { role: 'RH',        email: 'rh@esprit.tn',    pwd: 'rh123',    nom: 'Leila Gharbi',  dept: 'RH' },
    ],
  },
  {
    groupe: 'Direction',
    color: '#E30613',
    comptes: [
      { role: 'Direction des Etudes',  email: 'dir.etudes@esprit.tn', pwd: 'diret123', nom: 'Karim Saidi',   dept: 'Informatique' },
      { role: 'Direction Generale',    email: 'direction@esprit.tn',  pwd: 'dir123',   nom: 'Sonia Ben Ali', dept: 'Direction' },
    ],
  },
]

export default function Login() {
  const { loginUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]           = useState({ email: '', password: '' })
  const [loading, setLoading]     = useState(false)
  const [showTests, setShowTests] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: token } = await login(form)
      localStorage.setItem('access_token', token.access_token)
      const { data: user } = await me()
      loginUser(token.access_token, user)
      toast.success(`Bienvenue, ${user.prenom} !`, { icon: '👋' })
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Identifiants incorrects')
    } finally {
      setLoading(false)
    }
  }

  const selectAccount = ({ email, pwd }) => {
    setForm({ email, password: pwd })
    setShowTests(false)
    toast(`Compte selectionne — cliquez sur Se connecter`, { icon: '✓', duration: 2000 })
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Panneau gauche ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex w-5/12 flex-col justify-between p-14 relative overflow-hidden shrink-0"
        style={{ backgroundColor: '#1A1A1A' }}
      >
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: '#E30613' }} />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: '#E30613' }} />

        <div className="relative z-10">
          <EspritLogo size="lg" className="brightness-0 invert" />
        </div>

        <div className="relative z-10 space-y-7">
          <div className="w-14 h-1 rounded-full" style={{ backgroundColor: '#E30613' }} />
          <h2 className="text-4xl font-bold text-white leading-snug">
            Plateforme de<br />
            <span style={{ color: '#E30613' }}>Gestion des Talents</span>
          </h2>
          <p className="text-gray-400 text-base leading-relaxed">
            Recrutez, evaluez et valorisez les meilleurs
            talents pedagogiques d'ESPRIT en un seul espace intelligent.
          </p>
          <div className="flex gap-10 pt-2">
            {[['11', 'Acteurs'], ['9', 'Roles'], ['5', 'Formations']].map(([n, l]) => (
              <div key={l}>
                <p className="text-3xl font-bold" style={{ color: '#E30613' }}>{n}</p>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <HonorisLogo height={44} />
        </div>
      </div>

      {/* ── Panneau droit ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center px-12 py-10 max-w-2xl mx-auto w-full">

          {/* Logo mobile */}
          <div className="lg:hidden mb-8">
            <EspritLogo size="lg" />
          </div>

          {/* En-tête */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>Connexion</h1>
            <p className="text-base mt-2" style={{ color: '#8C8C8C' }}>
              Accedez a votre espace personnel ESPRIT Talents
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#2C2C2C' }}>
                Adresse email
              </label>
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="prenom.nom@esprit.tn"
                className="w-full border rounded-xl px-5 py-4 text-sm outline-none transition-all"
                style={{ borderColor: '#E0E0E0', color: '#1A1A1A', fontSize: '15px' }}
                onFocus={e => e.target.style.borderColor = '#E30613'}
                onBlur={e => e.target.style.borderColor = '#E0E0E0'}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#2C2C2C' }}>
                Mot de passe
              </label>
              <input
                type="password" required
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full border rounded-xl px-5 py-4 text-sm outline-none transition-all"
                style={{ borderColor: '#E0E0E0', color: '#1A1A1A', fontSize: '15px' }}
                onFocus={e => e.target.style.borderColor = '#E30613'}
                onBlur={e => e.target.style.borderColor = '#E0E0E0'}
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-4 rounded-xl text-white font-bold text-base tracking-wide transition-all disabled:opacity-60"
              style={{ backgroundColor: '#E30613' }}
              onMouseEnter={e => { if (!loading) e.target.style.backgroundColor = '#B8000F' }}
              onMouseLeave={e => { if (!loading) e.target.style.backgroundColor = '#E30613' }}
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          {/* Lien inscription */}
          <p className="text-center text-sm mt-6" style={{ color: '#8C8C8C' }}>
            Pas encore de compte ?{' '}
            <Link to="/register" className="font-semibold" style={{ color: '#E30613' }}>
              S'inscrire
            </Link>
          </p>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px" style={{ backgroundColor: '#E8E8E8' }} />
            <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: '#F4F4F4', color: '#8C8C8C' }}>
              {TEST_ACCOUNTS.reduce((n, g) => n + g.comptes.length, 0)} comptes de test disponibles
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#E8E8E8' }} />
          </div>

          {/* Bouton toggle */}
          <button
            onClick={() => setShowTests(p => !p)}
            className="w-full py-3.5 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2"
            style={{
              borderColor: showTests ? '#E30613' : '#E0E0E0',
              color: showTests ? '#E30613' : '#4A4A4A',
              backgroundColor: showTests ? '#FFF0F0' : 'white',
            }}
          >
            <span>{showTests ? '▲' : '▼'}</span>
            {showTests ? 'Masquer les comptes de test' : 'Afficher tous les comptes de test'}
          </button>

          {/* Liste complète des comptes — groupée par catégorie */}
          {showTests && (
            <div className="mt-4 space-y-4">
              {TEST_ACCOUNTS.map(({ groupe, color, comptes }) => (
                <div key={groupe}>
                  {/* Header groupe */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
                      {groupe}
                    </p>
                    <div className="flex-1 h-px" style={{ backgroundColor: '#F0F0F0' }} />
                  </div>

                  {/* Cartes comptes */}
                  <div className="grid grid-cols-2 gap-2">
                    {comptes.map(c => (
                      <button
                        key={c.email}
                        onClick={() => selectAccount(c)}
                        className="text-left p-3.5 rounded-xl border transition-all group"
                        style={{ borderColor: '#E8E8E8', backgroundColor: 'white' }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = color
                          e.currentTarget.style.backgroundColor = `${color}08`
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#E8E8E8'
                          e.currentTarget.style.backgroundColor = 'white'
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {c.nom[0]}
                          </div>
                          <span className="text-xs font-bold truncate" style={{ color }}>
                            {c.role}
                          </span>
                        </div>
                        <p className="text-xs font-medium truncate" style={{ color: '#1A1A1A' }}>
                          {c.nom}
                        </p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: '#ABABAB' }}>
                          {c.email}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs" style={{ color: '#CDCDCD' }}>{c.dept}</span>
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F4F4F4', color: '#8C8C8C' }}>
                            {c.pwd}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <p className="text-xs text-center py-2" style={{ color: '#CDCDCD' }}>
                Cliquez sur un compte pour le selectionner automatiquement
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

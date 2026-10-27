import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { register, me, login } from '../../api/auth'
import toast from 'react-hot-toast'
import EspritLogo, { HonorisLogo } from '../../components/UI/EspritLogo'

const DEPARTEMENTS = [
  'Informatique', 'Genie Civil', 'Genie Electrique',
  'Management', 'Sciences', 'Langues', 'Administration',
]

export default function Register() {
  const { loginUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '', password: '', nom: '', prenom: '', departement: '', specialite: '',
  })
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await register(form)
      const { data: token } = await login({ email: form.email, password: form.password })
      localStorage.setItem('access_token', token.access_token)
      const { data: user } = await me()
      loginUser(token.access_token, user)
      toast.success('Compte cree avec succes !')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'inscription")
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full border rounded-lg px-4 py-3 text-sm outline-none transition-all"
  const inputStyle = { borderColor: '#E0E0E0', color: '#1A1A1A' }
  const onFocus = (e) => { e.target.style.borderColor = '#E30613' }
  const onBlur  = (e) => { e.target.style.borderColor = '#E0E0E0' }

  return (
    <div className="min-h-screen flex">

      {/* Panneau gauche */}
      <div
        className="hidden lg:flex w-2/5 flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: '#1A1A1A' }}
      >
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: '#E30613' }} />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: '#E30613' }} />

        <div className="relative z-10">
          <EspritLogo size="lg" className="brightness-0 invert" />
        </div>

        <div className="relative z-10 space-y-5">
          <div className="w-12 h-1 rounded-full" style={{ backgroundColor: '#E30613' }} />
          <h2 className="text-3xl font-bold text-white leading-tight">
            Rejoignez la communaute<br />
            <span style={{ color: '#E30613' }}>ESPRIT Talents</span>
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Inscrivez-vous en tant que candidat et commencez votre parcours vers l'excellence pedagogique.
          </p>

          {/* Etapes visuelles */}
          <div className="space-y-3 pt-2">
            {[
              ['01', 'Informations personnelles'],
              ['02', 'Departement & specialite'],
              ['03', 'Acces a la plateforme'],
            ].map(([n, lbl], i) => (
              <div key={n} className="flex items-center gap-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: i < step ? '#E30613' : '#2C2C2C', color: i < step ? 'white' : '#666' }}
                >
                  {n}
                </div>
                <span className="text-sm" style={{ color: i < step ? '#fff' : '#666' }}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <HonorisLogo height={40} />
        </div>
      </div>

      {/* Panneau droit */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 py-12">
        <div className="lg:hidden mb-8"><EspritLogo size="lg" /></div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Creer un compte</h1>
            <p className="text-sm mt-1" style={{ color: '#8C8C8C' }}>Inscription en tant que candidat</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Nom & Prenom */}
            <div className="grid grid-cols-2 gap-3">
              {[['prenom','Prenom'],['nom','Nom']].map(([k,lbl]) => (
                <div key={k}>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>{lbl}</label>
                  <input type="text" required value={form[k]} onChange={set(k)} onFocus={onFocus} onBlur={onBlur} className={inputClass} style={inputStyle} />
                </div>
              ))}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>Email</label>
              <input type="email" required value={form.email} onChange={set('email')} onFocus={onFocus} onBlur={onBlur}
                placeholder="prenom.nom@esprit.tn" className={inputClass} style={inputStyle} />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>Mot de passe</label>
              <input type="password" required minLength={6} value={form.password} onChange={set('password')} onFocus={onFocus} onBlur={onBlur}
                placeholder="Minimum 6 caracteres" className={inputClass} style={inputStyle} />
            </div>

            {/* Departement */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>Departement</label>
              <select required value={form.departement} onChange={set('departement')} onFocus={onFocus} onBlur={onBlur}
                className={inputClass} style={{ ...inputStyle, backgroundColor: 'white' }}>
                <option value="">Selectionnez votre departement</option>
                {DEPARTEMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Specialite */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>
                Specialite <span style={{ color: '#8C8C8C', fontWeight: 400 }}>(optionnel)</span>
              </label>
              <input type="text" value={form.specialite} onChange={set('specialite')} onFocus={onFocus} onBlur={onBlur}
                placeholder="ex: Intelligence Artificielle" className={inputClass} style={inputStyle} />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-lg text-white font-bold text-sm tracking-wide transition-all disabled:opacity-60 mt-2"
              style={{ backgroundColor: '#E30613' }}
              onMouseEnter={e => { if (!loading) e.target.style.backgroundColor = '#B8000F' }}
              onMouseLeave={e => { if (!loading) e.target.style.backgroundColor = '#E30613' }}
            >
              {loading ? 'Creation du compte...' : 'Creer mon compte'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: '#8C8C8C' }}>
            Deja inscrit ?{' '}
            <Link to="/login" className="font-semibold" style={{ color: '#E30613' }}>Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

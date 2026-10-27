import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { updateMe, uploadCV, uploadPhoto } from '../../api/users'
import { me } from '../../api/auth'
import toast from 'react-hot-toast'

export default function CandidatProfil() {
  const { user, setUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [cvLoading, setCvLoading] = useState(false)
  const [form, setForm] = useState({
    nom: user?.nom || '', prenom: user?.prenom || '',
    specialite: user?.specialite || '', telephone: user?.telephone || '',
  })

  const refreshUser = async () => {
    const { data } = await me()
    setUser(data)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateMe(form)
      await refreshUser()
      toast.success('Profil mis a jour')
    } catch { toast.error('Erreur mise a jour') }
    finally { setLoading(false) }
  }

  const handleCV = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCvLoading(true)
    try {
      await uploadCV(file)
      await refreshUser()
      toast.success('CV uploade ! Competences extraites automatiquement.')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur upload CV')
    } finally { setCvLoading(false) }
  }

  const handlePhoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      await uploadPhoto(file)
      await refreshUser()
      toast.success('Photo mise a jour')
    } catch { toast.error('Erreur upload photo') }
  }

  return (
    <div className="p-8 max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Mon profil</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-2xl font-bold text-red-600 overflow-hidden">
              {user?.photo_path
                ? <img src={`http://localhost:8002${user.photo_path}`} alt="" className="w-full h-full object-cover" />
                : `${user?.prenom?.[0]}${user?.nom?.[0]}`}
            </div>
            <label className="absolute bottom-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer text-xs hover:bg-red-700">
              +<input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{user?.prenom} {user?.nom}</h3>
            <p className="text-sm text-gray-500">{user?.departement}</p>
            {user?.is_talent && <span className="text-yellow-500 text-sm font-semibold">Talent ESPRIT</span>}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[['prenom','Prenom'],['nom','Nom']].map(([k,lbl]) => (
              <div key={k}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{lbl}</label>
                <input value={form[k]} onChange={e => setForm(p=>({...p,[k]:e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specialite</label>
            <input value={form.specialite} onChange={e => setForm(p=>({...p,specialite:e.target.value}))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
            <input value={form.telephone} onChange={e => setForm(p=>({...p,telephone:e.target.value}))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <button type="submit" disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>

      {/* Upload CV */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-800 mb-1">CV (PDF)</h3>
        <p className="text-sm text-gray-500 mb-4">Les competences seront extraites automatiquement par IA.</p>
        {user?.cv_path && (
          <p className="text-sm text-red-600 mb-3">
            CV actuel : <a href={`http://localhost:8002${user.cv_path}`} target="_blank" rel="noreferrer" className="underline">Voir le CV</a>
          </p>
        )}
        <label className="cursor-pointer inline-flex items-center gap-2 bg-red-50 hover:bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          {cvLoading ? 'Upload en cours...' : 'Uploader mon CV (PDF)'}
          <input type="file" accept=".pdf" className="hidden" onChange={handleCV} disabled={cvLoading} />
        </label>
      </div>

      {/* Competences */}
      {user?.competences?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-3">Competences extraites du CV</h3>
          <div className="flex flex-wrap gap-2">
            {user.competences.map(c => (
              <span key={c} className="bg-red-50 text-red-700 text-sm px-3 py-1 rounded-full">{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

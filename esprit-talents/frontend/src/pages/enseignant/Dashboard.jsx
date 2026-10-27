import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { statsEnseignant } from '../../api/evaluations'
import { mesInscriptions } from '../../api/formations'
import { updateMe, uploadCV, uploadPhoto } from '../../api/users'
import toast from 'react-hot-toast'

export default function EnseignantDashboard() {
  const { user, setUser } = useAuth()
  const [stats, setStats]   = useState(null)
  const [inscs, setInscs]   = useState([])

  // Profil / compétences
  const [editingComp, setEditingComp]     = useState(false)
  const [compInput, setCompInput]         = useState('')
  const [competences, setCompetences]     = useState([])
  const [savingComp, setSavingComp]       = useState(false)
  const [uploadingCV, setUploadingCV]     = useState(false)

  useEffect(() => {
    if (user?.id) {
      statsEnseignant(user.id).then(r => setStats(r.data)).catch(() => {})
      mesInscriptions().then(r => setInscs(r.data)).catch(() => {})
    }
    if (user?.competences) setCompetences(user.competences)
  }, [user])

  const handleSaveCompetences = async () => {
    setSavingComp(true)
    try {
      const { data } = await updateMe({ competences })
      if (setUser) setUser(data)
      setEditingComp(false)
      toast.success('Compétences mises à jour !')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setSavingComp(false)
    }
  }

  const handleAddComp = () => {
    const trimmed = compInput.trim()
    if (!trimmed || competences.includes(trimmed)) return
    setCompetences(p => [...p, trimmed])
    setCompInput('')
  }

  const handleRemoveComp = (c) => setCompetences(p => p.filter(x => x !== c))

  const handleCVUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCV(true)
    try {
      const { data } = await uploadCV(file)
      if (setUser) setUser(data)
      setCompetences(data.competences || [])
      toast.success(`CV analysé — ${data.competences?.length || 0} compétences extraites`)
    } catch {
      toast.error('Erreur lors de l\'analyse du CV')
    } finally {
      setUploadingCV(false)
      e.target.value = ''
    }
  }

  const cards = [
    { label: 'Moyenne globale',     value: stats ? `${stats.moyenne_globale}/20` : '—', color: 'bg-red-50 text-red-700' },
    { label: 'Pedagogie',           value: stats ? `${stats.moyenne_pedagogie}/20` : '—', color: 'bg-blue-50 text-blue-700' },
    { label: 'Engagement',          value: stats ? `${stats.moyenne_engagement}/20` : '—', color: 'bg-green-50 text-green-700' },
    { label: 'Evaluations recues',  value: stats?.nb_evaluations ?? '—', color: 'bg-purple-50 text-purple-700' },
    { label: 'Formations suivies',  value: inscs.length, color: 'bg-yellow-50 text-yellow-700' },
  ]

  return (
    <div className="p-8 space-y-6">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Bonjour, {user?.prenom} !</h2>
        <p className="text-gray-500">{user?.departement} • {user?.specialite}</p>
        {user?.is_talent && (
          <span className="inline-block mt-2 bg-yellow-100 text-yellow-700 text-sm font-semibold px-3 py-1 rounded-full">
            ★ Talent ESPRIT
          </span>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`rounded-xl p-4 ${c.color}`}>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-sm mt-1 opacity-80">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Formations en cours */}
      {inscs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Mes formations en cours</h3>
          <div className="space-y-3">
            {inscs.slice(0, 5).map(i => (
              <div key={i.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{i.formation?.titre || `Formation #${i.formation_id}`}</p>
                  <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${i.progression}%` }} />
                  </div>
                </div>
                <span className="text-sm text-gray-500 shrink-0">{i.progression}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compétences — section clé pour le matching et ARIA */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800">Mes compétences</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Ces compétences servent au matching avec les offres et à ARIA pour vos plans de carrière
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Upload CV → extraction automatique */}
            <label className="cursor-pointer">
              <input type="file" accept=".pdf" className="hidden" onChange={handleCVUpload} disabled={uploadingCV} />
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                style={{ borderColor: '#E30613', color: '#E30613' }}
              >
                {uploadingCV ? 'Analyse...' : '↑ Mettre à jour CV'}
              </span>
            </label>
            <button
              onClick={() => { setEditingComp(p => !p); setCompetences(user?.competences || []) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              {editingComp ? 'Annuler' : '✏ Modifier'}
            </button>
          </div>
        </div>

        {/* Mode lecture */}
        {!editingComp && (
          <div className="flex flex-wrap gap-2">
            {(user?.competences || []).length === 0 ? (
              <p className="text-sm text-gray-400">
                Aucune compétence enregistrée — uploadez votre CV ou cliquez sur Modifier
              </p>
            ) : (
              (user?.competences || []).map(c => (
                <span key={c} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                  {c}
                </span>
              ))
            )}
          </div>
        )}

        {/* Mode édition */}
        {editingComp && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-gray-50 rounded-lg border border-gray-200">
              {competences.map(c => (
                <span
                  key={c}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white text-gray-700 rounded-full text-xs font-medium border border-gray-200"
                >
                  {c}
                  <button
                    onClick={() => handleRemoveComp(c)}
                    className="ml-1 text-gray-400 hover:text-red-500 font-bold leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
              {competences.length === 0 && (
                <span className="text-xs text-gray-400">Aucune compétence — ajoutez-en ci-dessous</span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={compInput}
                onChange={e => setCompInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddComp() } }}
                placeholder="Ajouter une compétence (ex: React, Python, pédagogie…)"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <button
                onClick={handleAddComp}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: '#E30613' }}
              >
                Ajouter
              </button>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditingComp(false)}
                className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveCompetences}
                disabled={savingComp}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: '#E30613' }}
              >
                {savingComp ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

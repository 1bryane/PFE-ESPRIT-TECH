import { useEffect, useState } from 'react'
import { getOffres } from '../../api/offres'
import { postuler } from '../../api/candidatures'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function CandidatOffres() {
  const { user } = useAuth()
  const [offres, setOffres] = useState([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(null)
  const [lettre, setLettre] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    getOffres({ departement: user?.departement })
      .then(r => setOffres(r.data))
      .catch(() => toast.error('Erreur chargement des offres'))
      .finally(() => setLoading(false))
  }, [user])

  const handlePostuler = async (offreId) => {
    setPosting(offreId)
    try {
      await postuler({ offre_id: offreId, lettre_motivation: lettre })
      toast.success('Candidature envoyee !')
      setSelected(null); setLettre('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la candidature')
    } finally {
      setPosting(null)
    }
  }

  if (loading) return <div className="p-8 text-gray-400">Chargement des offres...</div>

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Offres disponibles</h2>
      {offres.length === 0 && <p className="text-gray-400">Aucune offre disponible pour votre departement.</p>}

      <div className="space-y-4">
        {offres.map(o => (
          <div key={o.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-800">{o.titre}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    o.statut === 'ouverte' ? 'bg-green-100 text-green-700' :
                    o.statut === 'fermee'  ? 'bg-gray-100 text-gray-600'  : 'bg-blue-100 text-blue-700'
                  }`}>{o.statut}</span>
                </div>
                <p className="text-sm text-gray-500 mb-3">{o.departement} • {o.type_contrat} • {o.nb_postes} poste(s)</p>
                <p className="text-sm text-gray-600 line-clamp-2">{o.description}</p>
                {o.competences_requises?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {o.competences_requises.map(c => (
                      <span key={c} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                )}
              </div>
              <button
                disabled={o.statut !== 'ouverte'}
                onClick={() => setSelected(o)}
                className="shrink-0 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Postuler
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal lettre */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-1">Postuler a :</h3>
            <p className="text-red-600 font-medium mb-4">{selected.titre}</p>
            <label className="block text-sm text-gray-600 mb-2">Lettre de motivation (optionnel)</label>
            <textarea rows={4} value={lettre} onChange={e => setLettre(e.target.value)}
              placeholder="Presentez-vous brievement..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setSelected(null)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm">Annuler</button>
              <button disabled={posting === selected.id} onClick={() => handlePostuler(selected.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {posting === selected.id ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getOffre, getCandidatsOffre } from '../../api/offres'
import { updateStatut } from '../../api/candidatures'
import toast from 'react-hot-toast'

const STATUT_OPTIONS = ['soumise', 'en_cours', 'entretien', 'acceptee', 'refusee']
const STATUT_COLORS  = {
  soumise:   'bg-blue-100 text-blue-700',
  en_cours:  'bg-yellow-100 text-yellow-700',
  entretien: 'bg-purple-100 text-purple-700',
  acceptee:  'bg-green-100 text-green-700',
  refusee:   'bg-red-100 text-red-700',
}

export default function RPCoordCandidats() {
  const { id } = useParams()
  const { user } = useAuth()
  // Seul le RH (chef_admin) peut modifier le statut
  const canEdit = user?.role === 'chef_admin'

  const [offre, setOffre]         = useState(null)
  const [candidats, setCandidats] = useState([])
  const [loading, setLoading]     = useState(true)

  const reload = () => Promise.all([getOffre(id), getCandidatsOffre(id)])
    .then(([o, c]) => { setOffre(o.data); setCandidats(c.data) })
    .finally(() => setLoading(false))

  useEffect(() => { reload() }, [id])

  const handleStatut = async (candidatureId, statut) => {
    try {
      await updateStatut(candidatureId, { statut })
      toast.success('Statut mis a jour')
      reload()
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">{offre?.titre}</h2>
      <p className="text-gray-500 mb-4">{candidats.length} candidat(s) • tries par score ML</p>

      {!canEdit && (
        <div className="mb-5 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          Mode consultation — seul le RH peut modifier le statut des candidatures.
        </div>
      )}

      {candidats.length === 0 && <p className="text-gray-400">Aucune candidature pour cette offre.</p>}

      <div className="space-y-4">
        {candidats.map((c, idx) => (
          <div key={c.candidature_id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-sm font-bold text-red-600 shrink-0">
                  #{idx + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{c.nom_complet}</p>
                  <p className="text-sm text-gray-500">{c.email} • {c.departement}</p>
                  {c.competences?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.competences.slice(0, 5).map(comp => (
                        <span key={comp} className={`text-xs px-2 py-0.5 rounded-full ${
                          offre?.competences_requises?.includes(comp) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>{comp}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-red-600">{c.score_ml?.toFixed(0)}%</p>
                <p className="text-xs text-gray-400 mb-2">compatibilite ML</p>
                {canEdit ? (
                  <select
                    value={c.statut}
                    onChange={e => handleStatut(c.candidature_id, e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {STATUT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUT_COLORS[c.statut] || 'bg-gray-100 text-gray-600'}`}>
                    {c.statut}
                  </span>
                )}
                {c.cv_path && (
                  <a href={`http://localhost:8002${c.cv_path}`} target="_blank" rel="noreferrer"
                    className="block mt-1 text-xs text-red-600 hover:underline">Voir CV</a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

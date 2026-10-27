import { useEffect, useState } from 'react'
import { mesCandidatures, updateStatut } from '../../api/candidatures'
import { getOffre } from '../../api/offres'
import toast from 'react-hot-toast'

const STATUT_STYLE = {
  soumise:   { cls: 'bg-yellow-100 text-yellow-700', label: 'Soumise' },
  en_cours:  { cls: 'bg-blue-100 text-blue-700',     label: 'Proposition directe' },
  entretien: { cls: 'bg-purple-100 text-purple-700', label: 'Entretien' },
  acceptee:  { cls: 'bg-green-100 text-green-700',   label: 'Acceptee' },
  refusee:   { cls: 'bg-red-100 text-red-700',       label: 'Refusee' },
}

export default function MesCandidatures() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)

  const reload = () => mesCandidatures()
    .then(async (r) => {
      const data = await Promise.all(
        r.data.map(async (c) => {
          try { const { data: o } = await getOffre(c.offre_id); return { ...c, offre: o } }
          catch { return { ...c, offre: null } }
        })
      )
      setItems(data)
    })
    .catch(() => toast.error('Erreur chargement'))
    .finally(() => setLoading(false))

  useEffect(() => { reload() }, [])

  // Répondre à une proposition directe (statut en_cours) → accepter ou refuser
  const repondre = async (cid, statut) => {
    try {
      await updateStatut(cid, { statut })
      toast.success(statut === 'acceptee' ? 'Proposition acceptee !' : 'Proposition refusee.')
      reload()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur')
    }
  }

  const propositions = items.filter(c => c.statut === 'en_cours')
  const candidatures = items.filter(c => c.statut !== 'en_cours')

  if (loading) return <div className="p-8" style={{ color: '#8C8C8C' }}>Chargement...</div>

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#1A1A1A' }}>Mes candidatures</h2>

      {/* ── Propositions directes reçues ── */}
      {propositions.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: '#E30613' }}
            />
            <h3 className="font-bold text-base" style={{ color: '#1A1A1A' }}>
              Propositions directes reçues
              <span
                className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: '#E30613' }}
              >
                {propositions.length}
              </span>
            </h3>
          </div>

          <div className="space-y-3">
            {propositions.map(c => (
              <div
                key={c.id}
                className="rounded-xl border-2 p-5"
                style={{ borderColor: '#FDE68A', backgroundColor: '#FFFDF0' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#E30613', color: 'white' }}>
                        Proposition directe
                      </span>
                    </div>
                    <h3 className="font-semibold" style={{ color: '#1A1A1A' }}>
                      {c.offre?.titre || `Offre #${c.offre_id}`}
                    </h3>
                    <p className="text-sm mt-0.5" style={{ color: '#8C8C8C' }}>
                      {c.offre?.departement} • {c.offre?.type_contrat}
                    </p>
                    <p className="text-sm mt-2" style={{ color: '#4A4A4A' }}>
                      Un responsable pedagogique vous propose directement ce poste.
                      Vous pouvez accepter ou refuser librement.
                    </p>
                    {c.score_ml > 0 && (
                      <p className="text-xs mt-1 font-semibold" style={{ color: '#E30613' }}>
                        Votre compatibilite : {c.score_ml?.toFixed(0)}%
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => repondre(c.id, 'acceptee')}
                      className="px-4 py-2 rounded-lg text-sm font-bold text-white"
                      style={{ backgroundColor: '#22c55e' }}
                    >
                      Accepter
                    </button>
                    <button
                      onClick={() => repondre(c.id, 'refusee')}
                      className="px-4 py-2 rounded-lg text-sm font-bold text-white"
                      style={{ backgroundColor: '#E30613' }}
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Candidatures normales ── */}
      <div>
        {candidatures.length > 0 && propositions.length > 0 && (
          <h3 className="font-bold text-base mb-4" style={{ color: '#1A1A1A' }}>
            Mes candidatures
          </h3>
        )}

        {candidatures.length === 0 && propositions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-3xl mb-2">📨</p>
            <p className="font-semibold" style={{ color: '#1A1A1A' }}>Aucune candidature</p>
            <p className="text-sm mt-1" style={{ color: '#8C8C8C' }}>
              Consultez les offres disponibles et postulez !
            </p>
          </div>
        )}

        <div className="space-y-4">
          {candidatures.map(c => {
            const s = STATUT_STYLE[c.statut] || { cls: 'bg-gray-100 text-gray-600', label: c.statut }
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold" style={{ color: '#1A1A1A' }}>
                      {c.offre?.titre || `Offre #${c.offre_id}`}
                    </h3>
                    <p className="text-sm mt-0.5" style={{ color: '#8C8C8C' }}>
                      {c.offre?.departement} • {c.offre?.type_contrat}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#B0B0B0' }}>
                      Soumise le {new Date(c.date_soumission).toLocaleDateString('fr-FR')}
                    </p>
                    {c.commentaire_rp && (
                      <div
                        className="mt-3 p-3 rounded-lg text-sm"
                        style={{ backgroundColor: '#F4F4F4', color: '#4A4A4A' }}
                      >
                        <span className="font-medium">Retour RP : </span>
                        {c.commentaire_rp}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full ${s.cls}`}>
                      {s.label}
                    </span>
                    {c.score_ml > 0 && (
                      <p className="text-xs mt-2" style={{ color: '#8C8C8C' }}>
                        Score ML : <span className="font-bold">{c.score_ml?.toFixed(0)}%</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { getFormations, sInscrire, mesInscriptions } from '../../api/formations'
import toast from 'react-hot-toast'

const NIVEAU_COLOR = {
  débutant:      'bg-green-100 text-green-700',
  intermediaire: 'bg-blue-100 text-blue-700',
  intermédiaire: 'bg-blue-100 text-blue-700',
  avancé:        'bg-orange-100 text-orange-700',
  expert:        'bg-red-100 text-red-700',
}

const NIVEAU_BAR = {
  débutant:      1, intermediaire: 2, intermédiaire: 2, avancé: 3, expert: 4,
}

function DetailModal({ formation, inscription, onClose, onInscrire }) {
  if (!formation) return null
  const inscrit = !!inscription
  const niveau = formation.niveau?.toLowerCase()

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                  {formation.code}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${NIVEAU_COLOR[niveau] || 'bg-gray-100 text-gray-600'}`}>
                  {formation.niveau}
                </span>
                {inscrit && (
                  <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                    Inscrit
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{formation.titre}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0">✕</button>
          </div>

          {/* Méta info */}
          <div className="flex gap-5 mt-3 text-sm text-gray-600 flex-wrap">
            {formation.duree_semaines && (
              <span className="flex items-center gap-1">
                <span className="text-base">📅</span> {formation.duree_semaines} semaines
              </span>
            )}
            {formation.badge && (
              <span className="flex items-center gap-1">
                <span className="text-base">🏅</span>
                <span className="font-semibold text-yellow-600">{formation.badge}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="text-base">📊</span>
              Niveau :&nbsp;
              <span className="flex gap-0.5">
                {[1,2,3,4].map(i => (
                  <span key={i} className={`w-2 h-2 rounded-full ${i <= (NIVEAU_BAR[niveau] || 2) ? 'bg-red-500' : 'bg-gray-200'}`} />
                ))}
              </span>
            </span>
          </div>
        </div>

        {/* Corps scrollable */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Description */}
          {formation.description && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Description</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{formation.description}</p>
            </div>
          )}

          {/* Programme */}
          {formation.programme && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Programme & Déroulement
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 rounded-xl p-4 border border-gray-100">
                {formation.programme}
              </p>
            </div>
          )}

          {/* Objectifs */}
          {formation.objectifs?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Objectifs pédagogiques
              </h3>
              <ul className="space-y-1.5">
                {formation.objectifs.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 text-red-500 shrink-0">✓</span>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prérequis */}
          {formation.prerequis?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Prérequis</h3>
              <ul className="space-y-1.5">
                {formation.prerequis.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="mt-0.5 text-orange-400 shrink-0">→</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Compétences cibles */}
          {formation.competences_cibles?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Compétences développées
              </h3>
              <div className="flex gap-2 flex-wrap">
                {formation.competences_cibles.map(c => (
                  <span key={c} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Progression si inscrit */}
          {inscrit && inscription && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-2">
                Ma progression
              </h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-green-700 font-medium">{inscription.progression}% complété</span>
                {inscription.badge_obtenu && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">
                    🏅 Badge obtenu !
                  </span>
                )}
              </div>
              <div className="h-2.5 bg-green-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${inscription.progression}%` }} />
              </div>
              <p className="text-xs text-green-600 mt-1.5">Statut : {inscription.statut}</p>
            </div>
          )}
        </div>

        {/* Footer avec action */}
        <div className="p-5 border-t border-gray-100 flex items-center justify-between gap-3">
          <button onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 text-sm text-gray-600 rounded-lg hover:bg-gray-50">
            Fermer
          </button>
          {!inscrit ? (
            <button onClick={() => { onInscrire(formation.id); onClose() }}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg">
              S'inscrire à cette formation
            </button>
          ) : (
            <span className="text-sm text-green-600 font-semibold px-5 py-2.5 bg-green-50 rounded-lg border border-green-200">
              Vous êtes inscrit(e)
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EnseignantFormations() {
  const [formations, setFormations]   = useState([])
  const [inscriptions, setInscriptions] = useState([])
  const [loading, setLoading]         = useState(true)
  const [detail, setDetail]           = useState(null)
  const [search, setSearch]           = useState('')
  const [filterNiveau, setFilterNiveau] = useState('')
  const [filterStatut, setFilterStatut] = useState('')

  const reload = () =>
    Promise.all([getFormations(), mesInscriptions()])
      .then(([f, i]) => { setFormations(f.data); setInscriptions(i.data) })
      .finally(() => setLoading(false))

  useEffect(() => { reload() }, [])

  const getInscription = (fid) => inscriptions.find(i => i.formation_id === fid)
  const isInscrit      = (fid) => !!getInscription(fid)

  const handleInscrire = async (fid) => {
    try {
      await sInscrire(fid)
      toast.success('Inscription confirmée !')
      reload()
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const niveaux = [...new Set(formations.map(f => f.niveau).filter(Boolean))]

  const visible = formations.filter(f => {
    if (filterNiveau && f.niveau !== filterNiveau) return false
    if (filterStatut === 'inscrit'     && !isInscrit(f.id)) return false
    if (filterStatut === 'non_inscrit' && isInscrit(f.id))  return false
    if (search) {
      const q = search.toLowerCase()
      return `${f.titre} ${f.code} ${f.description || ''} ${(f.competences_cibles || []).join(' ')}`.toLowerCase().includes(q)
    }
    return true
  })

  const nbInscrit = formations.filter(f => isInscrit(f.id)).length

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Catalogue de formations</h2>
        <p className="text-sm text-gray-500 mt-1">
          {formations.length} formations disponibles • {nbInscrit} inscription(s) en cours
        </p>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-red-400"
          placeholder="Rechercher une formation..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          value={filterNiveau} onChange={e => setFilterNiveau(e.target.value)}>
          <option value="">Tous les niveaux</option>
          {niveaux.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="">Toutes les formations</option>
          <option value="inscrit">Mes inscriptions</option>
          <option value="non_inscrit">Non inscrites</option>
        </select>
        <span className="text-xs text-gray-400 self-center ml-auto">{visible.length} résultat(s)</span>
      </div>

      {/* Grille */}
      {visible.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-3xl mb-2">🎓</p>
          <p className="text-sm text-gray-400">Aucune formation ne correspond à vos critères</p>
        </div>
      )}

      <div className="grid gap-4">
        {visible.map(f => {
          const insc   = getInscription(f.id)
          const inscrit = !!insc
          const niveau  = f.niveau?.toLowerCase()
          return (
            <div key={f.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Titre + badges */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-mono text-gray-400">{f.code}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${NIVEAU_COLOR[niveau] || 'bg-gray-100 text-gray-600'}`}>
                      {f.niveau}
                    </span>
                    {inscrit && (
                      <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                        Inscrit
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-800 text-base">{f.titre}</h3>

                  {/* Résumé */}
                  <div className="flex gap-4 mt-1.5 text-sm text-gray-500 flex-wrap">
                    {f.duree_semaines && <span>📅 {f.duree_semaines} semaines</span>}
                    {f.badge && <span>🏅 <span className="font-medium text-yellow-600">{f.badge}</span></span>}
                  </div>

                  {/* Description courte */}
                  {f.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{f.description}</p>
                  )}

                  {/* Objectifs (3 premiers) */}
                  {f.objectifs?.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {f.objectifs.slice(0, 2).map((o, i) => (
                        <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                          <span className="text-red-400 mt-0.5 shrink-0">✓</span>{o}
                        </li>
                      ))}
                      {f.objectifs.length > 2 && (
                        <li className="text-xs text-gray-400 italic">
                          +{f.objectifs.length - 2} objectif(s) supplémentaire(s)...
                        </li>
                      )}
                    </ul>
                  )}

                  {/* Compétences cibles (tags) */}
                  {f.competences_cibles?.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {f.competences_cibles.slice(0, 4).map(c => (
                        <span key={c} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                          {c}
                        </span>
                      ))}
                      {f.competences_cibles.length > 4 && (
                        <span className="text-xs text-gray-400">+{f.competences_cibles.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Barre de progression si inscrit */}
                  {inscrit && insc && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1 text-xs text-gray-500">
                        <span>Progression : {insc.progression}%</span>
                        {insc.badge_obtenu && <span className="text-yellow-600 font-semibold">🏅 Badge obtenu !</span>}
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${insc.progression}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => setDetail(f)}
                    className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 whitespace-nowrap">
                    Voir détails
                  </button>
                  <button
                    disabled={inscrit}
                    onClick={() => handleInscrire(f.id)}
                    className={`text-sm font-semibold px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      inscrit
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}>
                    {inscrit ? 'Inscrit ✓' : "S'inscrire"}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal détail */}
      {detail && (
        <DetailModal
          formation={detail}
          inscription={getInscription(detail.id)}
          onClose={() => setDetail(null)}
          onInscrire={handleInscrire}
        />
      )}
    </div>
  )
}

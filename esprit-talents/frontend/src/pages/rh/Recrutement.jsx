import { useEffect, useState } from 'react'
import { getOffres } from '../../api/offres'
import { getCandidatsOffre } from '../../api/offres'
import { updateStatut } from '../../api/candidatures'
import { getUsers } from '../../api/users'
import api from '../../api/client'
import toast from 'react-hot-toast'

// Etapes du pipeline d'entretien selon le spec
const PIPELINE_STEPS = [
  { key: 'soumise',   label: 'Candidature soumise', color: '#8C8C8C' },
  { key: 'en_cours',  label: 'Examen RH',            color: '#3b82f6' },
  { key: 'entretien', label: 'Entretiens',           color: '#f59e0b' },
  { key: 'acceptee',  label: 'Accepte',              color: '#22c55e' },
  { key: 'refusee',   label: 'Refuse',               color: '#E30613' },
]

const ENTRETIEN_STEPS = [
  { key: 'entretien_rh',  label: 'Entretien RH',         icon: '🧑‍💼' },
  { key: 'entretien_ped', label: 'Entretien Pedagogique', icon: '📚' },
  { key: 'entretien_tec', label: 'Entretien Technique',   icon: '💻' },
]

export default function RHRecrutement() {
  const [tab, setTab]             = useState('pipeline')
  const [offres, setOffres]       = useState([])
  const [selected, setSelected]   = useState(null)
  const [candidats, setCandidats] = useState([])
  const [enseignants, setEnseignants] = useState([])
  const [talentsPending, setTalentsPending] = useState([])
  const [entretienStates, setEntretienStates] = useState({})

  useEffect(() => {
    getOffres().then(r => setOffres(r.data)).catch(() => {})
    getUsers({ role: 'enseignant' }).then(r => {
      const all = r.data
      setEnseignants(all)
      setTalentsPending(all.filter(u => !u.is_talent))
    }).catch(() => {})
  }, [])

  const viewCandidats = async (o) => {
    setSelected(o)
    getCandidatsOffre(o.id).then(r => setCandidats(r.data)).catch(() => setCandidats([]))
  }

  const handleStatut = async (cid, statut) => {
    try {
      await updateStatut(cid, { statut })
      if (statut === 'acceptee') {
        toast.success('Candidature acceptée — candidat promu au rôle d\'Enseignant ESPRIT !', { duration: 5000 })
      } else {
        toast.success('Statut mis à jour')
      }
      viewCandidats(selected)
    } catch { toast.error('Erreur') }
  }

  const toggleEntretien = (cid, step) => {
    setEntretienStates(prev => {
      const steps = prev[cid] || []
      return {
        ...prev,
        [cid]: steps.includes(step) ? steps.filter(s => s !== step) : [...steps, step],
      }
    })
  }

  const validerTalentRH = async (ens) => {
    try {
      await api.post(`/evaluations/valider-talent/${ens.id}`, { decision: 'valider' })
      toast.success(`${ens.prenom} ${ens.nom} est maintenant Talent ESPRIT !`)
      setEnseignants(prev => prev.map(u => u.id === ens.id ? { ...u, is_talent: true, role: 'talent' } : u))
      setTalentsPending(prev => prev.filter(u => u.id !== ens.id))
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const statCount = (s) => offres.filter(o => o.statut === s).length

  const TABS = [
    { key: 'pipeline',  label: 'Pipeline recrutement', icon: '🔄' },
    { key: 'entretiens', label: 'Gestion entretiens',  icon: '🎯' },
    { key: 'talents',   label: 'Validation Talents',   icon: '⭐' },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Chef Departement Administratif (RH)</h2>
        <p className="text-sm mt-1" style={{ color: '#8C8C8C' }}>
          Recrutement • Entretiens • Validation des Talents
        </p>
      </div>

      <div className="flex gap-1 mb-7 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: tab === t.key ? '#E30613' : 'transparent', color: tab === t.key ? '#fff' : '#4A4A4A' }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── Pipeline recrutement ── */}
      {tab === 'pipeline' && (
        <div>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              ['Offres ouvertes', statCount('ouverte'), '#22c55e'],
              ['En cours',        statCount('fermee'),  '#3b82f6'],
              ['Pourvues',        statCount('pourvue'), '#8b5cf6'],
              ['Total offres',    offres.length,        '#E30613'],
            ].map(([lbl, val, color]) => (
              <div key={lbl} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-3xl font-bold" style={{ color }}>{val}</p>
                <p className="text-xs mt-1 font-medium" style={{ color: '#8C8C8C' }}>{lbl}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-5">
            {/* Liste offres */}
            <div className="w-72 space-y-2 shrink-0">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8C8C8C' }}>Offres</p>
              {offres.map(o => {
                const active = selected?.id === o.id
                return (
                  <button key={o.id} onClick={() => viewCandidats(o)}
                    className="w-full text-left bg-white rounded-xl border p-4 hover:shadow-md transition-all"
                    style={{ borderColor: active ? '#E30613' : '#E8E8E8', borderWidth: active ? '2px' : '1px' }}>
                    <p className="font-medium text-sm line-clamp-1" style={{ color: '#1A1A1A' }}>{o.titre}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#8C8C8C' }}>{o.departement}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        o.statut === 'ouverte' ? 'bg-green-100 text-green-700' :
                        o.statut === 'pourvue' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{o.statut}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Candidats de l'offre */}
            {selected ? (
              <div className="flex-1">
                <h3 className="font-semibold mb-1" style={{ color: '#1A1A1A' }}>{selected.titre}</h3>
                <p className="text-sm mb-4" style={{ color: '#8C8C8C' }}>{candidats.length} candidat(s) — tries par score ML</p>

                {/* Pipeline visuel */}
                <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-2">
                  {PIPELINE_STEPS.map((s, i) => (
                    <div key={s.key} className="flex items-center gap-2 shrink-0">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: s.color }}>
                          {candidats.filter(c => c.statut === s.key).length}
                        </div>
                        <p className="text-xs mt-1 text-center w-20" style={{ color: '#8C8C8C' }}>{s.label}</p>
                      </div>
                      {i < PIPELINE_STEPS.length - 1 && (
                        <div className="w-8 h-px mb-5" style={{ backgroundColor: '#E0E0E0' }} />
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {candidats.map((c, idx) => (
                    <div key={c.candidature_id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                            style={{ backgroundColor: '#E30613' }}>
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>{c.nom_complet}</p>
                            <p className="text-xs" style={{ color: '#8C8C8C' }}>{c.email} • Score ML : {c.score_ml?.toFixed(0)}%</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-2xl font-bold" style={{ color: '#E30613' }}>{c.score_ml?.toFixed(0)}%</p>
                            <p className="text-xs" style={{ color: '#8C8C8C' }}>compatibilite</p>
                          </div>
                          <select value={c.statut} onChange={e => handleStatut(c.candidature_id, e.target.value)}
                            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400">
                            {PIPELINE_STEPS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  {candidats.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">Aucun candidat pour cette offre.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm" style={{ color: '#8C8C8C' }}>
                Selectionnez une offre pour voir ses candidats
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Gestion entretiens ── */}
      {tab === 'entretiens' && (
        <div>
          <p className="text-sm mb-5" style={{ color: '#8C8C8C' }}>
            Selectionnez une offre, choisissez les candidats en entretien et suivez les 3 etapes (RH → Pedagogique → Technique).
          </p>

          {/* Sélection offre */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {offres.map(o => (
              <button key={o.id} onClick={() => viewCandidats(o)}
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                style={{
                  borderColor: selected?.id === o.id ? '#E30613' : '#E0E0E0',
                  color: selected?.id === o.id ? '#E30613' : '#4A4A4A',
                  backgroundColor: selected?.id === o.id ? '#FFF0F0' : 'white',
                }}>
                {o.titre}
              </button>
            ))}
          </div>

          {selected && (
            <div className="space-y-4">
              {candidats.filter(c => ['entretien','en_cours'].includes(c.statut)).map(c => (
                <div key={c.candidature_id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-semibold" style={{ color: '#1A1A1A' }}>{c.nom_complet}</p>
                      <p className="text-xs" style={{ color: '#8C8C8C' }}>{c.email}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                      En entretien
                    </span>
                  </div>

                  {/* 3 étapes entretien */}
                  <div className="grid grid-cols-3 gap-3">
                    {ENTRETIEN_STEPS.map(step => {
                      const done = (entretienStates[c.candidature_id] || []).includes(step.key)
                      return (
                        <button
                          key={step.key}
                          onClick={() => toggleEntretien(c.candidature_id, step.key)}
                          className="flex items-center gap-2 p-3 rounded-xl border transition-all text-left"
                          style={{
                            borderColor: done ? '#22c55e' : '#E0E0E0',
                            backgroundColor: done ? '#F0FDF4' : '#F9FAFB',
                          }}
                        >
                          <span className="text-lg">{step.icon}</span>
                          <div>
                            <p className="text-xs font-semibold" style={{ color: done ? '#15803D' : '#1A1A1A' }}>
                              {step.label}
                            </p>
                            <p className="text-xs" style={{ color: done ? '#22c55e' : '#8C8C8C' }}>
                              {done ? 'Valide ✓' : 'A faire'}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Actions finales */}
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => handleStatut(c.candidature_id, 'acceptee')}
                      className="flex-1 py-2 rounded-lg text-sm font-medium text-white font-semibold"
                      style={{ backgroundColor: '#22c55e' }}>
                      ✓ Accepter → Promouvoir Enseignant
                    </button>
                    <button onClick={() => handleStatut(c.candidature_id, 'refusee')}
                      className="flex-1 py-2 rounded-lg text-sm font-medium text-white"
                      style={{ backgroundColor: '#E30613' }}>
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
              {candidats.filter(c => ['entretien','en_cours'].includes(c.statut)).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">
                  Aucun candidat en phase d'entretien pour cette offre.<br />
                  Passez des candidats en statut "Entretiens" depuis le pipeline.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Validation Talents ── */}
      {tab === 'talents' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-2">
            <h3 className="font-semibold mb-1" style={{ color: '#1A1A1A' }}>Role du RH dans la gestion des Talents</h3>
            <p className="text-sm" style={{ color: '#4A4A4A' }}>
              Apres reception d'une recommandation (de la DG, d'un RP ou de la Direction des Etudes),
              analysez le profil complet de l'enseignant et soumettez-le a la Direction Generale pour validation finale.
            </p>
          </div>

          {enseignants.map(ens => (
            <div key={ens.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ backgroundColor: ens.is_talent ? '#f59e0b' : '#E30613' }}>
                  {ens.is_talent ? '★' : `${ens.prenom?.[0]}${ens.nom?.[0]}`}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: '#1A1A1A' }}>
                    {ens.prenom} {ens.nom}
                    {ens.is_talent && <span className="ml-2 text-yellow-500 text-sm">★ Talent</span>}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#8C8C8C' }}>
                    {ens.departement} • {ens.specialite || 'Generaliste'}
                  </p>
                  {ens.competences?.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {ens.competences.slice(0, 4).map(c => (
                        <span key={c} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {!ens.is_talent ? (
                  <button onClick={() => validerTalentRH(ens)}
                    className="text-xs px-4 py-2 rounded-lg font-medium text-white"
                    style={{ backgroundColor: '#E30613' }}>
                    Valider Talent
                  </button>
                ) : (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full font-semibold">
                    ★ Talent valide
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

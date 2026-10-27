import { useEffect, useState } from 'react'
import { getUsers } from '../../api/users'
import { getOffres } from '../../api/offres'
import { getEvaluations, statsEnseignant } from '../../api/evaluations'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/client'
import toast from 'react-hot-toast'

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"

export default function RPChefDashboard() {
  const { user } = useAuth()
  const [tab, setTab]             = useState('dashboard')
  const [enseignants, setEnseignants] = useState([])
  const [offres, setOffres]       = useState([])
  const [selectedProfil, setSelectedProfil] = useState(null)
  const [profilEvals, setProfilEvals] = useState([])
  const [profilStats, setProfilStats] = useState(null)
  const [demandes, setDemandes]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('demandes_poste') || '[]') } catch { return [] }
  })

  const reload = () => Promise.all([
    getUsers({ role: 'enseignant', departement: user?.departement }),
    getUsers({ role: 'talent', departement: user?.departement }),
    getOffres({ departement: user?.departement }),
  ]).then(([ens, tal, o]) => {
    setEnseignants([...ens.data, ...tal.data])
    setOffres(o.data)
  }).catch(() => {})

  useEffect(() => { reload() }, [])

  const viewProfil = async (ens) => {
    setSelectedProfil(ens)
    setTab('profils')
    const [e, s] = await Promise.all([
      getEvaluations({ enseignant_id: ens.id }),
      statsEnseignant(ens.id),
    ])
    setProfilEvals(e.data)
    setProfilStats(s.data)
  }

  const traitDemande = (id, statut) => {
    const updated = demandes.map(d => d.id === id ? { ...d, statut } : d)
    setDemandes(updated)
    localStorage.setItem('demandes_poste', JSON.stringify(updated))
    toast.success(statut === 'acceptee' ? 'Demande acceptee — le RP peut publier l\'offre' : 'Demande refusee')
  }

  const recommanderTalent = async (ens) => {
    try {
      await api.post('/notifications', {
        user_id: ens.id, title: 'Recommandation Talent du Chef Departement',
        body: `Le Chef de Departement vous recommande pour le statut Talent ESPRIT.`,
        type: 'success', link: '/evaluations',
      }).catch(() => {})
      toast.success(`${ens.prenom} ${ens.nom} recommande au RH`)
    } catch { toast.error('Erreur') }
  }

  const exportRapport = async (ens) => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(
        `http://localhost:8002/rapports/${ens.id}/profil-pdf`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `rapport_${ens.nom}_${ens.prenom}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Rapport PDF exporte !')
    } catch (e) {
      toast.error('Erreur export PDF : ' + e.message)
    }
  }

  const demandesDept = demandes.filter(d => d.dept === user?.departement)
  const demandesEnAttente = demandesDept.filter(d => d.statut === 'en_attente')

  const TABS = [
    { key: 'dashboard',  label: 'Tableau de bord', icon: '📊' },
    { key: 'demandes',   label: `Demandes${demandesEnAttente.length > 0 ? ` (${demandesEnAttente.length})` : ''}`, icon: '📝' },
    { key: 'profils',    label: 'Profils',          icon: '👥' },
    { key: 'evaluations',label: 'Evaluations',      icon: '⭐' },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Chef de Departement Pedagogique</h2>
        <p className="text-sm mt-1" style={{ color: '#8C8C8C' }}>{user?.departement}</p>
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

      {/* ── Dashboard ── */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Enseignants',    enseignants.length,                          '#E30613'],
              ['Talents',        enseignants.filter(e => e.is_talent).length, '#f59e0b'],
              ['Offres actives', offres.filter(o => o.statut === 'ouverte').length, '#22c55e'],
              ['Demandes RP',    demandesEnAttente.length,                    '#3b82f6'],
            ].map(([lbl, val, color]) => (
              <div key={lbl} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-3xl font-bold" style={{ color }}>{val}</p>
                <p className="text-xs mt-1 font-medium" style={{ color: '#8C8C8C' }}>{lbl}</p>
              </div>
            ))}
          </div>

          {demandesEnAttente.length > 0 && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#FDE68A', backgroundColor: '#FFFDF0' }}>
              <h3 className="font-semibold mb-3" style={{ color: '#B45309' }}>
                ⚠ {demandesEnAttente.length} demande(s) de poste en attente de validation
              </h3>
              <button onClick={() => setTab('demandes')} className="text-sm font-medium" style={{ color: '#E30613' }}>
                Traiter les demandes →
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-4" style={{ color: '#1A1A1A' }}>Equipe enseignante</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {enseignants.map(e => (
                <button key={e.id} onClick={() => viewProfil(e)}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-red-300 hover:shadow-sm transition-all text-left">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: e.is_talent ? '#f59e0b' : '#E30613' }}>
                    {e.is_talent ? '★' : `${e.prenom?.[0]}${e.nom?.[0]}`}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: '#1A1A1A' }}>{e.prenom} {e.nom}</p>
                    <p className="text-xs truncate" style={{ color: '#8C8C8C' }}>{e.specialite || e.departement}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Demandes RP ── */}
      {tab === 'demandes' && (
        <div className="space-y-3">
          {demandesDept.length === 0 && (
            <p className="text-sm text-gray-400">Aucune demande de poste recue.</p>
          )}
          {demandesDept.map(d => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold" style={{ color: '#1A1A1A' }}>{d.titre}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      d.statut === 'en_attente' ? 'bg-yellow-100 text-yellow-700' :
                      d.statut === 'acceptee'   ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {d.statut === 'en_attente' ? 'En attente' : d.statut === 'acceptee' ? 'Acceptee' : 'Refusee'}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: '#4A4A4A' }}>{d.justification}</p>
                  <p className="text-xs mt-1" style={{ color: '#8C8C8C' }}>{d.nb_postes} poste(s) • {d.date}</p>
                </div>
                {d.statut === 'en_attente' && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => traitDemande(d.id, 'acceptee')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#22c55e' }}>
                      Accepter
                    </button>
                    <button onClick={() => traitDemande(d.id, 'refusee')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#E30613' }}>
                      Refuser
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Profils ── */}
      {tab === 'profils' && (
        <div className="flex gap-6">
          <div className="w-64 space-y-2 shrink-0">
            {enseignants.map(e => (
              <button key={e.id} onClick={() => viewProfil(e)}
                className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border text-left hover:shadow-sm transition-all"
                style={{ borderColor: selectedProfil?.id === e.id ? '#E30613' : '#E8E8E8' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: e.is_talent ? '#f59e0b' : '#E30613' }}>
                  {e.is_talent ? '★' : `${e.prenom?.[0]}${e.nom?.[0]}`}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: '#1A1A1A' }}>{e.prenom} {e.nom}</p>
                  <p className="text-xs" style={{ color: '#8C8C8C' }}>{e.role}</p>
                </div>
              </button>
            ))}
          </div>

          {selectedProfil ? (
            <div className="flex-1 space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white"
                      style={{ backgroundColor: selectedProfil.is_talent ? '#f59e0b' : '#E30613' }}>
                      {selectedProfil.is_talent ? '★' : `${selectedProfil.prenom?.[0]}${selectedProfil.nom?.[0]}`}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>
                        {selectedProfil.prenom} {selectedProfil.nom}
                        {selectedProfil.is_talent && <span className="ml-2 text-yellow-500 text-base">★ Talent</span>}
                      </h3>
                      <p className="text-sm" style={{ color: '#8C8C8C' }}>{selectedProfil.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!selectedProfil.is_talent && (
                      <button onClick={() => recommanderTalent(selectedProfil)}
                        className="text-xs px-3 py-1.5 rounded-lg border font-medium"
                        style={{ borderColor: '#E30613', color: '#E30613' }}>
                        Recommander Talent
                      </button>
                    )}
                    <button onClick={() => exportRapport(selectedProfil)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
                      style={{ backgroundColor: '#1A1A1A' }}>
                      Exporter rapport
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                  {[
                    ['Departement', selectedProfil.departement],
                    ['Specialite',  selectedProfil.specialite || '—'],
                    ['Telephone',   selectedProfil.telephone || '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs" style={{ color: '#8C8C8C' }}>{k}</p>
                      <p className="font-semibold mt-0.5 text-sm truncate" style={{ color: '#1A1A1A' }}>{v}</p>
                    </div>
                  ))}
                </div>

                {profilStats && profilStats.nb_evaluations > 0 && (
                  <div className="grid grid-cols-5 gap-3 mb-4">
                    {[
                      ['Moyenne', `${profilStats.moyenne_globale}/20`, '#E30613'],
                      ['Pedagogie', `${profilStats.moyenne_pedagogie}/20`, '#3b82f6'],
                      ['Ponctualite', `${profilStats.moyenne_ponctualite}/20`, '#22c55e'],
                      ['Engagement', `${profilStats.moyenne_engagement}/20`, '#f59e0b'],
                      ['Innovation', `${profilStats.moyenne_innovation}/20`, '#8b5cf6'],
                    ].map(([lbl, val, color]) => (
                      <div key={lbl} className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="font-bold text-lg" style={{ color }}>{val}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#8C8C8C' }}>{lbl}</p>
                      </div>
                    ))}
                  </div>
                )}

                {selectedProfil.competences?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: '#8C8C8C' }}>Competences</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfil.competences.map(c => (
                        <span key={c} className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{ backgroundColor: '#FFF0F0', color: '#E30613' }}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProfil.cv_path && (
                  <a href={`http://localhost:8002${selectedProfil.cv_path}`} target="_blank" rel="noreferrer"
                    className="inline-block mt-4 text-sm font-medium px-4 py-2 rounded-lg border"
                    style={{ borderColor: '#E30613', color: '#E30613' }}>
                    Voir le CV →
                  </a>
                )}
              </div>

              {profilEvals.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="font-semibold mb-3" style={{ color: '#1A1A1A' }}>Historique des evaluations</h4>
                  <div className="space-y-3">
                    {profilEvals.map(ev => (
                      <div key={ev.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{ev.annee_academique} — {ev.semestre}</span>
                        <span className="font-bold text-lg" style={{ color: '#E30613' }}>{ev.note_globale}/20</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: '#8C8C8C' }}>
              Selectionnez un enseignant pour voir son profil complet
            </div>
          )}
        </div>
      )}

      {/* ── Evaluations globales ── */}
      {tab === 'evaluations' && (
        <div>
          <p className="text-sm mb-4" style={{ color: '#8C8C8C' }}>
            Cliquez sur un enseignant pour voir ses evaluations et acceder a son profil.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {enseignants.map(e => (
              <button key={e.id} onClick={() => viewProfil(e)}
                className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-red-300 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: e.is_talent ? '#f59e0b' : '#E30613' }}>
                    {e.is_talent ? '★' : `${e.prenom?.[0]}${e.nom?.[0]}`}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>{e.prenom} {e.nom}</p>
                    <p className="text-xs" style={{ color: '#8C8C8C' }}>{e.specialite}</p>
                  </div>
                </div>
                <p className="text-xs font-medium" style={{ color: '#E30613' }}>Voir les evaluations →</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

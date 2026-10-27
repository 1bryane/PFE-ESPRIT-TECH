import { useEffect, useState, useCallback } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'

const ROLES_STAFF = ['enseignant','talent','cup','rp_coord','chef_dept','rp_chef',
                     'direction_etudes','direction','direction_dept','rdff','responsable','cps','charge_mission']

const ROLE_LABEL = {
  enseignant:       'Enseignant',
  talent:           'Talent ESPRIT',
  cup:              'CUP',
  rp_coord:         'CUP (rp_coord)',
  chef_dept:        'Chef Département',
  rp_chef:          'Chef Dept. (rp_chef)',
  direction_etudes: 'Direction des Études',
  direction:        'Direction Générale',
  direction_dept:   'Direction Dép.',
  rdff:             'Resp. Formations',
  responsable:      'Responsable',
  cps:              'CPS',
  charge_mission:   'Chargé de Mission',
}

const ROLE_COLOR = {
  enseignant:       'bg-blue-100 text-blue-700',
  talent:           'bg-yellow-100 text-yellow-700',
  cup:              'bg-cyan-100 text-cyan-700',
  rp_coord:         'bg-cyan-100 text-cyan-700',
  chef_dept:        'bg-violet-100 text-violet-700',
  rp_chef:          'bg-violet-100 text-violet-700',
  direction_etudes: 'bg-orange-100 text-orange-700',
  direction:        'bg-red-100 text-red-700',
  direction_dept:   'bg-red-50 text-red-600',
  rdff:             'bg-green-100 text-green-700',
  responsable:      'bg-gray-100 text-gray-600',
  cps:              'bg-gray-100 text-gray-600',
  charge_mission:   'bg-gray-100 text-gray-600',
}

const DIM_LABELS = {
  moyenne_pedagogie:        'Pédagogie',
  moyenne_ponctualite:      'Ponctualité',
  moyenne_engagement:       'Engagement',
  moyenne_innovation:       'Innovation',
  moyenne_scientifique:     'Scientifique',
  moyenne_communicationnel: 'Communication',
}

function ScoreBar({ label, value, max = 20 }) {
  const pct = Math.min((value / max) * 100, 100)
  const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-xs font-semibold text-gray-800">{value ? value.toFixed(1) : '—'}/20</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function Avatar({ user, size = 'md' }) {
  const sz = size === 'lg' ? 'w-14 h-14 text-lg' : 'w-9 h-9 text-sm'
  const initials = `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`
  if (user.photo_path) {
    return <img src={user.photo_path} alt={initials}
      className={`${sz} rounded-full object-cover shrink-0`} />
  }
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
      style={{ backgroundColor: user.is_talent ? '#f59e0b' : '#E30613' }}>
      {user.is_talent ? '★' : initials}
    </div>
  )
}

export default function RHEffectifs() {
  const [staff, setStaff]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(null)
  const [evalStats, setEvalStats]   = useState(null)
  const [evaluations, setEvaluations] = useState([])
  const [recos, setRecos]           = useState([])
  const [plans, setPlans]           = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Filtres
  const [search, setSearch]         = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterTalent, setFilterTalent] = useState('')

  const loadStaff = useCallback(async () => {
    try {
      const r = await api.get('/users')
      const filtered = r.data.filter(u => ROLES_STAFF.includes(u.role))
      setStaff(filtered)
    } catch { toast.error('Impossible de charger les effectifs') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadStaff() }, [loadStaff])

  const loadDetail = useCallback(async (user) => {
    setSelected(user)
    setEvalStats(null)
    setEvaluations([])
    setRecos([])
    setPlans([])
    setLoadingDetail(true)
    try {
      const [statsR, evalsR, recosR, plansR] = await Promise.allSettled([
        api.get(`/evaluations/stats/${user.id}`),
        api.get('/evaluations', { params: { enseignant_id: user.id } }),
        api.get('/recommandations', { params: { enseignant_id: user.id } }),
        api.get('/plans-carriere', { params: { enseignant_id: user.id } }),
      ])
      if (statsR.status === 'fulfilled') setEvalStats(statsR.value.data)
      if (evalsR.status === 'fulfilled') setEvaluations(evalsR.value.data)
      if (recosR.status === 'fulfilled') setRecos(recosR.value.data)
      if (plansR.status === 'fulfilled') setPlans(plansR.value.data)
    } finally { setLoadingDetail(false) }
  }, [])

  const validerTalent = async (user) => {
    try {
      await api.post(`/evaluations/valider-talent/${user.id}`, { decision: 'valider' })
      toast.success(`${user.prenom} ${user.nom} est maintenant Talent ESPRIT !`)
      setSelected(prev => ({ ...prev, is_talent: true, role: 'talent' }))
      setStaff(prev => prev.map(u => u.id === user.id ? { ...u, is_talent: true, role: 'talent' } : u))
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  // Listes dériviées
  const depts = [...new Set(staff.map(u => u.departement).filter(Boolean))].sort()

  const visible = staff.filter(u => {
    if (filterRole && u.role !== filterRole) return false
    if (filterDept && u.departement !== filterDept) return false
    if (filterTalent === 'talent' && !u.is_talent) return false
    if (filterTalent === 'non_talent' && u.is_talent) return false
    if (search) {
      const q = search.toLowerCase()
      return `${u.prenom} ${u.nom} ${u.email} ${u.departement || ''}`.toLowerCase().includes(q)
    }
    return true
  })

  // KPIs
  const nbTalents   = staff.filter(u => u.is_talent).length
  const nbEnsTotal  = staff.filter(u => ['enseignant','talent'].includes(u.role)).length
  const avgScore    = staff.length
    ? (staff.reduce((s, u) => s + (u.score_global || 0), 0) / staff.length).toFixed(1)
    : 0

  if (loading) return <div className="p-8 text-gray-400">Chargement des effectifs...</div>

  return (
    <div className="p-8 h-full flex flex-col">

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gestion des Effectifs</h2>
        <p className="text-sm text-gray-500 mt-1">
          Vue consolidée du personnel — profil, évaluations et recommandations pour la prise de décision RH
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6 shrink-0">
        {[
          ['Total effectif', staff.length, '#3b82f6'],
          ['Enseignants / Talents', nbEnsTotal, '#8b5cf6'],
          ['Talents validés', nbTalents, '#f59e0b'],
          ['Score moyen', avgScore + ' / 20', '#22c55e'],
        ].map(([lbl, val, color]) => (
          <div key={lbl} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-2xl font-bold" style={{ color }}>{val}</p>
            <p className="text-xs mt-1 text-gray-400 font-medium">{lbl}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-5 shrink-0 flex-wrap">
        <input
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-red-400"
          placeholder="Rechercher par nom, email..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Tous les rôles</option>
          {ROLES_STAFF.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">Tous les départements</option>
          {depts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          value={filterTalent} onChange={e => setFilterTalent(e.target.value)}>
          <option value="">Tous statuts</option>
          <option value="talent">Talents uniquement</option>
          <option value="non_talent">Non-talents</option>
        </select>
        <span className="text-xs text-gray-400 self-center ml-auto">{visible.length} résultat(s)</span>
      </div>

      {/* Corps principal */}
      <div className="flex gap-5 flex-1 min-h-0">

        {/* Liste */}
        <div className="w-80 shrink-0 overflow-y-auto space-y-2 pr-1">
          {visible.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">Aucun résultat</p>
          )}
          {visible.map(u => (
            <button key={u.id} onClick={() => loadDetail(u)}
              className="w-full text-left bg-white rounded-xl border p-4 hover:shadow-md transition-all"
              style={{
                borderColor: selected?.id === u.id ? '#E30613' : '#E8E8E8',
                borderWidth: selected?.id === u.id ? '2px' : '1px',
              }}>
              <div className="flex items-center gap-3">
                <Avatar user={u} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm text-gray-800 truncate">
                      {u.prenom} {u.nom}
                    </p>
                    {u.is_talent && <span className="text-yellow-500 text-xs">★</span>}
                  </div>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${ROLE_COLOR[u.role] || 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABEL[u.role] || u.role}
                  </span>
                  {u.departement && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{u.departement}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold" style={{ color: '#E30613' }}>
                    {u.score_global ? u.score_global.toFixed(1) : '—'}
                  </p>
                  <p className="text-xs text-gray-400">/20</p>
                </div>
              </div>
              {u.competences?.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {u.competences.slice(0, 3).map(c => (
                    <span key={c} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{c}</span>
                  ))}
                  {u.competences.length > 3 && (
                    <span className="text-xs text-gray-400">+{u.competences.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Panneau détail */}
        {selected ? (
          <div className="flex-1 overflow-y-auto space-y-5">
            {loadingDetail ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                Chargement du profil...
              </div>
            ) : (
              <>
                {/* En-tête profil */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start gap-5">
                    <Avatar user={selected} size="lg" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-xl font-bold text-gray-800">
                          {selected.prenom} {selected.nom}
                        </h3>
                        {selected.is_talent && (
                          <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                            ★ Talent ESPRIT
                          </span>
                        )}
                        <span className={`text-xs font-medium px-2 py-1 rounded ${ROLE_COLOR[selected.role] || 'bg-gray-100 text-gray-600'}`}>
                          {ROLE_LABEL[selected.role] || selected.role}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{selected.email}</p>
                      <div className="flex gap-4 mt-2 text-sm text-gray-600 flex-wrap">
                        {selected.departement && <span>📍 {selected.departement}</span>}
                        {selected.specialite  && <span>🎯 {selected.specialite}</span>}
                        {selected.telephone   && <span>📞 {selected.telephone}</span>}
                        {selected.sous_role   && <span>🏷️ {selected.sous_role.replace(/_/g, ' ')}</span>}
                      </div>
                      {selected.competences?.length > 0 && (
                        <div className="flex gap-1.5 mt-3 flex-wrap">
                          {selected.competences.map(c => (
                            <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-center shrink-0">
                      <p className="text-4xl font-bold" style={{ color: '#E30613' }}>
                        {selected.score_global ? selected.score_global.toFixed(1) : '—'}
                      </p>
                      <p className="text-xs text-gray-400">Score global / 20</p>
                      <div className="flex gap-2 mt-3 flex-col">
                        {selected.cv_path && (
                          <a href={selected.cv_path} target="_blank" rel="noreferrer"
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
                            Voir CV
                          </a>
                        )}
                        {['enseignant'].includes(selected.role) && (
                          <button onClick={() => validerTalent(selected)}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
                            style={{ backgroundColor: '#E30613' }}>
                            Valider Talent
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Évaluations — scores par dimension */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-800">Évaluations ({evalStats?.nb_evaluations || 0})</h4>
                    {evalStats?.nb_evaluations > 0 && (
                      <span className="text-xs text-gray-400">
                        Basé sur {evalStats.nb_evaluations} évaluation(s)
                      </span>
                    )}
                  </div>
                  {(!evalStats || evalStats.nb_evaluations === 0) ? (
                    <p className="text-sm text-gray-400 py-4 text-center">Aucune évaluation disponible</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      {Object.entries(DIM_LABELS).map(([key, label]) => (
                        <ScoreBar key={key} label={label} value={evalStats[key]} />
                      ))}
                    </div>
                  )}

                  {/* Dernières évaluations */}
                  {evaluations.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Historique des évaluations
                      </p>
                      <div className="space-y-2">
                        {evaluations.slice(0, 3).map(ev => (
                          <div key={ev.id} className="flex items-start justify-between bg-gray-50 rounded-lg p-3">
                            <div>
                              <p className="text-xs font-medium text-gray-700">
                                {ev.annee_academique} — {ev.semestre || 'S1'}
                              </p>
                              {ev.commentaire && (
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ev.commentaire}</p>
                              )}
                              {ev.points_forts?.length > 0 && (
                                <p className="text-xs text-green-600 mt-1">
                                  + {ev.points_forts.join(', ')}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-bold ml-3 shrink-0" style={{ color: '#E30613' }}>
                              {ev.note_globale?.toFixed(1)}/20
                            </span>
                          </div>
                        ))}
                        {evaluations.length > 3 && (
                          <p className="text-xs text-gray-400 text-center">{evaluations.length - 3} évaluation(s) supplémentaire(s)</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommandations */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="font-semibold text-gray-800 mb-3">
                    Recommandations Talent ({recos.length})
                  </h4>
                  {recos.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2 text-center">Aucune recommandation</p>
                  ) : (
                    <div className="space-y-3">
                      {recos.map(r => (
                        <div key={r.id} className="border border-gray-100 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-xs font-semibold text-gray-700">{r.annee_academique}</p>
                              <p className="text-xs text-gray-400">
                                Par : {r.recommandant?.prenom} {r.recommandant?.nom}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-yellow-600">
                                {r.score_moyen?.toFixed(1)}<span className="text-xs text-gray-400">/5</span>
                              </p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                r.statut === 'validee'   ? 'bg-green-100 text-green-700' :
                                r.statut === 'refusee'   ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>{r.statut}</span>
                            </div>
                          </div>
                          {r.commentaire_global && (
                            <p className="text-xs text-gray-500 italic line-clamp-2">{r.commentaire_global}</p>
                          )}
                          <div className="grid grid-cols-5 gap-1 mt-2">
                            {[
                              ['Sci.', r.dim_scientifique],
                              ['Péd.', r.dim_pedagogique],
                              ['Com.', r.dim_communicationnel],
                              ['Comp.', r.dim_comportemental],
                              ['Aut.', r.dim_autres],
                            ].map(([lbl, val]) => (
                              <div key={lbl} className="text-center bg-gray-50 rounded p-1">
                                <p className="text-xs font-bold text-gray-700">{val?.toFixed(1)}</p>
                                <p className="text-xs text-gray-400">{lbl}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Plans de carrière */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="font-semibold text-gray-800 mb-3">
                    Plans de carrière ({plans.length})
                  </h4>
                  {plans.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2 text-center">Aucun plan de carrière</p>
                  ) : (
                    <div className="space-y-2">
                      {plans.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{p.titre}</p>
                            <p className="text-xs text-gray-400">
                              {p.type_plan?.replace(/_/g,' ')}
                              {p.initie_par_enseignant ? ' · Voie A (demande)' : ' · Voie B (manager)'}
                            </p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${
                            p.statut === 'realise'    ? 'bg-green-100 text-green-700' :
                            p.statut === 'en_cours'   ? 'bg-blue-100 text-blue-700' :
                            p.statut === 'en_attente' ? 'bg-yellow-100 text-yellow-700' :
                            p.statut === 'refuse'     ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>{p.statut}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-gray-200">
            <p className="text-4xl mb-3">👤</p>
            <p className="text-sm font-medium">Sélectionnez un membre du personnel</p>
            <p className="text-xs mt-1">pour consulter son profil complet et ses évaluations</p>
          </div>
        )}
      </div>
    </div>
  )
}

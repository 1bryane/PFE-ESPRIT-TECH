import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOffres, createOffre, updateOffre } from '../../api/offres'
import { getUsers } from '../../api/users'
import { getEvaluations, createEvaluation } from '../../api/evaluations'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/client'
import toast from 'react-hot-toast'

const STATUT_STYLE = {
  ouverte:  { bg: '#F0FDF4', text: '#15803D', label: 'En cours' },
  fermee:   { bg: '#F9FAFB', text: '#6B7280', label: 'Cloturee' },
  pourvue:  { bg: '#EFF6FF', text: '#1D4ED8', label: 'Pourvue' },
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"

export default function RPCoordOffres() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab]         = useState('offres')
  const [offres, setOffres]   = useState([])
  const [enseignants, setEnseignants] = useState([])
  const [filterUnite, setFilterUnite] = useState(false)
  const [evals, setEvals]     = useState([])
  const [showOffreForm, setShowOffreForm] = useState(false)
  const [showDemandeForm, setShowDemandeForm] = useState(false)
  const [showEvalForm, setShowEvalForm] = useState(false)
  const [selectedEns, setSelectedEns] = useState(null)
  const [demandes, setDemandes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('demandes_poste') || '[]') } catch { return [] }
  })

  const [offreForm, setOffreForm] = useState({
    titre: '', description: '', departement: user?.departement || '',
    type_contrat: 'CDI', competences_requises: '', nb_postes: 1,
  })
  const [demandeForm, setDemandeForm] = useState({ titre: '', justification: '', nb_postes: 1 })
  const [evalForm, setEvalForm] = useState({
    annee_academique: '2024-2025', semestre: 'S1',
    note_pedagogie: '', note_ponctualite: '', note_engagement: '', note_innovation: '',
    commentaire: '', points_forts: '', axes_amelioration: '',
  })

  const reload = () => Promise.all([
    getOffres({ departement: user?.departement }),
    getUsers({ role: 'enseignant', departement: user?.departement }),
    getUsers({ role: 'talent', departement: user?.departement }),
    getEvaluations({ departement: user?.departement }),
  ]).then(([o, ens, tal, e]) => {
    setOffres(o.data)
    setEnseignants([...ens.data, ...tal.data])
    setEvals(e.data)
  }).catch(() => {})

  useEffect(() => { reload() }, [])

  const handleCreateOffre = async (e) => {
    e.preventDefault()
    try {
      await createOffre({
        ...offreForm,
        competences_requises: offreForm.competences_requises.split(',').map(s => s.trim()).filter(Boolean),
      })
      toast.success('Offre publiee !')
      setShowOffreForm(false)
      reload()
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const handleDemande = (e) => {
    e.preventDefault()
    const d = { id: Date.now(), ...demandeForm, statut: 'en_attente', dept: user?.departement, date: new Date().toLocaleDateString('fr-FR') }
    const saved = [...demandes, d]
    setDemandes(saved)
    localStorage.setItem('demandes_poste', JSON.stringify(saved))
    toast.success('Demande envoyee au Chef de Departement')
    setShowDemandeForm(false)
    setDemandeForm({ titre: '', justification: '', nb_postes: 1 })
  }

  const handleEval = async (e) => {
    e.preventDefault()
    try {
      await createEvaluation({
        enseignant_id:     selectedEns.id,
        annee_academique:  evalForm.annee_academique,
        semestre:          evalForm.semestre,
        note_pedagogie:    +evalForm.note_pedagogie   || null,
        note_ponctualite:  +evalForm.note_ponctualite  || null,
        note_engagement:   +evalForm.note_engagement   || null,
        note_innovation:   +evalForm.note_innovation   || null,
        commentaire:       evalForm.commentaire,
        points_forts:      evalForm.points_forts.split('\n').filter(Boolean),
        axes_amelioration: evalForm.axes_amelioration.split('\n').filter(Boolean),
      })
      toast.success('Evaluation enregistree !')
      setShowEvalForm(false)
      reload()
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const recommanderTalent = async (ens) => {
    try {
      await api.post('/recommandations', {
        enseignant_id:          ens.id,
        dim_scientifique:       4,
        dim_pedagogique:        4,
        dim_communicationnel:   4,
        dim_comportemental:     4,
        dim_autres:             4,
        commentaire_global:     'Recommandation du Coordinateur d\'Unité Pédagogique pour le statut Talent.',
        annee_academique:       '2024-2025',
      })
      toast.success(`Recommandation soumise au RH pour ${ens.prenom} ${ens.nom}`)
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const TABS = [
    { key: 'offres',       label: 'Offres & Candidats', icon: '📋' },
    { key: 'demandes',     label: 'Demandes de postes', icon: '📝' },
    { key: 'evaluations',  label: 'Evaluations',        icon: '⭐' },
    { key: 'enseignants',  label: 'Enseignants',        icon: '👥' },
  ]

  // Seul le CUP (coordinateur d'une unite precise, ex: "Algorithmique") a un filtre par unite.
  // Le Chef de departement supervise toute la filiere (son perimetre = le departement entier).
  const estCoordinateurUnite = ['cup', 'rp_coord'].includes(user?.role)
  const enseignantsAffiches = filterUnite && estCoordinateurUnite && user?.perimetre
    ? enseignants.filter(e => e.perimetre === user.perimetre)
    : enseignants

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>RP Coordinateur d'Unité Pedagogique</h2>
          <p className="text-sm mt-1" style={{ color: '#8C8C8C' }}>
            {user?.departement}{user?.perimetre ? ` • ${user.perimetre}` : ''}
          </p>
        </div>
        {estCoordinateurUnite && user?.perimetre && (tab === 'evaluations' || tab === 'enseignants') && (
          <button
            onClick={() => setFilterUnite(p => !p)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
            style={{
              backgroundColor: filterUnite ? '#E30613' : 'white',
              color: filterUnite ? '#fff' : '#4A4A4A',
              borderColor: filterUnite ? '#E30613' : '#D1D5DB',
            }}
          >
            🎯 {filterUnite ? `Unite : ${user.perimetre}` : 'Filtrer par mon unite pedagogique'}
          </button>
        )}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-7 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: tab === t.key ? '#E30613' : 'transparent', color: tab === t.key ? '#fff' : '#4A4A4A' }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── Offres ── */}
      {tab === 'offres' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowOffreForm(p => !p)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#E30613' }}>
              + Publier une offre
            </button>
          </div>

          {showOffreForm && (
            <form onSubmit={handleCreateOffre} className="bg-white rounded-xl border border-gray-200 p-6 mb-5 space-y-4">
              <h3 className="font-semibold" style={{ color: '#1A1A1A' }}>Nouvelle offre de recrutement</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>Titre du poste</label>
                  <input required value={offreForm.titre} onChange={e => setOffreForm(p => ({ ...p, titre: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>Type de contrat</label>
                  <select value={offreForm.type_contrat} onChange={e => setOffreForm(p => ({ ...p, type_contrat: e.target.value }))} className={inputCls}>
                    {['CDI','CDD','Vacataire','Stage'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>Description</label>
                <textarea required rows={3} value={offreForm.description} onChange={e => setOffreForm(p => ({ ...p, description: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>Competences (virgules)</label>
                  <input value={offreForm.competences_requises} onChange={e => setOffreForm(p => ({ ...p, competences_requises: e.target.value }))}
                    placeholder="python, react, sql..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>Nb postes</label>
                  <input type="number" min={1} value={offreForm.nb_postes} onChange={e => setOffreForm(p => ({ ...p, nb_postes: +e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="px-5 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#E30613' }}>Publier</button>
                <button type="button" onClick={() => setShowOffreForm(false)} className="px-5 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50">Annuler</button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {offres.length === 0 && <p className="text-sm text-gray-400">Aucune offre dans votre departement.</p>}
            {offres.map(o => {
              const s = STATUT_STYLE[o.statut] || STATUT_STYLE.ouverte
              return (
                <div key={o.id} onClick={() => navigate(`/rp/offres/${o.id}`)}
                  className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between hover:shadow-md cursor-pointer transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: '#E30613' }}>
                      {o.nb_postes}
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-red-600 transition-colors" style={{ color: '#1A1A1A' }}>{o.titre}</h3>
                      <p className="text-xs mt-0.5" style={{ color: '#8C8C8C' }}>
                        {o.departement} • {o.type_contrat} • {o.nb_postes} poste(s)
                      </p>
                      {o.competences_requises?.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {o.competences_requises.slice(0, 4).map(c => (
                            <span key={c} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: s.bg, color: s.text }}>
                      {s.label}
                    </span>
                    <span className="text-gray-300 group-hover:text-gray-500 text-lg">›</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Demandes de postes ── */}
      {tab === 'demandes' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm" style={{ color: '#8C8C8C' }}>
              Soumettez une demande au Chef de Departement avant de publier une nouvelle offre.
            </p>
            <button onClick={() => setShowDemandeForm(p => !p)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#E30613' }}>
              + Nouvelle demande
            </button>
          </div>

          {showDemandeForm && (
            <form onSubmit={handleDemande} className="bg-white rounded-xl border border-gray-200 p-6 mb-5 space-y-4">
              <h3 className="font-semibold" style={{ color: '#1A1A1A' }}>Demande de poste — Chef de Departement</h3>
              <div>
                <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>Intitule du poste demande</label>
                <input required value={demandeForm.titre} onChange={e => setDemandeForm(p => ({ ...p, titre: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>Justification</label>
                <textarea required rows={3} value={demandeForm.justification} onChange={e => setDemandeForm(p => ({ ...p, justification: e.target.value }))}
                  placeholder="Expliquez pourquoi ce poste est necessaire..." className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>Nombre de postes souhaites</label>
                <input type="number" min={1} value={demandeForm.nb_postes} onChange={e => setDemandeForm(p => ({ ...p, nb_postes: +e.target.value }))} className={inputCls} style={{ width: '100px' }} />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="px-5 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#E30613' }}>Soumettre</button>
                <button type="button" onClick={() => setShowDemandeForm(false)} className="px-5 py-2 rounded-lg text-sm border border-gray-300 text-gray-600">Annuler</button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {demandes.length === 0 && <p className="text-sm text-gray-400">Aucune demande soumise.</p>}
            {demandes.map(d => (
              <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>{d.titre}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#8C8C8C' }}>{d.nb_postes} poste(s) • {d.date}</p>
                  <p className="text-xs mt-1 italic" style={{ color: '#4A4A4A' }}>{d.justification}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 ${
                  d.statut === 'acceptee' ? 'bg-green-100 text-green-700' :
                  d.statut === 'refusee'  ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {d.statut === 'en_attente' ? 'En attente' : d.statut === 'acceptee' ? 'Acceptee' : 'Refusee'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Evaluations ── */}
      {tab === 'evaluations' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm" style={{ color: '#8C8C8C' }}>Evaluez les enseignants de votre unite.</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {enseignantsAffiches.map(e => (
              <button key={e.id} onClick={() => { setSelectedEns(e); setShowEvalForm(true) }}
                className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-red-300 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: '#E30613' }}>
                    {e.prenom?.[0]}{e.nom?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>{e.prenom} {e.nom}</p>
                    <p className="text-xs" style={{ color: '#8C8C8C' }}>{e.specialite || e.departement}</p>
                  </div>
                </div>
                <p className="text-xs font-medium mt-1" style={{ color: '#E30613' }}>
                  {evals.filter(ev => ev.enseignant_id === e.id).length} evaluation(s) • Cliquer pour evaluer
                </p>
              </button>
            ))}
          </div>

          {showEvalForm && selectedEns && (
            <form onSubmit={handleEval} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: '#1A1A1A' }}>
                  Evaluer — {selectedEns.prenom} {selectedEns.nom}
                </h3>
                <button type="button" onClick={() => setShowEvalForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#4A4A4A' }}>Annee academique</label>
                  <input className={inputCls} value={evalForm.annee_academique} onChange={e => setEvalForm(p => ({ ...p, annee_academique: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#4A4A4A' }}>Semestre</label>
                  <select className={inputCls} value={evalForm.semestre} onChange={e => setEvalForm(p => ({ ...p, semestre: e.target.value }))}>
                    <option value="S1">S1</option><option value="S2">S2</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[['note_pedagogie','Pedagogie'],['note_ponctualite','Ponctualite'],['note_engagement','Engagement'],['note_innovation','Innovation']].map(([k,lbl]) => (
                  <div key={k}>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#4A4A4A' }}>{lbl} /20</label>
                    <input type="number" min={0} max={20} step={0.5} className={inputCls}
                      value={evalForm[k]} onChange={e => setEvalForm(p => ({ ...p, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#4A4A4A' }}>Commentaire</label>
                <textarea rows={2} className={inputCls} value={evalForm.commentaire} onChange={e => setEvalForm(p => ({ ...p, commentaire: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['points_forts','Points forts (un par ligne)'],['axes_amelioration','Axes d\'amelioration']].map(([k,lbl]) => (
                  <div key={k}>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#4A4A4A' }}>{lbl}</label>
                    <textarea rows={2} className={inputCls} value={evalForm[k]} onChange={e => setEvalForm(p => ({ ...p, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button type="submit" className="px-5 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#E30613' }}>Enregistrer</button>
                <button type="button" onClick={() => setShowEvalForm(false)} className="px-5 py-2 rounded-lg text-sm border border-gray-300 text-gray-600">Annuler</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Enseignants ── */}
      {tab === 'enseignants' && (
        <div className="space-y-3">
          {enseignantsAffiches.length === 0 && (
            <p className="text-sm text-gray-400">Aucun enseignant dans cette unite pedagogique.</p>
          )}
          {enseignantsAffiches.map(e => (
            <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ backgroundColor: e.is_talent ? '#f59e0b' : '#E30613' }}>
                  {e.is_talent ? '★' : `${e.prenom?.[0]}${e.nom?.[0]}`}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: '#1A1A1A' }}>{e.prenom} {e.nom}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#8C8C8C' }}>{e.email} • {e.specialite || e.departement}</p>
                  {e.competences?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {e.competences.slice(0, 5).map(c => (
                        <span key={c} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {!e.is_talent && (
                  <button onClick={() => recommanderTalent(e)}
                    className="text-xs px-3 py-1.5 rounded-lg border font-medium"
                    style={{ borderColor: '#E30613', color: '#E30613' }}>
                    Recommander Talent
                  </button>
                )}
                {e.is_talent && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full font-semibold">★ Talent</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

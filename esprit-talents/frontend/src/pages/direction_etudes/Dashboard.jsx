import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getUsers } from '../../api/users'
import { getEvaluations, statsEnseignant, createEvaluation } from '../../api/evaluations'
import toast from 'react-hot-toast'

const TITRE_PAR_ROLE = {
  direction_etudes: 'Direction des Études',
  direction_dept:   'Ma Direction',
  rp_chef:          'Chef de Département',
  chef_dept:        'Chef de Département',
}

export default function DirectionEtudesDashboard() {
  const { user } = useAuth()
  const [enseignants, setEnseignants] = useState([])
  const [selected, setSelected]   = useState(null)
  const [evals, setEvals]         = useState([])
  const [showEvalForm, setShowEvalForm] = useState(false)
  const [evalForm, setEvalForm] = useState({
    annee_academique: '2024-2025', semestre: 'S1',
    note_pedagogie: '', note_ponctualite: '', note_engagement: '', note_innovation: '',
    commentaire: '', points_forts: '', axes_amelioration: '',
  })

  useEffect(() => {
    Promise.all([
      getUsers({ role: 'enseignant', departement: user?.departement }),
      getUsers({ role: 'talent', departement: user?.departement }),
    ]).then(([e, t]) => setEnseignants([...e.data, ...t.data])).catch(() => {})
  }, [user])

  const selectEnseignant = async (ens) => {
    setSelected(ens)
    setShowEvalForm(false)
    getEvaluations({ enseignant_id: ens.id })
      .then(r => setEvals(r.data)).catch(() => setEvals([]))
  }

  const handleEval = async (e) => {
    e.preventDefault()
    try {
      await createEvaluation({
        enseignant_id:    selected.id,
        annee_academique: evalForm.annee_academique,
        semestre:         evalForm.semestre,
        note_pedagogie:   +evalForm.note_pedagogie  || null,
        note_ponctualite: +evalForm.note_ponctualite || null,
        note_engagement:  +evalForm.note_engagement  || null,
        note_innovation:  +evalForm.note_innovation  || null,
        commentaire:      evalForm.commentaire,
        points_forts:     evalForm.points_forts.split('\n').filter(Boolean),
        axes_amelioration: evalForm.axes_amelioration.split('\n').filter(Boolean),
      })
      toast.success('Evaluation ajoutee !')
      setShowEvalForm(false)
      selectEnseignant(selected)
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
          {TITRE_PAR_ROLE[user?.role] || 'Tableau de bord'}
        </h2>
        <p className="text-sm mt-1" style={{ color: '#8C8C8C' }}>
          Consulter les enseignants, attribuer des évaluations, recommander des Talents
        </p>
      </div>

      <div className="flex gap-6">
        {/* Liste enseignants */}
        <div className="w-72 space-y-2 shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#8C8C8C' }}>
            Enseignants — {user?.departement}
          </p>
          {enseignants.map(e => (
            <button
              key={e.id}
              onClick={() => selectEnseignant(e)}
              className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border text-left hover:shadow-md transition-shadow"
              style={{ borderColor: selected?.id === e.id ? '#E30613' : '#E8E8E8' }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: '#E30613' }}
              >
                {e.prenom?.[0]}{e.nom?.[0]}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate" style={{ color: '#1A1A1A' }}>
                  {e.prenom} {e.nom}
                </p>
                <p className="text-xs truncate" style={{ color: '#8C8C8C' }}>{e.specialite || e.departement}</p>
              </div>
              {e.is_talent && <span className="text-yellow-500 text-sm shrink-0">★</span>}
            </button>
          ))}
        </div>

        {/* Detail enseignant */}
        {selected ? (
          <div className="flex-1 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white"
                    style={{ backgroundColor: '#E30613' }}
                  >
                    {selected.prenom?.[0]}{selected.nom?.[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>
                      {selected.prenom} {selected.nom}
                      {selected.is_talent && <span className="ml-2 text-yellow-500">★ Talent</span>}
                    </h3>
                    <p className="text-sm" style={{ color: '#8C8C8C' }}>{selected.email}</p>
                    {selected.competences?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selected.competences.slice(0, 6).map(c => (
                          <span key={c} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowEvalForm(p => !p)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: '#E30613' }}
                >
                  + Evaluer
                </button>
              </div>
            </div>

            {/* Formulaire évaluation */}
            {showEvalForm && (
              <form onSubmit={handleEval} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <h4 className="font-semibold" style={{ color: '#1A1A1A' }}>Nouvelle evaluation</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#4A4A4A' }}>Annee academique</label>
                    <input className={inputCls} value={evalForm.annee_academique}
                      onChange={e => setEvalForm(p => ({ ...p, annee_academique: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#4A4A4A' }}>Semestre</label>
                    <select className={inputCls} value={evalForm.semestre}
                      onChange={e => setEvalForm(p => ({ ...p, semestre: e.target.value }))}>
                      <option value="S1">S1</option><option value="S2">S2</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[['note_pedagogie','Pedagogie'],['note_ponctualite','Ponctualite'],['note_engagement','Engagement'],['note_innovation','Innovation']].map(([k,lbl]) => (
                    <div key={k}>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#4A4A4A' }}>{lbl} /20</label>
                      <input type="number" min="0" max="20" step="0.5" className={inputCls}
                        value={evalForm[k]} onChange={e => setEvalForm(p => ({ ...p, [k]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#4A4A4A' }}>Commentaire</label>
                  <textarea rows={2} className={inputCls} value={evalForm.commentaire}
                    onChange={e => setEvalForm(p => ({ ...p, commentaire: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[['points_forts','Points forts (un par ligne)'],['axes_amelioration',"Axes d'amelioration"]].map(([k,lbl]) => (
                    <div key={k}>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#4A4A4A' }}>{lbl}</label>
                      <textarea rows={2} className={inputCls} value={evalForm[k]}
                        onChange={e => setEvalForm(p => ({ ...p, [k]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="px-5 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#E30613' }}>Enregistrer</button>
                  <button type="button" onClick={() => setShowEvalForm(false)} className="px-5 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50">Annuler</button>
                </div>
              </form>
            )}

            {/* Evaluations existantes */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h4 className="font-semibold mb-4" style={{ color: '#1A1A1A' }}>
                Evaluations ({evals.length})
              </h4>
              {evals.length === 0 ? (
                <p className="text-sm" style={{ color: '#8C8C8C' }}>Aucune evaluation disponible.</p>
              ) : (
                <div className="space-y-3">
                  {evals.map(ev => (
                    <div key={ev.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium text-sm">{ev.annee_academique} — {ev.semestre}</span>
                        <span className="font-bold text-lg" style={{ color: '#E30613' }}>{ev.note_globale}/20</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs mb-2" style={{ color: '#8C8C8C' }}>
                        {[['Ped.', ev.note_pedagogie],['Ponc.', ev.note_ponctualite],['Eng.', ev.note_engagement],['Inn.', ev.note_innovation]].map(([l, v]) => (
                          <div key={l}><span>{l}</span> <span className="font-semibold text-gray-700">{v}/20</span></div>
                        ))}
                      </div>
                      {ev.commentaire && <p className="text-xs" style={{ color: '#4A4A4A' }}>{ev.commentaire}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm" style={{ color: '#8C8C8C' }}>
            Selectionnez un enseignant pour voir son profil et ses evaluations
          </div>
        )}
      </div>
    </div>
  )
}

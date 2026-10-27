import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getUsers } from '../../api/users'
import { getEvaluations, statsEnseignant, createEvaluation, demandeTalent } from '../../api/evaluations'
import toast from 'react-hot-toast'

// Roles habilites a noter des enseignants (doit rester aligne avec EVALUATEURS cote backend)
const EVALUATEURS = ['rp_coord', 'rp_chef', 'direction', 'direction_etudes', 'chef_admin', 'cup', 'chef_dept']

const EMPTY_FORM = {
  annee_academique: '2024-2025', semestre: 'S1',
  note_pedagogie: '', note_ponctualite: '', note_engagement: '', note_innovation: '',
  note_scientifique: '', note_communicationnel: '',
  commentaire: '', points_forts: '', axes_amelioration: '',
}

export default function EnseignantEvaluations() {
  const { user } = useAuth()
  const isEvaluateur = EVALUATEURS.includes(user?.role)

  const [evals, setEvals] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Panneau "noter un enseignant" (managers) ──────────────────────────
  const [enseignants, setEnseignants] = useState([])
  const [selected, setSelected]       = useState(null)
  const [selectedEvals, setSelectedEvals] = useState([])
  const [showEvalForm, setShowEvalForm]   = useState(false)
  const [evalForm, setEvalForm] = useState(EMPTY_FORM)

  useEffect(() => {
    Promise.all([
      getEvaluations(),
      statsEnseignant(user.id),
    ]).then(([e, s]) => { setEvals(e.data); setStats(s.data) })
      .catch(() => toast.error('Erreur chargement evaluations'))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!isEvaluateur) return
    // Charger enseignants ET talents (un talent peut aussi recevoir une évaluation)
    Promise.all([
      getUsers({ role: 'enseignant', departement: user?.departement }),
      getUsers({ role: 'talent', departement: user?.departement }),
    ]).then(([e, t]) => setEnseignants([...e.data, ...t.data])).catch(() => {})
  }, [user, isEvaluateur])

  const selectEnseignant = async (ens) => {
    setSelected(ens)
    setShowEvalForm(false)
    setEvalForm(EMPTY_FORM)
    getEvaluations({ enseignant_id: ens.id })
      .then(r => setSelectedEvals(r.data)).catch(() => setSelectedEvals([]))
  }

  const handleCreateEval = async (e) => {
    e.preventDefault()
    try {
      await createEvaluation({
        enseignant_id:          selected.id,
        annee_academique:       evalForm.annee_academique,
        semestre:               evalForm.semestre,
        note_pedagogie:         +evalForm.note_pedagogie         || null,
        note_ponctualite:       +evalForm.note_ponctualite       || null,
        note_engagement:        +evalForm.note_engagement        || null,
        note_innovation:        +evalForm.note_innovation        || null,
        note_scientifique:      +evalForm.note_scientifique      || null,
        note_communicationnel:  +evalForm.note_communicationnel  || null,
        commentaire:            evalForm.commentaire,
        points_forts:           evalForm.points_forts.split('\n').filter(Boolean),
        axes_amelioration:      evalForm.axes_amelioration.split('\n').filter(Boolean),
      })
      toast.success('Evaluation enregistree !')
      setShowEvalForm(false)
      setEvalForm(EMPTY_FORM)
      selectEnseignant(selected)
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const handleDemandeTalent = async () => {
    try {
      await demandeTalent()
      toast.success('Demande de statut Talent envoyee au RH !')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur')
    }
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {isEvaluateur ? 'Evaluations' : 'Mes evaluations'}
          </h2>
          {isEvaluateur && (
            <p className="text-sm mt-1 text-gray-500">
              Notez les enseignants de votre perimetre et consultez vos propres evaluations
            </p>
          )}
        </div>
        {!user?.is_talent && !isEvaluateur && (
          <button onClick={handleDemandeTalent}
            className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium px-4 py-2 rounded-lg">
            Demander le statut Talent
          </button>
        )}
      </div>

      {/* ─── Panneau manager : noter un enseignant ─── */}
      {isEvaluateur && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Liste des enseignants */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Enseignants — {user?.departement}</h3>
            {enseignants.length === 0 && <p className="text-sm text-gray-400">Aucun enseignant trouve dans ce perimetre.</p>}
            <div className="space-y-1.5 max-h-[28rem] overflow-y-auto">
              {enseignants.map(ens => (
                <button
                  key={ens.id}
                  onClick={() => selectEnseignant(ens)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors"
                  style={{
                    backgroundColor: selected?.id === ens.id ? '#FEE2E2' : 'transparent',
                    color: selected?.id === ens.id ? '#B91C1C' : '#374151',
                  }}
                >
                  <p className="font-medium">{ens.prenom} {ens.nom}</p>
                  <p className="text-xs text-gray-400 truncate">{ens.specialite || ens.departement}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Detail / formulaire */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            {!selected && <p className="text-gray-400 text-sm">Selectionnez un enseignant pour consulter ou ajouter une evaluation.</p>}

            {selected && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-800">{selected.prenom} {selected.nom}</p>
                    <p className="text-xs text-gray-400">{selected.email}</p>
                  </div>
                  <button
                    onClick={() => setShowEvalForm(p => !p)}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
                  >
                    {showEvalForm ? 'Annuler' : '+ Evaluer'}
                  </button>
                </div>

                {showEvalForm && (
                  <form onSubmit={handleCreateEval} className="space-y-3 mb-6 bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <input className={inputCls} placeholder="Annee academique" value={evalForm.annee_academique}
                        onChange={e => setEvalForm({ ...evalForm, annee_academique: e.target.value })} />
                      <select className={inputCls} value={evalForm.semestre}
                        onChange={e => setEvalForm({ ...evalForm, semestre: e.target.value })}>
                        <option value="S1">S1</option>
                        <option value="S2">S2</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        ['note_pedagogie',        'Pedagogie /20'],
                        ['note_ponctualite',      'Ponctualite /20'],
                        ['note_engagement',       'Engagement /20'],
                        ['note_innovation',       'Innovation /20'],
                        ['note_scientifique',     'Scientifique /20'],
                        ['note_communicationnel', 'Communicationnel /20'],
                      ].map(([key, label]) => (
                        <input key={key} type="number" min="0" max="20" step="0.5" className={inputCls}
                          placeholder={label} value={evalForm[key]}
                          onChange={e => setEvalForm({ ...evalForm, [key]: e.target.value })} />
                      ))}
                    </div>
                    <textarea className={inputCls} rows={2} placeholder="Commentaire"
                      value={evalForm.commentaire} onChange={e => setEvalForm({ ...evalForm, commentaire: e.target.value })} />
                    <textarea className={inputCls} rows={2} placeholder="Points forts (un par ligne)"
                      value={evalForm.points_forts} onChange={e => setEvalForm({ ...evalForm, points_forts: e.target.value })} />
                    <textarea className={inputCls} rows={2} placeholder="Axes d'amelioration (un par ligne)"
                      value={evalForm.axes_amelioration} onChange={e => setEvalForm({ ...evalForm, axes_amelioration: e.target.value })} />
                    <button type="submit" className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                      Enregistrer l'evaluation
                    </button>
                  </form>
                )}

                <h4 className="text-sm font-semibold text-gray-600 mb-2">Historique des evaluations</h4>
                {selectedEvals.length === 0 && <p className="text-sm text-gray-400">Aucune evaluation pour cet enseignant.</p>}
                <div className="space-y-3">
                  {selectedEvals.map(e => (
                    <div key={e.id} className="border border-gray-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-700">{e.annee_academique} {e.semestre && `— ${e.semestre}`}</p>
                      <p className="text-sm text-gray-500">Note globale : <span className="font-bold text-red-600">{e.note_globale}/20</span></p>
                      {e.commentaire && <p className="text-sm text-gray-600 mt-1">{e.commentaire}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Mes propres evaluations ─── */}
      {isEvaluateur && <h3 className="text-lg font-bold text-gray-800 mb-4">Mes evaluations</h3>}

      {stats && stats.nb_evaluations > 0 && (
        <div className="bg-red-50 rounded-xl p-6 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Moyenne', `${stats.moyenne_globale}/20`],
            ['Pedagogie', `${stats.moyenne_pedagogie}/20`],
            ['Ponctualite', `${stats.moyenne_ponctualite}/20`],
            ['Innovation', `${stats.moyenne_innovation}/20`],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-2xl font-bold text-red-700">{v}</p>
              <p className="text-sm text-red-500">{k}</p>
            </div>
          ))}
        </div>
      )}

      {evals.length === 0 && <p className="text-gray-400">Aucune evaluation disponible.</p>}
      <div className="space-y-4">
        {evals.map(e => (
          <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-800">{e.annee_academique} {e.semestre && `— ${e.semestre}`}</p>
                <p className="text-sm text-gray-500">Note globale : <span className="font-bold text-red-600">{e.note_globale}/20</span></p>
              </div>
            </div>
            {e.commentaire && <p className="text-sm text-gray-600 bg-gray-50 rounded p-3">{e.commentaire}</p>}
            {e.points_forts?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-green-700 mb-1">Points forts :</p>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  {e.points_forts.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
            {e.axes_amelioration?.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-orange-600 mb-1">Axes d'amelioration :</p>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  {e.axes_amelioration.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

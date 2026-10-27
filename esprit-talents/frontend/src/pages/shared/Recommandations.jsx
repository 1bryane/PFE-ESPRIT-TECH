import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/client'
import { getUsers } from '../../api/users'
import toast from 'react-hot-toast'

const RECOMMANDANTS = ['cup','chef_dept','direction_etudes','chef_admin','direction','direction_dept','rp_chef','rp_coord']
const VALIDATEURS   = ['chef_admin']

const STATUT_STYLE = {
  en_attente: 'bg-yellow-100 text-yellow-700',
  validee:    'bg-green-100 text-green-700',
  refusee:    'bg-red-100 text-red-700',
}

const DIMS = [
  ['dim_scientifique',     'Scientifique'],
  ['dim_pedagogique',      'Pédagogique'],
  ['dim_communicationnel', 'Communicationnel'],
  ['dim_comportemental',   'Comportemental'],
  ['dim_autres',           'Autres'],
]

const EMPTY_FORM = {
  enseignant_id: '',
  dim_scientifique: '', dim_pedagogique: '', dim_communicationnel: '',
  dim_comportemental: '', dim_autres: '',
  justif_scientifique: '', justif_pedagogique: '', justif_communicationnel: '',
  justif_comportemental: '', justif_autres: '',
  commentaire_global: '', annee_academique: '2024-2025',
}

export default function Recommandations() {
  const { user } = useAuth()
  const peutRecommander = RECOMMANDANTS.includes(user?.role)
  const peutValider     = VALIDATEURS.includes(user?.role)

  const [recos, setRecos]               = useState([])
  const [enseignants, setEnseignants]   = useState([])
  const [showForm, setShowForm]         = useState(false)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [selected, setSelected]         = useState(null)
  const [loading, setLoading]           = useState(true)

  const load = () => {
    const endpoint = (user?.role === 'enseignant' || user?.role === 'talent')
      ? `/recommandations/enseignant/${user.id}`
      : '/recommandations'
    api.get(endpoint).then(r => setRecos(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    if (peutRecommander) {
      // Inclure enseignants ET talents (un talent peut aussi recevoir une recommandation)
      Promise.all([
        getUsers({ role: 'enseignant' }),
        getUsers({ role: 'talent' }),
      ]).then(([e, t]) => setEnseignants([...e.data, ...t.data]))
        .catch(() => {})
    }
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/recommandations', {
        ...form,
        enseignant_id:       +form.enseignant_id,
        dim_scientifique:    +form.dim_scientifique,
        dim_pedagogique:     +form.dim_pedagogique,
        dim_communicationnel:+form.dim_communicationnel,
        dim_comportemental:  +form.dim_comportemental,
        dim_autres:          +form.dim_autres,
      })
      toast.success('Recommandation soumise !')
      setShowForm(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const handleValider = async (id, decision) => {
    try {
      await api.patch(`/recommandations/${id}/valider`, { decision })
      toast.success(decision === 'valider' ? 'Recommandation validée !' : 'Recommandation refusée')
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Recommandations Talent</h2>
          <p className="text-sm mt-1 text-gray-500">
            {peutRecommander ? 'Recommandez un enseignant pour le statut Talent ESPRIT' : 'Vos recommandations reçues'}
          </p>
        </div>
        {peutRecommander && (
          <button onClick={() => setShowForm(p => !p)}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            {showForm ? 'Annuler' : '+ Nouvelle recommandation'}
          </button>
        )}
      </div>

      {/* Formulaire de recommandation */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
          <h3 className="font-semibold text-gray-800 mb-2">Nouvelle recommandation</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Enseignant *</label>
              <select className={inputCls} value={form.enseignant_id} required
                onChange={e => setForm({ ...form, enseignant_id: e.target.value })}>
                <option value="">— Choisir un enseignant —</option>
                {enseignants.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.prenom} {e.nom}{e.is_talent ? ' ★ Talent' : ''} — {e.departement}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Année académique</label>
              <input className={inputCls} value={form.annee_academique}
                onChange={e => setForm({ ...form, annee_academique: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {DIMS.map(([key, label]) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{label} /5</label>
                <input type="number" min="0" max="5" step="0.5" required className={inputCls}
                  value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DIMS.map(([key, label]) => (
              <div key={`justif_${key}`}>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Justification — {label}</label>
                <textarea rows={2} className={inputCls}
                  value={form[`justif_${key.replace('dim_','')}`]}
                  onChange={e => setForm({ ...form, [`justif_${key.replace('dim_','')}`]: e.target.value })} />
              </div>
            ))}
          </div>

          <textarea rows={3} className={inputCls} placeholder="Commentaire global"
            value={form.commentaire_global}
            onChange={e => setForm({ ...form, commentaire_global: e.target.value })} />

          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2 rounded-lg">
            Soumettre la recommandation
          </button>
        </form>
      )}

      {/* Liste des recommandations */}
      {recos.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-3">🏅</p>
          <p className="text-sm text-gray-400">Aucune recommandation pour le moment</p>
        </div>
      )}

      <div className="space-y-4">
        {recos.map(r => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5"
            onClick={() => setSelected(selected?.id === r.id ? null : r)}
            style={{ cursor: 'pointer' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-800">
                  {r.enseignant?.prenom} {r.enseignant?.nom}
                  <span className="ml-2 text-sm font-normal text-gray-500">— recommandé par {r.recommandant?.prenom} {r.recommandant?.nom}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{r.annee_academique}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-lg font-bold text-red-600">{r.score_moyen?.toFixed(1)}/5</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUT_STYLE[r.statut] || 'bg-gray-100 text-gray-600'}`}>
                  {r.statut}
                </span>
              </div>
            </div>

            {/* Scores par dimension */}
            <div className="flex gap-3 mt-3 flex-wrap">
              {DIMS.map(([key, label]) => (
                <div key={key} className="text-center bg-gray-50 rounded-lg px-3 py-1.5">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-bold text-gray-800">{r[key]}/5</p>
                </div>
              ))}
            </div>

            {selected?.id === r.id && r.commentaire_global && (
              <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{r.commentaire_global}</p>
            )}

            {/* Actions RH */}
            {peutValider && r.statut === 'en_attente' && (
              <div className="flex gap-2 mt-4" onClick={e => e.stopPropagation()}>
                <button onClick={() => handleValider(r.id, 'valider')}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                  Valider → Talent
                </button>
                <button onClick={() => handleValider(r.id, 'refuser')}
                  className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                  Refuser
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

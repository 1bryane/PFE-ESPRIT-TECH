import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/client'
import { getUsers } from '../../api/users'
import toast from 'react-hot-toast'

const CREATEURS = ['chef_admin','direction']

const TYPE_LABELS = {
  enseignant_annee:        'Enseignant de l\'Année',
  responsable_resilient:   'Responsable Résilient',
  challenge_annee:         'Challenge de l\'Année',
  innovation_pedagogique:  'Innovation Pédagogique',
  publication_excellente:  'Publication Excellente',
  autre:                   'Autre',
}

const RECOMPENSE_LABELS = {
  avantage_nature: 'Avantage en nature',
  prime:           'Prime',
  reconnaissance:  'Reconnaissance',
}

const TYPE_ICONS = {
  enseignant_annee:       '🏆',
  responsable_resilient:  '🛡️',
  challenge_annee:        '🎯',
  innovation_pedagogique: '💡',
  publication_excellente: '📰',
  autre:                  '🥇',
}

const EMPTY_FORM = {
  enseignant_id: '', type_distinction: 'enseignant_annee', libelle_custom: '',
  description: '', type_recompense: 'reconnaissance', valeur_recompense: '',
  annee_academique: '2024-2025', date_remise: '',
}

export default function Distinctions() {
  const { user } = useAuth()
  const peutAttribuer = CREATEURS.includes(user?.role)

  const [distinctions, setDistinctions] = useState([])
  const [enseignants, setEnseignants]   = useState([])
  const [showForm, setShowForm]         = useState(false)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [loading, setLoading]           = useState(true)

  const load = () => {
    const endpoint = (user?.role === 'enseignant' || user?.role === 'talent')
      ? `/distinctions/enseignant/${user.id}`
      : '/distinctions'
    api.get(endpoint).then(r => setDistinctions(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    if (peutAttribuer) getUsers({ role: 'talent' }).then(r => setEnseignants(r.data)).catch(() => {
      getUsers({ role: 'enseignant' }).then(r => setEnseignants(r.data)).catch(() => {})
    })
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/distinctions', {
        ...form,
        enseignant_id: +form.enseignant_id,
      })
      toast.success('Distinction attribuée !')
      setShowForm(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Révoquer cette distinction ?')) return
    try {
      await api.delete(`/distinctions/${id}`)
      toast.success('Distinction révoquée')
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Distinctions & Valorisation</h2>
          <p className="text-sm mt-1 text-gray-500">
            {peutAttribuer ? 'Attribuez des distinctions aux Talents ESPRIT' : 'Distinctions reçues'}
          </p>
        </div>
        {peutAttribuer && (
          <button onClick={() => setShowForm(p => !p)}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            {showForm ? 'Annuler' : '+ Attribuer une distinction'}
          </button>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Nouvelle distinction</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Enseignant Talent *</label>
              <select required className={inputCls} value={form.enseignant_id}
                onChange={e => setForm({ ...form, enseignant_id: e.target.value })}>
                <option value="">— Choisir —</option>
                {enseignants.map(e => (
                  <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Type de distinction</label>
              <select className={inputCls} value={form.type_distinction}
                onChange={e => setForm({ ...form, type_distinction: e.target.value })}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {form.type_distinction === 'autre' && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Libellé personnalisé *</label>
              <input required className={inputCls} value={form.libelle_custom}
                onChange={e => setForm({ ...form, libelle_custom: e.target.value })} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Type de récompense</label>
              <select className={inputCls} value={form.type_recompense}
                onChange={e => setForm({ ...form, type_recompense: e.target.value })}>
                {Object.entries(RECOMPENSE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Valeur / détail récompense</label>
              <input className={inputCls} placeholder="Ex: 500 DT, Trophy, Certificat..."
                value={form.valeur_recompense}
                onChange={e => setForm({ ...form, valeur_recompense: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Année académique</label>
              <input className={inputCls} value={form.annee_academique}
                onChange={e => setForm({ ...form, annee_academique: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Date de remise</label>
              <input type="date" className={inputCls} value={form.date_remise}
                onChange={e => setForm({ ...form, date_remise: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
            <textarea rows={2} className={inputCls} value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          <button type="submit"
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2 rounded-lg">
            Attribuer la distinction
          </button>
        </form>
      )}

      {/* Liste — mur des lauréats */}
      {distinctions.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-3">🥇</p>
          <p className="text-sm text-gray-400">Aucune distinction attribuée pour le moment</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {distinctions.map(d => (
          <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-5 relative">
            {user?.role === 'direction' && (
              <button onClick={() => handleDelete(d.id)}
                className="absolute top-3 right-3 text-xs text-gray-300 hover:text-red-500">✕</button>
            )}
            <div className="text-3xl mb-2">{TYPE_ICONS[d.type_distinction] || '🥇'}</div>
            <p className="font-bold text-gray-800 text-sm">
              {d.libelle_custom || TYPE_LABELS[d.type_distinction]}
            </p>
            <p className="text-sm text-red-600 font-medium mt-1">
              {d.enseignant?.prenom} {d.enseignant?.nom}
            </p>
            <p className="text-xs text-gray-400 mt-1">{d.annee_academique}</p>
            {d.description && <p className="text-xs text-gray-500 mt-2">{d.description}</p>}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                {RECOMPENSE_LABELS[d.type_recompense]}
              </span>
              {d.valeur_recompense && (
                <span className="text-xs text-gray-500">{d.valeur_recompense}</span>
              )}
            </div>
            {d.date_remise && (
              <p className="text-xs text-gray-400 mt-1">
                Remise le {new Date(d.date_remise).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

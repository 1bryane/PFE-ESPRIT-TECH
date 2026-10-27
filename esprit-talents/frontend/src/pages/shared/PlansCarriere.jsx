import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/client'
import { getUsers } from '../../api/users'
import toast from 'react-hot-toast'

const MANAGERS = ['chef_dept','chef_admin','direction','direction_etudes','rp_chef','direction_dept','cup']

const TYPE_LABELS = {
  poste_pedagogique:  'Poste pédagogique',
  projet:             'Projet',
  responsabilite_mgt: 'Responsabilité mgt',
  developpement_comp: 'Développement des compétences',
}

const STATUT_STYLE = {
  en_attente: { cls: 'bg-yellow-100 text-yellow-700', label: 'En attente' },
  en_cours:   { cls: 'bg-blue-100 text-blue-700',    label: 'En cours'   },
  realise:    { cls: 'bg-green-100 text-green-700',  label: 'Réalisé'    },
  abandonne:  { cls: 'bg-gray-100 text-gray-500',    label: 'Abandonné'  },
  refuse:     { cls: 'bg-red-100 text-red-700',      label: 'Refusé'     },
}

const EMPTY_FORM = {
  enseignant_id: '', type_plan: 'poste_pedagogique', titre: '',
  description: '', poste_cible: '', echeance: '', notes_suivi: '',
  formations_suggerees: '', competences_cibles: '',
}

export default function PlansCarriere() {
  const { user }       = useAuth()
  const isManager      = MANAGERS.includes(user?.role)
  const isEnseignant   = ['enseignant','talent'].includes(user?.role)

  const [plans, setPlans]             = useState([])
  const [enseignants, setEnseignants] = useState([])
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [loading, setLoading]         = useState(true)
  const [expanded, setExpanded]       = useState(null)     // id du plan ouvert en détail
  const [notesEdit, setNotesEdit]     = useState({})       // { [planId]: texte en cours d'édition }
  const [notesOpen, setNotesOpen]     = useState(null)     // id du plan dont on édite les notes
  const [filterStatut, setFilterStatut] = useState('')

  const load = () =>
    api.get('/plans-carriere')
      .then(r => setPlans(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
    if (isManager) {
      // Charger enseignants ET talents (un talent peut aussi avoir un plan)
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
      const payload = {
        enseignant_id:       isEnseignant ? user.id : +form.enseignant_id,
        type_plan:           form.type_plan,
        titre:               form.titre,
        description:         form.description || null,
        poste_cible:         form.poste_cible || null,
        echeance:            form.echeance || null,
        formations_suggerees: form.formations_suggerees
          ? form.formations_suggerees.split('\n').map(s => s.trim()).filter(Boolean)
          : null,
        competences_cibles: form.competences_cibles
          ? form.competences_cibles.split('\n').map(s => s.trim()).filter(Boolean)
          : null,
      }
      await api.post('/plans-carriere', payload)
      toast.success('Plan de carrière créé !')
      setShowForm(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const handleUpdateStatut = async (id, statut) => {
    try {
      await api.patch(`/plans-carriere/${id}`, { statut })
      toast.success('Statut mis à jour')
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const handleSaveNotes = async (id) => {
    try {
      await api.patch(`/plans-carriere/${id}`, { notes_suivi: notesEdit[id] ?? '' })
      toast.success('Notes de suivi enregistrées')
      setNotesOpen(null)
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"

  const visible = plans.filter(p => !filterStatut || p.statut === filterStatut)

  // Compteurs par statut
  const counts = plans.reduce((acc, p) => {
    acc[p.statut] = (acc[p.statut] || 0) + 1
    return acc
  }, {})

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Plans de carrière</h2>
          <p className="text-sm mt-1 text-gray-500">
            {isEnseignant
              ? 'Vos plans de carrière et demandes en cours'
              : 'Suivi des plans de carrière — notes d\'avancement et décisions'}
          </p>
        </div>
        <button onClick={() => setShowForm(p => !p)}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          {showForm ? 'Annuler' : isEnseignant ? '+ Faire une demande' : '+ Créer un plan'}
        </button>
      </div>

      {/* KPIs statuts (pour managers) */}
      {isManager && plans.length > 0 && (
        <div className="flex gap-3 mb-5 flex-wrap">
          {Object.entries(STATUT_STYLE).map(([key, { cls, label }]) => {
            const n = counts[key] || 0
            if (!n) return null
            return (
              <button key={key}
                onClick={() => setFilterStatut(filterStatut === key ? '' : key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  filterStatut === key ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                } ${cls}`}>
                <span>{label}</span>
                <span className="font-bold">{n}</span>
              </button>
            )
          })}
          {filterStatut && (
            <button onClick={() => setFilterStatut('')}
              className="text-xs text-gray-400 hover:text-gray-600 underline self-center">
              Tout afficher
            </button>
          )}
        </div>
      )}

      {/* Formulaire de création */}
      {showForm && (
        <form onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
          <h3 className="font-semibold text-gray-800">
            {isEnseignant ? 'Ma demande de plan (Voie A)' : 'Nouveau plan — Voie B (manager)'}
          </h3>

          {isManager && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Enseignant / Talent *</label>
              <select className={inputCls} required value={form.enseignant_id}
                onChange={e => setForm({ ...form, enseignant_id: e.target.value })}>
                <option value="">— Choisir —</option>
                {enseignants.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.prenom} {e.nom}{e.is_talent ? ' ★' : ''} — {e.departement}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Type de plan *</label>
              <select className={inputCls} value={form.type_plan}
                onChange={e => setForm({ ...form, type_plan: e.target.value })}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Échéance</label>
              <input type="date" className={inputCls} value={form.echeance}
                onChange={e => setForm({ ...form, echeance: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Titre *</label>
            <input required className={inputCls} placeholder="Ex: Promotion CUP Algorithmique"
              value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
            <textarea rows={3} className={inputCls} value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          {(form.type_plan === 'poste_pedagogique' || form.type_plan === 'responsabilite_mgt') && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Poste cible</label>
              <input className={inputCls} placeholder="Ex: Chef de département Informatique"
                value={form.poste_cible} onChange={e => setForm({ ...form, poste_cible: e.target.value })} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Formations suggérées <span className="font-normal text-gray-400">(une par ligne)</span>
              </label>
              <textarea rows={3} className={inputCls}
                placeholder="React.js Avancé&#10;Leadership Académique"
                value={form.formations_suggerees}
                onChange={e => setForm({ ...form, formations_suggerees: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Compétences cibles <span className="font-normal text-gray-400">(une par ligne)</span>
              </label>
              <textarea rows={3} className={inputCls}
                placeholder="React&#10;TypeScript&#10;Architecture"
                value={form.competences_cibles}
                onChange={e => setForm({ ...form, competences_cibles: e.target.value })} />
            </div>
          </div>

          <button type="submit"
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2 rounded-lg">
            {isEnseignant ? 'Soumettre la demande' : 'Créer le plan'}
          </button>
        </form>
      )}

      {/* Liste vide */}
      {visible.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="text-sm text-gray-400">
            {filterStatut ? `Aucun plan avec le statut « ${STATUT_STYLE[filterStatut]?.label} »` : 'Aucun plan de carrière pour le moment'}
          </p>
        </div>
      )}

      {/* Plans */}
      <div className="space-y-4">
        {visible.map(p => {
          const isExpanded  = expanded === p.id
          const isNoteOpen  = notesOpen === p.id
          const statut      = STATUT_STYLE[p.statut] || { cls: 'bg-gray-100 text-gray-500', label: p.statut }

          return (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">

              {/* En-tête de la carte */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Type + voie + statut */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {TYPE_LABELS[p.type_plan] || p.type_plan}
                      </span>
                      {p.initie_par_enseignant
                        ? <span className="text-xs text-blue-600 font-medium">Voie A — demande enseignant</span>
                        : <span className="text-xs text-purple-600 font-medium">Voie B — proposé par manager</span>
                      }
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statut.cls}`}>
                        {statut.label}
                      </span>
                    </div>

                    {/* Titre */}
                    <p className="font-semibold text-gray-800">{p.titre}</p>

                    {/* Pour (managers seulement) */}
                    {!isEnseignant && p.enseignant && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        Pour : <span className="font-medium text-gray-700">
                          {p.enseignant.prenom} {p.enseignant.nom}
                        </span>
                        {p.enseignant.departement && <span className="text-gray-400"> — {p.enseignant.departement}</span>}
                      </p>
                    )}

                    {/* Créateur (si différent de l'enseignant) */}
                    {!isEnseignant && p.createur && p.createur.id !== p.enseignant?.id && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Proposé par : {p.createur.prenom} {p.createur.nom}
                      </p>
                    )}

                    {/* Méta infos */}
                    <div className="flex gap-4 mt-1.5 text-xs text-gray-400 flex-wrap">
                      {p.echeance && (
                        <span>
                          📅 Échéance : <span className={`font-medium ${new Date(p.echeance) < new Date() && p.statut === 'en_cours' ? 'text-red-500' : 'text-gray-600'}`}>
                            {new Date(p.echeance).toLocaleDateString('fr-FR')}
                          </span>
                          {new Date(p.echeance) < new Date() && p.statut === 'en_cours' && (
                            <span className="ml-1 text-red-500 font-semibold">⚠ Dépassée</span>
                          )}
                        </span>
                      )}
                      <span>Créé le {new Date(p.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>

                    {/* Notes de suivi existantes */}
                    {p.notes_suivi && !isNoteOpen && (
                      <div className="mt-2.5 text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                        <span className="text-xs font-semibold text-blue-500 block mb-0.5">Notes de suivi</span>
                        {p.notes_suivi}
                      </div>
                    )}
                  </div>

                  {/* Actions statut */}
                  <div className="shrink-0 flex flex-col gap-2 items-end">

                    {/* Manager : voie A en attente → Accepter / Refuser */}
                    {isManager && p.statut === 'en_attente' && p.initie_par_enseignant ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateStatut(p.id, 'en_cours')}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                          Accepter
                        </button>
                        <button onClick={() => handleUpdateStatut(p.id, 'refuse')}
                          className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                          Refuser
                        </button>
                      </div>
                    ) : null}

                    {/* Manager : plan en_cours → Marquer réalisé ou Abandonner */}
                    {isManager && p.statut === 'en_cours' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateStatut(p.id, 'realise')}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                          Marquer réalisé
                        </button>
                        <button onClick={() => handleUpdateStatut(p.id, 'abandonne')}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-lg">
                          Abandonner
                        </button>
                      </div>
                    )}

                    {/* Manager : bouton Notes de suivi (tous statuts sauf refusé) */}
                    {isManager && p.statut !== 'refuse' && (
                      <button
                        onClick={() => {
                          if (isNoteOpen) {
                            setNotesOpen(null)
                          } else {
                            setNotesOpen(p.id)
                            setNotesEdit(prev => ({ ...prev, [p.id]: p.notes_suivi || '' }))
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 underline">
                        {isNoteOpen ? 'Annuler notes' : p.notes_suivi ? 'Modifier notes' : '+ Ajouter notes'}
                      </button>
                    )}

                    {/* Bouton voir détails */}
                    <button onClick={() => setExpanded(isExpanded ? null : p.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 underline">
                      {isExpanded ? 'Réduire' : 'Voir détails'}
                    </button>
                  </div>
                </div>

                {/* Zone édition notes de suivi */}
                {isNoteOpen && (
                  <div className="mt-3 border-t pt-3">
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                      Notes de suivi / avancement
                    </label>
                    <textarea rows={3} className={`w-full border border-blue-300 rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-400`}
                      placeholder="Ex: Entretien avec l'enseignant effectué le 10/06 — objectif intermédiaire atteint. Prochaine étape : validation formation React."
                      value={notesEdit[p.id] ?? ''}
                      onChange={e => setNotesEdit(prev => ({ ...prev, [p.id]: e.target.value }))} />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleSaveNotes(p.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg">
                        Enregistrer
                      </button>
                      <button onClick={() => setNotesOpen(null)}
                        className="border border-gray-300 text-gray-600 text-xs px-4 py-1.5 rounded-lg hover:bg-gray-50">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Panneau détails dépliable */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-3">
                  {p.description && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm text-gray-700">{p.description}</p>
                    </div>
                  )}

                  {p.poste_cible && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Poste cible</p>
                      <p className="text-sm text-gray-700 font-medium">{p.poste_cible}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {p.formations_suggerees?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Formations suggérées
                        </p>
                        <ul className="space-y-1">
                          {p.formations_suggerees.map((f, i) => (
                            <li key={i} className="flex items-center gap-1.5 text-sm text-gray-700">
                              <span className="text-red-400">→</span> {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {p.competences_cibles?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Compétences cibles
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {p.competences_cibles.map(c => (
                            <span key={c} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {p.notes_suivi && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Notes de suivi
                      </p>
                      <p className="text-sm text-gray-700 bg-white border border-blue-100 rounded-lg px-3 py-2">
                        {p.notes_suivi}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">
                    Dernière mise à jour : {new Date(p.updated_at).toLocaleDateString('fr-FR')} à {new Date(p.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { getFormations, createFormation, updateFormation, inscritsFormation, updateInscription } from '../../api/formations'
import { accepterProposition, refuserProposition } from '../../api/aria'
import api from '../../api/client'
import toast from 'react-hot-toast'

// FastAPI renvoie parfois `detail` sous forme de liste d'erreurs de validation (422)
// plutot qu'une simple chaine. Passer un objet/tableau brut a toast.error() fait
// planter tout le rendu React ("Objects are not valid as a React child" -> page blanche).
function getErrorMessage(err, fallback = 'Erreur') {
  const detail = err?.response?.data?.detail
  if (!detail) return fallback
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map(d => d?.msg || JSON.stringify(d)).join(' — ') || fallback
  }
  return fallback
}

function PlanBlock({ plan_text }) {
  const [open, setOpen] = useState(false)
  if (!plan_text || !plan_text.trim()) {
    return (
      <p className="text-xs text-gray-400 italic mt-2">
        Plan non disponible — l'enseignant peut le resoumettre via ARIA.
      </p>
    )
  }
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none">
        <span className={`transition-transform text-xs ${open ? 'rotate-90' : ''}`}>▶</span>
        {open ? 'Masquer le plan' : 'Voir le plan complet'}
      </button>
      {open && (
        <pre className="mt-3 p-4 rounded-lg text-xs whitespace-pre-wrap leading-relaxed bg-gray-50 border border-gray-200 max-h-72 overflow-auto">
          {plan_text}
        </pre>
      )}
    </div>
  )
}

const NIVEAU_COLOR = {
  débutant:      'bg-green-100 text-green-700',
  intermediaire: 'bg-blue-100 text-blue-700',
  intermédiaire: 'bg-blue-100 text-blue-700',
  avancé:        'bg-orange-100 text-orange-700',
  expert:        'bg-red-100 text-red-700',
}

const STATUT_INSC = {
  inscrit:     'bg-blue-100 text-blue-700',
  en_cours:    'bg-yellow-100 text-yellow-700',
  'terminé':   'bg-green-100 text-green-700',
  'abandonné': 'bg-gray-100 text-gray-500',
}

const EMPTY_FORM = {
  code: '', titre: '', description: '', duree_semaines: 8,
  niveau: 'intermediaire', badge: '', objectifs: '', prerequis: '', competences_cibles: '', programme: '',
}

export default function RDFFFormations() {
  const [tab, setTab]               = useState('catalogue')
  const [formations, setFormations] = useState([])
  const [propositions, setPropositions] = useState([])
  const [selected, setSelected]     = useState(null)   // formation sélectionnée (panneau détail)
  const [inscrits, setInscrits]     = useState([])
  const [loadingInscrits, setLoadingInscrits] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing]       = useState(false)
  const [editForm, setEditForm]     = useState({})
  const [form, setForm]             = useState(EMPTY_FORM)
  const [refusModal, setRefusModal] = useState(null)
  const [refusComment, setRefusComment] = useState('')
  const [search, setSearch]         = useState('')
  const [editingInsc, setEditingInsc] = useState(null)  // { id, statut, progression, note_finale, badge_obtenu }
  const [savingInsc, setSavingInsc]   = useState(false)

  const reload = () => Promise.all([
    getFormations().then(r => setFormations(r.data)),
    api.get('/formations-proposees/proposees').then(r => setPropositions(r.data)),
  ]).catch(() => {})

  useEffect(() => { reload() }, [])

  const openDetail = async (f) => {
    setSelected(f)
    setEditing(false)
    setEditForm({ titre: f.titre, description: f.description || '', duree_semaines: f.duree_semaines || 8, programme: f.programme || '' })
    setInscrits([])
    setLoadingInscrits(true)
    inscritsFormation(f.id)
      .then(r => setInscrits(r.data))
      .catch(() => setInscrits([]))
      .finally(() => setLoadingInscrits(false))
  }

  const handleSaveInsc = async () => {
    if (!editingInsc) return
    setSavingInsc(true)
    try {
      await updateInscription(editingInsc.id, {
        statut:      editingInsc.statut,
        progression: Number(editingInsc.progression),
        note_finale: editingInsc.note_finale !== '' ? Number(editingInsc.note_finale) : null,
        badge_obtenu: editingInsc.badge_obtenu,
      })
      toast.success('Progression mise à jour')
      setInscrits(prev => prev.map(i =>
        i.inscription_id === editingInsc.id
          ? { ...i, statut: editingInsc.statut, progression: Number(editingInsc.progression), badge_obtenu: editingInsc.badge_obtenu }
          : i
      ))
      setEditingInsc(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erreur lors de la mise à jour'))
    } finally {
      setSavingInsc(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await createFormation({
        ...form,
        objectifs:          form.objectifs.split('\n').filter(Boolean),
        prerequis:          form.prerequis.split('\n').filter(Boolean),
        competences_cibles: form.competences_cibles.split('\n').filter(Boolean),
        programme:          form.programme || null,
      })
      toast.success('Formation créée !')
      setShowCreate(false)
      setForm(EMPTY_FORM)
      reload()
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  const handleSaveEdit = async () => {
    try {
      await updateFormation(selected.id, editForm)
      toast.success('Formation mise à jour')
      const updated = { ...selected, ...editForm }
      setSelected(updated)
      setFormations(prev => prev.map(f => f.id === selected.id ? updated : f))
      setEditing(false)
    } catch { toast.error('Erreur lors de la mise à jour') }
  }

  const toggleActive = async (f) => {
    try {
      await updateFormation(f.id, { is_active: !f.is_active })
      toast.success(f.is_active ? 'Formation désactivée' : 'Formation activée')
      const updated = { ...f, is_active: !f.is_active }
      setFormations(prev => prev.map(x => x.id === f.id ? updated : x))
      if (selected?.id === f.id) setSelected(updated)
    } catch { toast.error('Erreur') }
  }

  const handleAccepter = async (id) => {
    try {
      await accepterProposition(id)
      toast.success('Proposition acceptée — formation ajoutée au catalogue !')
      reload()
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  const handleRefuser = async () => {
    if (!refusComment.trim() || !refusModal) return
    try {
      await refuserProposition(refusModal.id, refusComment)
      toast.success('Proposition refusée — enseignant notifié')
      setRefusModal(null); setRefusComment('')
      reload()
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  const pending = propositions.filter(p => p.statut === 'en_attente')

  const visibleFormations = formations.filter(f => {
    if (!search) return true
    return `${f.titre} ${f.code} ${f.description || ''}`.toLowerCase().includes(search.toLowerCase())
  })

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"

  return (
    <div className="p-8 flex gap-6 h-full">

      {/* Colonne principale */}
      <div className={`flex flex-col ${selected ? 'flex-1 min-w-0' : 'w-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Gestion des formations</h2>
            <p className="text-sm mt-1 text-gray-500">Catalogue officiel + propositions ARIA</p>
          </div>
          <button onClick={() => { setShowCreate(!showCreate); setSelected(null) }}
            className="text-white text-sm font-semibold px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700">
            {showCreate ? 'Annuler' : '+ Nouvelle formation'}
          </button>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit shrink-0">
          {[
            ['catalogue', 'Catalogue', formations.length],
            ['propositions', 'Propositions ARIA', pending.length],
            ['historique', 'Historique', propositions.filter(p => p.statut !== 'en_attente').length],
          ].map(([k, lbl, count]) => (
            <button key={k} onClick={() => { setTab(k); setSelected(null); setShowCreate(false) }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: tab === k ? '#E30613' : 'transparent', color: tab === k ? '#fff' : '#4A4A4A' }}>
              {lbl}
              {count > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{ backgroundColor: tab === k ? 'rgba(255,255,255,0.25)' : '#E30613', color: 'white' }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Formulaire création ── */}
        {showCreate && (
          <form onSubmit={handleCreate}
            className="bg-white rounded-xl border border-gray-200 p-6 mb-5 space-y-4 shrink-0">
            <h3 className="font-semibold text-gray-800">Nouvelle formation</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['code', 'Code (ex: F006)', true, 'text'],
                ['titre', 'Titre', true, 'text'],
                ['badge', 'Badge obtenu', false, 'text'],
                ['duree_semaines', 'Durée (semaines)', false, 'number'],
              ].map(([k, lbl, req, type]) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{lbl}</label>
                  <input required={req} type={type}
                    value={form[k]}
                    onChange={e => setForm(p => ({ ...p, [k]: type === 'number' ? +e.target.value : e.target.value }))}
                    className={inputCls} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Niveau</label>
                <select value={form.niveau}
                  onChange={e => setForm(p => ({ ...p, niveau: e.target.value }))}
                  className={inputCls}>
                  {['débutant','intermediaire','avancé','expert'].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                ['objectifs', 'Objectifs (un par ligne)'],
                ['prerequis', 'Prérequis (un par ligne)'],
                ['competences_cibles', 'Compétences cibles (un par ligne)'],
              ].map(([k, lbl]) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{lbl}</label>
                  <textarea rows={3} value={form[k]}
                    onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                    placeholder="Un élément par ligne"
                    className={inputCls + ' resize-none'} />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Programme / Déroulement de la formation
              </label>
              <textarea rows={4} value={form.programme}
                onChange={e => setForm(p => ({ ...p, programme: e.target.value }))}
                placeholder="Décrivez le déroulement semaine par semaine, les modules, la méthode pédagogique..."
                className={inputCls + ' resize-none'} />
            </div>
            <div className="flex gap-3">
              <button type="submit"
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 rounded-lg">
                Créer la formation
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="border border-gray-300 text-sm px-5 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* ── Tab Catalogue ── */}
        {tab === 'catalogue' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="mb-3 shrink-0">
              <input
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="Rechercher..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="space-y-3 overflow-y-auto flex-1">
              {visibleFormations.map(f => (
                <div key={f.id}
                  onClick={() => openDetail(f)}
                  className="bg-white rounded-xl border p-5 cursor-pointer hover:shadow-md transition-all"
                  style={{
                    borderColor: selected?.id === f.id ? '#E30613' : '#E8E8E8',
                    borderWidth: selected?.id === f.id ? '2px' : '1px',
                  }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono text-gray-400">{f.code}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${NIVEAU_COLOR[f.niveau?.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
                          {f.niveau}
                        </span>
                        {!f.is_active && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-800">{f.titre}</h3>
                      <div className="flex gap-3 mt-1 text-sm text-gray-500">
                        {f.duree_semaines && <span>{f.duree_semaines} semaines</span>}
                        {f.badge && <span>🏅 {f.badge}</span>}
                      </div>
                      {f.description && (
                        <p className="text-xs text-gray-400 mt-1.5 line-clamp-1">{f.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openDetail(f)}
                        className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50">
                        Détails & Inscrits
                      </button>
                      <button onClick={() => toggleActive(f)}
                        className={`text-xs px-3 py-1.5 rounded-lg border ${
                          f.is_active
                            ? 'border-gray-200 text-gray-500 hover:bg-gray-50'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                        }`}>
                        {f.is_active ? 'Désactiver' : 'Activer'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {visibleFormations.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <p className="text-3xl mb-2">🎓</p>
                  <p className="text-sm text-gray-400">Aucune formation dans le catalogue</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab Propositions ARIA ── */}
        {tab === 'propositions' && (
          <div className="space-y-4 overflow-y-auto flex-1">
            {pending.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-3xl mb-2">🤖</p>
                <p className="font-semibold text-gray-800">Aucune proposition en attente</p>
                <p className="text-sm mt-1 text-gray-500">
                  Les plans générés par ARIA et soumis par les enseignants apparaîtront ici.
                </p>
              </div>
            )}
            {pending.map(p => (
              <div key={p.id} className="bg-white rounded-xl border-2 p-6" style={{ borderColor: '#FDE68A' }}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
                        🤖 Généré par ARIA
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(p.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      {p.duree_semaines && <span className="text-xs text-gray-400">{p.duree_semaines} semaines</span>}
                      {p.niveau && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${NIVEAU_COLOR[p.niveau?.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>{p.niveau}</span>}
                    </div>
                    <h3 className="font-bold text-lg text-gray-900">{p.titre}</h3>
                    {p.objectif && <p className="text-sm mt-1 text-gray-600">{p.objectif}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleAccepter(p.id)}
                      className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-green-600 hover:bg-green-700">
                      Valider → Catalogue
                    </button>
                    <button onClick={() => { setRefusModal(p); setRefusComment('') }}
                      className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700">
                      Refuser
                    </button>
                  </div>
                </div>
                <PlanBlock plan_text={p.plan_text} />
              </div>
            ))}
          </div>
        )}

        {/* ── Tab Historique ── */}
        {tab === 'historique' && (
          <div className="space-y-3 overflow-y-auto flex-1">
            {propositions.filter(p => p.statut !== 'en_attente').map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-gray-800">{p.titre}</p>
                  <p className="text-xs mt-0.5 text-gray-500">
                    {p.duree_semaines} sem. • {new Date(p.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  {p.statut === 'refusee' && p.commentaire_rdff && (
                    <p className="text-xs mt-1 italic text-red-600">Motif : {p.commentaire_rdff}</p>
                  )}
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  p.statut === 'acceptee' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {p.statut === 'acceptee' ? 'Acceptée' : 'Refusée'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Panneau détail (droite) ── */}
      {selected && (
        <div className="w-96 shrink-0 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">

          {/* Header panneau */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{selected.code}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${NIVEAU_COLOR[selected.niveau?.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
                    {selected.niveau}
                  </span>
                  {!selected.is_active && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 leading-tight">{selected.titre}</h3>
              </div>
              <button onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 shrink-0 text-lg leading-none">✕</button>
            </div>
            <div className="flex gap-3 mt-2 text-xs text-gray-500 flex-wrap">
              {selected.duree_semaines && <span>📅 {selected.duree_semaines} semaines</span>}
              {selected.badge && <span>🏅 <span className="font-medium text-yellow-600">{selected.badge}</span></span>}
            </div>
          </div>

          {/* Corps scrollable */}
          <div className="overflow-y-auto flex-1 p-5 space-y-4">

            {/* Edition ou lecture */}
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Titre</label>
                  <input value={editForm.titre}
                    onChange={e => setEditForm(p => ({ ...p, titre: e.target.value }))}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <textarea rows={3} value={editForm.description}
                    onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                    className={inputCls + ' resize-none'} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Programme / Déroulement
                  </label>
                  <textarea rows={5} value={editForm.programme || ''}
                    onChange={e => setEditForm(p => ({ ...p, programme: e.target.value }))}
                    placeholder="Décrivez le déroulement, les modules, la méthode pédagogique..."
                    className={inputCls + ' resize-none'} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Durée (semaines)</label>
                  <input type="number" value={editForm.duree_semaines}
                    onChange={e => setEditForm(p => ({ ...p, duree_semaines: +e.target.value }))}
                    className={inputCls} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-lg">
                    Enregistrer
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="flex-1 border border-gray-300 text-xs text-gray-600 py-2 rounded-lg hover:bg-gray-50">
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Description */}
                {selected.description && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Description</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{selected.description}</p>
                  </div>
                )}

                {/* Programme */}
                {selected.programme && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                      Programme & Déroulement
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 rounded-lg p-3 border border-gray-100">
                      {selected.programme}
                    </p>
                  </div>
                )}

                {/* Objectifs */}
                {selected.objectifs?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                      Objectifs ({selected.objectifs.length})
                    </p>
                    <ul className="space-y-1.5">
                      {selected.objectifs.map((o, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-gray-700">
                          <span className="text-red-500 mt-0.5 shrink-0">✓</span>{o}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prérequis */}
                {selected.prerequis?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Prérequis</p>
                    <ul className="space-y-1">
                      {selected.prerequis.map((p, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-gray-600">
                          <span className="text-orange-400 mt-0.5 shrink-0">→</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Compétences cibles */}
                {selected.competences_cibles?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                      Compétences développées
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {selected.competences_cibles.map(c => (
                        <span key={c} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Liste des inscrits */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Inscrits ({inscrits.length})
              </p>
              {loadingInscrits ? (
                <p className="text-xs text-gray-400">Chargement...</p>
              ) : inscrits.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aucun inscrit pour cette formation</p>
              ) : (
                <div className="space-y-2">
                  {inscrits.map(i => {
                    const isEditing = editingInsc?.id === i.inscription_id
                    return (
                      <div key={i.inscription_id}
                        className={`rounded-xl border p-3 transition-all ${isEditing ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>

                        {/* En-tête inscrit */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{i.nom_complet}</p>
                            <p className="text-xs text-gray-400 truncate">{i.email}</p>
                          </div>
                          {!isEditing ? (
                            <button
                              onClick={() => setEditingInsc({
                                id:           i.inscription_id,
                                statut:       i.statut,
                                progression:  i.progression,
                                note_finale:  i.note_finale ?? '',
                                badge_obtenu: i.badge_obtenu,
                              })}
                              className="text-xs text-red-600 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50 shrink-0 ml-2">
                              Modifier
                            </button>
                          ) : (
                            <div className="flex gap-1 shrink-0 ml-2">
                              <button onClick={handleSaveInsc} disabled={savingInsc}
                                className="text-xs text-white bg-green-600 hover:bg-green-700 px-2 py-1 rounded-lg disabled:opacity-60">
                                {savingInsc ? '...' : 'Sauver'}
                              </button>
                              <button onClick={() => setEditingInsc(null)}
                                className="text-xs text-gray-500 border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-100">
                                ✕
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Lecture */}
                        {!isEditing && (
                          <div className="flex items-center gap-3 flex-wrap">
                            {/* Barre progression */}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Progression</span>
                                <span className="font-bold text-red-600">{i.progression}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-red-500 transition-all"
                                  style={{ width: `${Math.min(i.progression, 100)}%` }} />
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUT_INSC[i.statut] || 'bg-gray-100 text-gray-500'}`}>
                              {i.statut}
                            </span>
                            {i.badge_obtenu && <span className="text-sm">🏅</span>}
                          </div>
                        )}

                        {/* Edition inline */}
                        {isEditing && (
                          <div className="space-y-2.5 mt-1">
                            {/* Statut */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
                              <select
                                value={editingInsc.statut}
                                onChange={e => setEditingInsc(p => ({ ...p, statut: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400">
                                <option value="inscrit">Inscrit</option>
                                <option value="en_cours">En cours</option>
                                <option value="terminé">Terminé</option>
                                <option value="abandonné">Abandonné</option>
                              </select>
                            </div>

                            {/* Progression */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Progression : <span className="text-red-600 font-bold">{editingInsc.progression}%</span>
                              </label>
                              <input type="range" min="0" max="100" step="5"
                                value={editingInsc.progression}
                                onChange={e => setEditingInsc(p => ({ ...p, progression: e.target.value }))}
                                className="w-full accent-red-600" />
                              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                                <span>0%</span><span>50%</span><span>100%</span>
                              </div>
                            </div>

                            {/* Note finale */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Note finale (/ 20)</label>
                              <input type="number" min="0" max="20" step="0.5"
                                placeholder="ex : 16.5"
                                value={editingInsc.note_finale}
                                onChange={e => setEditingInsc(p => ({ ...p, note_finale: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>

                            {/* Badge */}
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input type="checkbox"
                                checked={editingInsc.badge_obtenu}
                                onChange={e => setEditingInsc(p => ({ ...p, badge_obtenu: e.target.checked }))}
                                className="accent-red-600 w-4 h-4" />
                              <span className="text-xs font-medium text-gray-700">
                                Badge obtenu 🏅 <span className="text-gray-400 font-normal">(déclenche le statut Talent)</span>
                              </span>
                            </label>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Actions panneau */}
          <div className="p-4 border-t border-gray-100 flex gap-2">
            <button onClick={() => setEditing(true)}
              className="flex-1 border border-gray-300 text-sm text-gray-700 py-2 rounded-lg hover:bg-gray-50">
              Modifier
            </button>
            <button onClick={() => toggleActive(selected)}
              className={`flex-1 text-sm font-semibold py-2 rounded-lg border ${
                selected.is_active
                  ? 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  : 'border-green-200 text-green-600 hover:bg-green-50'
              }`}>
              {selected.is_active ? 'Désactiver' : 'Activer'}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Refus ── */}
      {refusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
            <h3 className="text-lg font-bold mb-1 text-gray-900">Refuser la proposition</h3>
            <p className="text-sm mb-1 text-gray-500">
              Formation : <span className="font-semibold text-gray-700">{refusModal.titre}</span>
            </p>
            <p className="text-sm mb-4 text-gray-500">
              L'enseignant recevra une notification avec votre motif.
            </p>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wide text-gray-600">
              Motif du refus (obligatoire)
            </label>
            <textarea rows={4} value={refusComment}
              onChange={e => setRefusComment(e.target.value)}
              placeholder="ex: Le plan manque de précision sur les objectifs pédagogiques..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setRefusModal(null); setRefusComment('') }}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-600">
                Annuler
              </button>
              <button onClick={handleRefuser} disabled={!refusComment.trim()}
                className="flex-1 py-3 rounded-xl text-white text-sm font-bold bg-red-600 hover:bg-red-700 disabled:opacity-60">
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

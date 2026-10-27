import { useEffect, useState } from 'react'
import { getUsers } from '../../api/users'
import { getOffres } from '../../api/offres'
import { getFormations } from '../../api/formations'
import { getAvantages, createAvantage, deleteAvantage } from '../../api/avantages'
import api from '../../api/client'
import toast from 'react-hot-toast'

const AVANTAGES_DEFAUT = [
  { id: 1, categorie: 'Financier',       libelle: 'Bonus sur performance annuelle' },
  { id: 2, categorie: 'Financier',       libelle: 'Prime de reconnaissance Talent' },
  { id: 3, categorie: 'Carriere',        libelle: 'Acces aux postes de responsabilite' },
  { id: 4, categorie: 'Carriere',        libelle: 'Charge de missions strategiques' },
  { id: 5, categorie: 'Opportunite',     libelle: 'Benefice d\'opportunites de publication' },
  { id: 6, categorie: 'Reconnaissance',  libelle: 'Distinction institutionnelle ESPRIT' },
  { id: 7, categorie: 'Reconnaissance',  libelle: 'Profil mis en avant sur la plateforme' },
]

const CAT_COLOR = {
  'Financier':      { bg: '#FFF9E6', text: '#B45309', border: '#FDE68A' },
  'Carriere':       { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  'Opportunite':    { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  'Reconnaissance': { bg: '#FFF0F0', text: '#B91C1C', border: '#FECACA' },
}

export default function DirectionDashboard() {
  const [stats, setStats]           = useState({ users: 0, talents: 0, enseignants: 0, offres: 0, formations: 0 })
  const [tab, setTab]               = useState('supervision')
  const [enseignants, setEnseignants] = useState([])
  const [talentsEnAttente, setTalentsEnAttente] = useState([])
  const [selectedProfil, setSelectedProfil]     = useState(null)
  const [avantages, setAvantages]     = useState([])
  const [editMode, setEditMode]       = useState(false)
  const [newAvantage, setNewAvantage] = useState({ categorie: 'Financier', libelle: '' })

  const loadAvantages = () => getAvantages().then(r => setAvantages(r.data)).catch(() => {})

  useEffect(() => {
    loadAvantages()
    Promise.all([getUsers(), getOffres(), getFormations()]).then(([u, o, f]) => {
      const all = u.data
      setStats({
        users:       all.length,
        talents:     all.filter(x => x.is_talent).length,
        enseignants: all.filter(x => ['enseignant','talent'].includes(x.role)).length,
        offres:      o.data.filter(x => x.statut === 'ouverte').length,
        formations:  f.data.length,
      })
      setEnseignants(all.filter(x => ['enseignant','talent'].includes(x.role)))
      // Talents en attente de validation = enseignants avec demande (simulation)
      setTalentsEnAttente(all.filter(x => x.role === 'enseignant' && !x.is_talent).slice(0, 3))
    }).catch(() => {})
  }, [])

  const recommanderTalent = async (user) => {
    try {
      await api.post('/recommandations', {
        enseignant_id:          user.id,
        dim_scientifique:       4,
        dim_pedagogique:        4,
        dim_communicationnel:   4,
        dim_comportemental:     4,
        dim_autres:             4,
        commentaire_global:     'Recommandation de la Direction Générale pour le statut Talent ESPRIT.',
        annee_academique:       '2024-2025',
      })
      toast.success(`Recommandation soumise au RH pour ${user.prenom} ${user.nom}`)
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur lors de la recommandation') }
  }

  const validerTalent = async (user) => {
    try {
      await api.post(`/evaluations/valider-talent/${user.id}`, { decision: 'valider' })
      toast.success(`${user.prenom} ${user.nom} est maintenant Talent ESPRIT !`)
      setTalentsEnAttente(p => p.filter(u => u.id !== user.id))
      setStats(s => ({ ...s, talents: s.talents + 1 }))
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur validation') }
  }

  const addAvantage = async () => {
    if (!newAvantage.libelle.trim()) return
    try {
      await createAvantage(newAvantage)
      toast.success('Avantage ajoute !')
      setNewAvantage({ categorie: 'Financier', libelle: '' })
      loadAvantages()
    } catch { toast.error('Erreur ajout') }
  }

  const removeAvantage = async (id) => {
    try {
      await deleteAvantage(id)
      toast.success('Avantage supprime')
      loadAvantages()
    } catch { toast.error('Erreur suppression') }
  }

  const TABS = [
    { key: 'supervision', label: 'Supervision', icon: '📊' },
    { key: 'talents',     label: 'Talents & Validation', icon: '⭐' },
    { key: 'profils',     label: 'Profils enseignants', icon: '👥' },
    { key: 'valorisation',label: 'Valorisation', icon: '🏆' },
  ]

  return (
    <div className="p-8">
      {/* En-tête */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Direction Generale</h2>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
            style={{ backgroundColor: '#E30613' }}
          >
            Supervision
          </span>
        </div>
        <p className="text-sm" style={{ color: '#8C8C8C' }}>
          Vue globale de la plateforme — validation des Talents — valorisation
        </p>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-8 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: tab === t.key ? '#E30613' : 'transparent',
              color: tab === t.key ? '#fff' : '#4A4A4A',
            }}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── TAB : Supervision ─────────────────────────────────────── */}
      {tab === 'supervision' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              ['Utilisateurs',  stats.users,        '#3b82f6'],
              ['Enseignants',   stats.enseignants,   '#8b5cf6'],
              ['Talents',       stats.talents,       '#f59e0b'],
              ['Offres actives',stats.offres,        '#22c55e'],
              ['Formations',    stats.formations,    '#E30613'],
            ].map(([lbl, val, color]) => (
              <div
                key={lbl}
                className="bg-white rounded-xl border border-gray-200 p-5 text-center"
              >
                <p className="text-3xl font-bold" style={{ color }}>{val}</p>
                <p className="text-xs mt-1 font-medium" style={{ color: '#8C8C8C' }}>{lbl}</p>
              </div>
            ))}
          </div>

          {/* Relations DG */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { titre: 'RDFF', desc: 'Responsable du Departement de Formation des Formateurs. Propose les formations generiques aux enseignants. En relation directe avec la DG pour aligner les objectifs de developpement des talents.', icon: '🎓', color: '#8b5cf6' },
              { titre: 'RH / Admin', desc: 'Chef de departement administratif. Gere le processus de recrutement et la validation des Talents. Soumet les profils Talent a la DG pour approbation finale.', icon: '🧑‍💼', color: '#22c55e' },
            ].map(({ titre, desc, icon, color }) => (
              <div key={titre} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{icon}</span>
                  <h3 className="font-bold" style={{ color: '#1A1A1A' }}>Relation avec {titre}</h3>
                </div>
                <p className="text-sm" style={{ color: '#4A4A4A' }}>{desc}</p>
                <button
                  onClick={() => setTab('talents')}
                  className="mt-4 text-sm font-medium"
                  style={{ color }}
                >
                  Voir les actions →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB : Talents & Validation ───────────────────────────── */}
      {tab === 'talents' && (
        <div className="space-y-6">
          {/* Talents validés */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold mb-4" style={{ color: '#1A1A1A' }}>
              Talents ESPRIT validés ({enseignants.filter(e => e.is_talent).length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {enseignants.filter(e => e.is_talent).map(e => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 p-4 rounded-xl border"
                  style={{ backgroundColor: '#FFFDF0', borderColor: '#FDE68A' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: '#f59e0b' }}
                  >
                    {e.prenom?.[0]}{e.nom?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: '#1A1A1A' }}>
                      ★ {e.prenom} {e.nom}
                    </p>
                    <p className="text-xs truncate" style={{ color: '#8C8C8C' }}>{e.departement}</p>
                  </div>
                </div>
              ))}
              {enseignants.filter(e => e.is_talent).length === 0 && (
                <p className="text-sm col-span-3" style={{ color: '#8C8C8C' }}>Aucun Talent validé pour l'instant.</p>
              )}
            </div>
          </div>

          {/* Profils à recommander / valider */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold mb-1" style={{ color: '#1A1A1A' }}>
              Recommander ou valider un Talent
            </h3>
            <p className="text-sm mb-4" style={{ color: '#8C8C8C' }}>
              La DG peut recommander un enseignant au RH ou valider directement le statut Talent.
            </p>
            <div className="space-y-3">
              {enseignants.filter(e => !e.is_talent).map(e => (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ backgroundColor: '#E30613' }}
                    >
                      {e.prenom?.[0]}{e.nom?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: '#1A1A1A' }}>{e.prenom} {e.nom}</p>
                      <p className="text-xs" style={{ color: '#8C8C8C' }}>{e.departement} • {e.specialite || 'Generaliste'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => recommanderTalent(e)}
                      className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors"
                      style={{ borderColor: '#E30613', color: '#E30613' }}
                    >
                      Recommander au RH
                    </button>
                    <button
                      onClick={() => validerTalent(e)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium text-white transition-colors"
                      style={{ backgroundColor: '#E30613' }}
                    >
                      Valider Talent
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB : Profils enseignants (lecture seule) ─────────────── */}
      {tab === 'profils' && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: '#8C8C8C' }}>
            Consultation des profils — aucune modification possible depuis ce niveau.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {enseignants.map(e => (
              <button
                key={e.id}
                onClick={() => setSelectedProfil(selectedProfil?.id === e.id ? null : e)}
                className="bg-white rounded-xl border p-5 text-left hover:shadow-md transition-shadow"
                style={{ borderColor: selectedProfil?.id === e.id ? '#E30613' : '#E8E8E8' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: e.is_talent ? '#f59e0b' : '#E30613' }}
                  >
                    {e.is_talent ? '★' : `${e.prenom?.[0]}${e.nom?.[0]}`}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: '#1A1A1A' }}>
                      {e.prenom} {e.nom}
                    </p>
                    <p className="text-xs truncate" style={{ color: '#8C8C8C' }}>{e.departement}</p>
                  </div>
                </div>
                {e.competences?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {e.competences.slice(0, 3).map(c => (
                      <span key={c} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                    {e.competences.length > 3 && (
                      <span className="text-xs text-gray-400">+{e.competences.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Détail profil */}
          {selectedProfil && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg" style={{ color: '#1A1A1A' }}>
                  {selectedProfil.prenom} {selectedProfil.nom}
                  {selectedProfil.is_talent && <span className="ml-2 text-yellow-500">★ Talent</span>}
                </h3>
                <button
                  onClick={() => setSelectedProfil(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {[
                  ['Email', selectedProfil.email],
                  ['Departement', selectedProfil.departement],
                  ['Specialite', selectedProfil.specialite || '—'],
                  ['Role', selectedProfil.role],
                  ['Score global', `${selectedProfil.score_global || 0}/100`],
                  ['Telephone', selectedProfil.telephone || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium mb-0.5" style={{ color: '#8C8C8C' }}>{k}</p>
                    <p className="font-semibold text-sm truncate" style={{ color: '#1A1A1A' }}>{v}</p>
                  </div>
                ))}
              </div>
              {selectedProfil.competences?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium mb-2" style={{ color: '#8C8C8C' }}>COMPETENCES</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfil.competences.map(c => (
                      <span
                        key={c}
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ backgroundColor: '#FFF0F0', color: '#E30613' }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedProfil.cv_path && (
                <a
                  href={`http://localhost:8002${selectedProfil.cv_path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-4 text-sm font-medium px-4 py-2 rounded-lg border transition-colors"
                  style={{ borderColor: '#E30613', color: '#E30613' }}
                >
                  Voir le CV PDF →
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB : Valorisation (mode éditeur) ────────────────────── */}
      {tab === 'valorisation' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg" style={{ color: '#1A1A1A' }}>Module de valorisation des Talents</h3>
              <p className="text-sm mt-0.5" style={{ color: '#8C8C8C' }}>
                Definissez les avantages accordes aux Talents ESPRIT. Visible par tous, choisissable par les Talents.
              </p>
            </div>
            <button
              onClick={() => setEditMode(p => !p)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: editMode ? '#4A4A4A' : '#E30613' }}
            >
              {editMode ? 'Terminer la modification' : '✏️ Modifier la liste'}
            </button>
          </div>

          {/* Avantages par catégorie */}
          {['Financier', 'Carriere', 'Opportunite', 'Reconnaissance'].map(cat => {
            const items = avantages.filter(a => a.categorie === cat)
            const colors = CAT_COLOR[cat]
            return (
              <div
                key={cat}
                className="rounded-xl border p-5"
                style={{ backgroundColor: colors.bg, borderColor: colors.border }}
              >
                <h4 className="font-bold mb-3 text-sm uppercase tracking-wider" style={{ color: colors.text }}>
                  {cat}
                </h4>
                <div className="space-y-2">
                  {items.map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-3 bg-white rounded-lg px-4 py-2.5 border" style={{ borderColor: colors.border }}>
                      <div className="flex items-center gap-2">
                        <span style={{ color: colors.text }}>✓</span>
                        <span className="text-sm" style={{ color: '#1A1A1A' }}>{a.libelle}</span>
                      </div>
                      {editMode && (
                        <button
                          onClick={() => removeAvantage(a.id)}
                          className="text-gray-400 hover:text-red-500 text-lg leading-none shrink-0"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs" style={{ color: colors.text, opacity: 0.6 }}>
                      Aucun avantage dans cette categorie.
                    </p>
                  )}
                </div>
              </div>
            )
          })}

          {/* Formulaire ajout */}
          {editMode && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="font-semibold mb-4" style={{ color: '#1A1A1A' }}>Ajouter un avantage</h4>
              <div className="flex gap-3">
                <select
                  value={newAvantage.categorie}
                  onChange={e => setNewAvantage(p => ({ ...p, categorie: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none shrink-0"
                  style={{ width: '160px' }}
                >
                  {['Financier', 'Carriere', 'Opportunite', 'Reconnaissance'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  value={newAvantage.libelle}
                  onChange={e => setNewAvantage(p => ({ ...p, libelle: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addAvantage()}
                  placeholder="Description de l'avantage..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <button
                  onClick={addAvantage}
                  className="px-5 py-2 rounded-lg text-white text-sm font-medium shrink-0"
                  style={{ backgroundColor: '#E30613' }}
                >
                  Ajouter
                </button>
              </div>
            </div>
          )}

          {/* Note info */}
          <div
            className="rounded-xl p-4 text-sm"
            style={{ backgroundColor: '#FFF9F9', border: '1px solid #FECACA', color: '#991B1B' }}
          >
            Ces avantages sont visibles en lecture seule par tous les membres de la plateforme.
            Les Talents peuvent choisir leurs avantages depuis leur tableau de bord.
            Seule la Direction Generale peut modifier cette liste.
          </div>
        </div>
      )}
    </div>
  )
}

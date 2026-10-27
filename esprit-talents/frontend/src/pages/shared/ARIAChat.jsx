import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ariaChat, ariaPlan, soumettreProposition, mesPropositions } from '../../api/aria'
import api from '../../api/client'
import toast from 'react-hot-toast'

const ARIA_URL = 'http://localhost:8001'

async function downloadPlanPDF({ planText, userName, objectif, duree, niveau }) {
  const res = await fetch(`${ARIA_URL}/plan/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan_text: planText,
      user_name: userName,
      objectif:  objectif,
      duree:     duree,
      niveau:    niveau,
    }),
  })
  if (!res.ok) throw new Error('Erreur génération PDF')
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `plan_aria_${userName.replace(/\s+/g, '_')}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ARIAChat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Bonjour ${user?.prenom || ''} ! Je suis **ARIA**, votre assistant pedagogique ESPRIT.\n\nJe peux vous aider a :\n- Generer un **plan de formation personnalise** (telecharge en PDF)\n- Repondre a vos questions sur les formations ESPRIT\n- Analyser vos competences et vous guider vers le statut Talent\n\nComment puis-je vous aider ?`,
      isPlan: false,
    }
  ])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [mode, setMode]         = useState('chat')
  const [planType, setPlanType] = useState('formation') // 'formation' | 'carriere'
  const [planForm, setPlanForm] = useState({
    objectif: '', competences_actuelles: '', duree_semaines: 8, niveau: 'intermediaire',
  })
  const [lastPlan, setLastPlan]         = useState(null)
  const [pdfLoading, setPdfLoading]     = useState(false)
  const [submitModal, setSubmitModal]   = useState(null)   // plan à soumettre
  const [submitTitle, setSubmitTitle]   = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [mesProp, setMesProp]           = useState([])
  const [showProp, setShowProp]         = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Restaurer l'historique de conversation depuis localStorage au montage
  // (sinon les messages disparaissent quand on quitte la page ARIA et qu'on y revient)
  useEffect(() => {
    if (!user?.id) return
    try {
      const saved = localStorage.getItem(`aria_chat_${user.id}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed)
      }
    } catch {}
  }, [user?.id])

  // Sauvegarder la conversation a chaque nouveau message
  useEffect(() => {
    if (!user?.id) return
    try {
      localStorage.setItem(`aria_chat_${user.id}`, JSON.stringify(messages))
    } catch {}
  }, [messages, user?.id])

  const loadPropositions = () =>
    mesPropositions().then(r => setMesProp(r.data)).catch(() => {})

  useEffect(() => { loadPropositions() }, [])

  const handleSoumettre = async () => {
    if (!submitTitle.trim() || !submitModal) return
    setSubmitting(true)
    try {
      await soumettreProposition({
        titre:          submitTitle,
        plan_text:      submitModal.text,
        objectif:       submitModal.objectif,
        duree_semaines: submitModal.duree,
        niveau:         submitModal.niveau,
      })
      toast.success('Plan soumis au RDFF ! Vous serez notifie de la decision.')
      setSubmitModal(null)
      setSubmitTitle('')
      loadPropositions()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la soumission')
    } finally {
      setSubmitting(false)
    }
  }

  const addMessage = (role, content, isPlan = false, planMeta = null) => {
    setMessages(m => [...m, { role, content, isPlan, planMeta }])
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    addMessage('user', msg)
    setLoading(true)
    try {
      const { data } = await ariaChat(msg)
      addMessage('assistant', data.answer)
    } catch (err) {
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout')
      toast.error(isTimeout
        ? 'ARIA prend trop de temps — le modèle LLM est peut-être surchargé, réessayez'
        : 'ARIA est indisponible — vérifiez que le service tourne sur le port 8001'
      )
    } finally {
      setLoading(false)
    }
  }

  const generatePlan = async (e) => {
    e.preventDefault()
    setLoading(true)
    const competences = planForm.competences_actuelles
      || user?.competences?.slice(0, 8).join(', ') || ''

    if (planType === 'carriere') {
      // Pour un plan de carrière, on passe par le chat ARIA avec contexte enrichi
      const careerMsg = [
        `Génère-moi un plan de carrière détaillé.`,
        `Objectif : ${planForm.objectif}`,
        competences ? `Mes compétences actuelles : ${competences}` : '',
        `Durée envisagée : ${planForm.duree_semaines} semaines`,
        `Niveau : ${planForm.niveau}`,
        `Propose des étapes concrètes, les compétences à développer, les formations recommandées du catalogue ESPRIT, et les postes cibles.`,
      ].filter(Boolean).join('\n')
      addMessage('user', `Plan de carrière — ${planForm.objectif}`)
      try {
        const { data } = await ariaChat(careerMsg)
        addMessage('assistant', data.answer)
        setMode('chat')
      } catch {
        toast.error('ARIA indisponible — vérifiez que le service tourne sur le port 8001')
      } finally {
        setLoading(false)
      }
      return
    }

    addMessage('user', `Generer un plan de ${planForm.duree_semaines} semaines : ${planForm.objectif}`)

    try {
      const { data } = await ariaPlan({
        objectif:              planForm.objectif,
        competences_actuelles: competences,
        duree_semaines:        planForm.duree_semaines,
        niveau:                planForm.niveau,
      })
      const meta = {
        objectif:  planForm.objectif,
        userName:  `${user?.prenom || ''} ${user?.nom || ''}`.trim() || 'Enseignant',
        duree:     planForm.duree_semaines,
        niveau:    planForm.niveau,
      }
      addMessage('assistant', data.plan, true, meta)
      setLastPlan({ text: data.plan, ...meta })
      setMode('chat')
    } catch (err) {
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout')
      toast.error(isTimeout
        ? 'ARIA génère toujours... Le modèle est lent, réessayez dans quelques secondes'
        : 'ARIA indisponible — vérifiez que le service tourne sur le port 8001'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async (planText, meta) => {
    setPdfLoading(true)
    try {
      await downloadPlanPDF({
        planText,
        userName: meta?.userName || `${user?.prenom} ${user?.nom}`,
        objectif: meta?.objectif || 'Plan de Formation',
        duree:    meta?.duree    || 8,
        niveau:   meta?.niveau   || 'intermediaire',
      })
      toast.success('PDF telecharge avec succes !')
    } catch {
      toast.error('Erreur lors de la generation du PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const NIVEAUX = ['debutant', 'intermediaire', 'avance', 'expert']

  const STATUT_STYLE = {
    en_attente: { bg: '#FFF9E6', text: '#B45309', label: 'En attente RDFF' },
    acceptee:   { bg: '#F0FDF4', text: '#15803D', label: 'Acceptee - Au catalogue' },
    refusee:    { bg: '#FFF0F0', text: '#B91C1C', label: 'Refusee' },
  }

  return (
    <div className="flex flex-col h-screen bg-white">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-8 py-4 border-b shrink-0"
        style={{ borderColor: '#E8E8E8' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: '#E30613' }}
          >
            A
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>Assistant ARIA</h2>
            <p className="text-xs" style={{ color: '#8C8C8C' }}>
              Memoire personnelle · Anti-hallucination · PDF
              <span
                className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}
              >
                🔒 Session de {user?.prenom}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Bouton dernier plan PDF */}
          {lastPlan && (
            <button
              onClick={() => handleDownloadPDF(lastPlan.text, lastPlan)}
              disabled={pdfLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-60"
              style={{ borderColor: '#E30613', color: '#E30613' }}
            >
              <span>{pdfLoading ? '...' : '⬇'}</span>
              {pdfLoading ? 'Generation...' : 'Dernier plan PDF'}
            </button>
          )}

          {/* Mes propositions */}
          <button
            onClick={() => setShowProp(p => !p)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
            style={{ borderColor: '#E8E8E8', color: '#4A4A4A' }}
          >
            <span>📋</span>
            Mes propositions
            {mesProp.filter(p => p.statut === 'en_attente').length > 0 && (
              <span className="bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                {mesProp.filter(p => p.statut === 'en_attente').length}
              </span>
            )}
          </button>

          {/* Toggle mode */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[['chat', '💬 Chat'], ['plan', '📋 Plan']].map(([k, lbl]) => (
              <button
                key={k}
                onClick={() => setMode(k)}
                className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
                style={{
                  backgroundColor: mode === k ? '#E30613' : 'transparent',
                  color: mode === k ? '#fff' : '#4A4A4A',
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mode Plan ────────────────────────────────────────────── */}
      {mode === 'plan' && (
        <div className="flex-1 overflow-auto p-8">
          <form
            onSubmit={generatePlan}
            className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-5"
          >
            <div>
              {/* Toggle formation / carrière */}
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4 w-fit">
                {[['formation', '📋 Plan de formation'], ['carriere', '🚀 Plan de carrière']].map(([k, lbl]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPlanType(k)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: planType === k ? '#E30613' : 'transparent',
                      color: planType === k ? '#fff' : '#4A4A4A',
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <h3 className="text-lg font-bold mb-1" style={{ color: '#1A1A1A' }}>
                {planType === 'carriere' ? 'Générer un plan de carrière' : 'Générer un plan de formation'}
              </h3>
              <p className="text-sm" style={{ color: '#8C8C8C' }}>
                {planType === 'carriere'
                  ? 'ARIA analyse vos compétences CV et propose un parcours d\'évolution personnalisé avec étapes et formations recommandées.'
                  : 'ARIA crée un programme personnalisé basé sur vos objectifs. Le plan est téléchargeable en PDF professionnel.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>
                {planType === 'carriere' ? 'Objectif de carrière *' : 'Objectif de la formation *'}
              </label>
              <input
                required
                value={planForm.objectif}
                onChange={e => setPlanForm(p => ({ ...p, objectif: e.target.value }))}
                placeholder={planType === 'carriere'
                  ? "ex: Devenir Chef de département, encadrer une équipe de recherche…"
                  : "ex: Maitriser React pour integrer l'IA dans mes cours"}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>
                Competences actuelles
                <span className="ml-2 font-normal normal-case" style={{ color: '#8C8C8C' }}>
                  {user?.competences?.length > 0
                    ? `(${user.competences.slice(0, 5).join(', ')} depuis votre CV)`
                    : '(optionnel)'}
                </span>
              </label>
              <input
                value={planForm.competences_actuelles}
                onChange={e => setPlanForm(p => ({ ...p, competences_actuelles: e.target.value }))}
                placeholder="ex: Python, bases de la pedagogie, Excel..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>
                  Duree (semaines)
                </label>
                <input
                  type="number" min={1} max={52}
                  value={planForm.duree_semaines}
                  onChange={e => setPlanForm(p => ({ ...p, duree_semaines: +e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>
                  Niveau
                </label>
                <select
                  value={planForm.niveau}
                  onChange={e => setPlanForm(p => ({ ...p, niveau: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                >
                  {NIVEAUX.map(n => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}
                </select>
              </div>
            </div>

            {/* Note anti-hallucination */}
            <div
              className="flex items-start gap-3 p-4 rounded-xl text-sm"
              style={{ backgroundColor: '#FFF9F9', border: '1px solid #FECACA' }}
            >
              <span className="text-lg shrink-0">🛡️</span>
              <div style={{ color: '#7F1D1D' }}>
                <p className="font-semibold">ARIA — Mode strict</p>
                <p className="text-xs mt-0.5">
                  Le plan est base sur les formations officielles ESPRIT indexees et vos objectifs reels.
                  Aucune information inventee. Si une formation n'est pas dans le catalogue, ARIA le signale explicitement.
                </p>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60"
              style={{ backgroundColor: '#E30613' }}
            >
              {loading
                ? 'ARIA génère...'
                : planType === 'carriere'
                  ? '🚀 Générer mon plan de carrière'
                  : 'Générer le plan + PDF'}
            </button>
          </form>
        </div>
      )}

      {/* ── Mode Chat ────────────────────────────────────────────── */}
      {mode === 'chat' && (
        <>
          <div className="flex-1 overflow-auto px-8 py-6 space-y-4" style={{ backgroundColor: '#FAFAFA' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl ${m.role === 'user' ? '' : 'w-full'}`}>

                  {/* Bulle message */}
                  <div
                    className="px-5 py-4 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed"
                    style={m.role === 'user'
                      ? { backgroundColor: '#E30613', color: 'white' }
                      : { backgroundColor: 'white', color: '#1A1A1A', border: '1px solid #E8E8E8' }
                    }
                  >
                    {m.content}
                  </div>

                  {/* Actions plan généré */}
                  {m.isPlan && m.planMeta && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {/* PDF */}
                      <button
                        onClick={() => handleDownloadPDF(m.content, m.planMeta)}
                        disabled={pdfLoading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
                        style={{ backgroundColor: '#1A1A1A' }}
                      >
                        <span>⬇</span>
                        {pdfLoading ? 'PDF...' : 'Telecharger PDF'}
                      </button>

                      {/* Soumettre au RDFF */}
                      <button
                        onClick={() => {
                          setSubmitModal({ text: m.content, ...m.planMeta })
                          setSubmitTitle(m.planMeta?.objectif || '')
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                        style={{ backgroundColor: '#E30613' }}
                      >
                        <span>📤</span>
                        Soumettre au RDFF
                      </button>

                      <span className="text-xs" style={{ color: '#8C8C8C' }}>
                        Le RDFF validera avant integration au catalogue
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="flex items-center gap-3 px-5 py-4 rounded-2xl text-sm border"
                  style={{ backgroundColor: 'white', borderColor: '#E8E8E8', color: '#8C8C8C' }}
                >
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{ backgroundColor: '#E30613', animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  ARIA réfléchit… (le modèle LLM peut prendre 30–60 secondes)
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={sendMessage}
            className="shrink-0 px-8 py-4 border-t flex gap-3 items-end"
            style={{ backgroundColor: 'white', borderColor: '#E8E8E8' }}
          >
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) } }}
              disabled={loading}
              placeholder="Posez votre question... (Shift+Entrée pour nouvelle ligne)"
              rows={1}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <button
              type="submit" disabled={!input.trim() || loading}
              className="px-5 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40 shrink-0"
              style={{ backgroundColor: '#E30613' }}
            >
              Envoyer
            </button>
          </form>
        </>
      )}
      {/* ── Modal soumission RDFF ──────────────────────────────── */}
      {submitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-7">
            <h3 className="text-lg font-bold mb-1" style={{ color: '#1A1A1A' }}>
              Soumettre au RDFF pour validation
            </h3>
            <p className="text-sm mb-5" style={{ color: '#8C8C8C' }}>
              Le RDFF examinera votre plan et l'integrera au catalogue apres validation.
              Vous serez notifie de la decision.
            </p>

            <div className="mb-5">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#4A4A4A' }}>
                Titre de la formation
              </label>
              <input
                value={submitTitle}
                onChange={e => setSubmitTitle(e.target.value)}
                placeholder="ex: Python Avance pour l'Enseignement — Niveau Expert"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            {/* Aperçu */}
            <div className="p-3 rounded-xl mb-5 text-xs" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E8E8E8' }}>
              <p className="font-semibold mb-1" style={{ color: '#4A4A4A' }}>Apercu du plan :</p>
              <p className="text-gray-500 line-clamp-3">{submitModal.text.slice(0, 200)}...</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setSubmitModal(null); setSubmitTitle('') }}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSoumettre}
                disabled={!submitTitle.trim() || submitting}
                className="flex-1 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60 transition-all"
                style={{ backgroundColor: '#E30613' }}
              >
                {submitting ? 'Soumission...' : 'Confirmer la soumission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Panel Mes Propositions ─────────────────────────────── */}
      {showProp && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-end z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[80vh] flex flex-col">
            <div
              className="flex items-center justify-between px-6 py-4 border-b shrink-0"
              style={{ borderColor: '#E8E8E8' }}
            >
              <h3 className="font-bold" style={{ color: '#1A1A1A' }}>Mes propositions au RDFF</h3>
              <button onClick={() => setShowProp(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {mesProp.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: '#8C8C8C' }}>
                  Aucune proposition soumise pour l'instant.
                  <br />Generez un plan et cliquez sur "Soumettre au RDFF".
                </p>
              )}
              {mesProp.map(p => {
                const s = STATUT_STYLE[p.statut] || STATUT_STYLE.en_attente
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border p-4"
                    style={{ backgroundColor: s.bg, borderColor: s.bg }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>{p.titre}</p>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ color: s.text, backgroundColor: 'white' }}
                      >
                        {s.label}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: '#8C8C8C' }}>
                      {p.duree_semaines} semaines • {p.niveau} •{' '}
                      {new Date(p.created_at).toLocaleDateString('fr-FR')}
                    </p>
                    {p.statut === 'refusee' && p.commentaire_rdff && (
                      <div
                        className="mt-3 p-3 rounded-lg text-xs"
                        style={{ backgroundColor: 'white', border: '1px solid #FECACA', color: '#B91C1C' }}
                      >
                        <p className="font-semibold mb-1">Motif du refus :</p>
                        <p>{p.commentaire_rdff}</p>
                        <button
                          onClick={() => { setShowProp(false); setMode('plan') }}
                          className="mt-2 font-medium underline"
                          style={{ color: '#E30613' }}
                        >
                          Modifier et resoumettre →
                        </button>
                      </div>
                    )}
                    {p.statut === 'acceptee' && (
                      <p className="mt-2 text-xs font-medium" style={{ color: '#15803D' }}>
                        Formation au catalogue : code {p.formation_id ? `ARIA${String(p.formation_id).padStart(3,'0')}` : 'en cours'}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

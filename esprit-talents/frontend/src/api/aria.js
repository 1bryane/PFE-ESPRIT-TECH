import api from './client'

// ARIA utilise un LLM local (Ollama) — les réponses peuvent prendre jusqu'à 3 minutes
const ARIA_TIMEOUT = 180_000  // 3 minutes

export const ariaChat   = (message) => api.post('/aria/chat', { message }, { timeout: ARIA_TIMEOUT })
export const ariaPlan   = (data)    => api.post('/aria/plan', data,        { timeout: ARIA_TIMEOUT })
export const ariaHealth = ()        => api.get('/aria/health')

// Synchronise les formations de la BDD vers le RAG ChromaDB d'ARIA
export const syncFormationsRAG = (formations) =>
  api.post('/aria/sync-rag', { formations })

// Workflow ARIA → RDFF
export const soumettreProposition = (data) =>
  api.post('/formations-proposees/proposer', data)

export const mesPropositions = (statut) =>
  api.get('/formations-proposees/proposees', { params: statut ? { statut } : {} })

export const accepterProposition = (id) =>
  api.patch(`/formations-proposees/proposees/${id}/accepter`)

export const refuserProposition = (id, commentaire) =>
  api.patch(`/formations-proposees/proposees/${id}/refuser`, { commentaire })

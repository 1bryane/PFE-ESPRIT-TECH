import api from './client'

export const getEvaluations    = (params) => api.get('/evaluations', { params })
export const createEvaluation  = (data)   => api.post('/evaluations', data)
export const statsEnseignant   = (id)     => api.get(`/evaluations/stats/${id}`)
export const demandeTalent     = ()       => api.post('/evaluations/demande-talent')

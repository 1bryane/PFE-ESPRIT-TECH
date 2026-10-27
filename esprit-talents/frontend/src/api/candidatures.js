import api from './client'

export const mesCandidatures = ()       => api.get('/candidatures/mes')
export const postuler        = (data)   => api.post('/candidatures', data)
export const updateStatut    = (id, d)  => api.patch(`/candidatures/${id}`, d)
export const proposerOffre   = (uid, oid) => api.post(`/candidatures/${uid}/proposer/${oid}`)

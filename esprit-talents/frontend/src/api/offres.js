import api from './client'

export const getOffres        = (params) => api.get('/offres', { params })
export const getOffre         = (id)     => api.get(`/offres/${id}`)
export const createOffre      = (data)   => api.post('/offres', data)
export const updateOffre      = (id, d)  => api.put(`/offres/${id}`, d)
export const deleteOffre      = (id)     => api.delete(`/offres/${id}`)
export const getCandidatsOffre= (id)     => api.get(`/offres/${id}/candidats`)

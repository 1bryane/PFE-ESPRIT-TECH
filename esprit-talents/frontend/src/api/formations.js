import api from './client'

export const getFormations    = ()        => api.get('/formations')
export const getFormation     = (id)      => api.get(`/formations/${id}`)
export const createFormation  = (data)    => api.post('/formations', data)
export const updateFormation  = (id, d)   => api.put(`/formations/${id}`, d)
export const sInscrire        = (fid)     => api.post(`/formations/${fid}/inscrire`)
export const mesInscriptions  = ()        => api.get('/formations/mes-inscriptions')
export const inscritsFormation= (id)      => api.get(`/formations/${id}/inscrits`)
export const updateInscription= (id, d)   => api.patch(`/formations/inscriptions/${id}`, d)

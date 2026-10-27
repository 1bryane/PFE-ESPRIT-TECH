import api from './client'

export const getAvantages    = ()      => api.get('/avantages')
export const createAvantage  = (data)  => api.post('/avantages', data)
export const deleteAvantage  = (id)    => api.delete(`/avantages/${id}`)

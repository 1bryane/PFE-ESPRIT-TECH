import api from './client'

export const getUsers    = (params) => api.get('/users', { params })
export const getUser     = (id)     => api.get(`/users/${id}`)
export const updateMe    = (data)   => api.put('/users/me', data)
export const uploadPhoto = (file)   => {
  const form = new FormData(); form.append('file', file)
  return api.post('/users/me/photo', form)
}
export const uploadCV    = (file)   => {
  const form = new FormData(); form.append('file', file)
  return api.post('/users/me/cv', form)
}
export const changeRole  = (id, role) => api.patch(`/users/${id}/role`, { role })

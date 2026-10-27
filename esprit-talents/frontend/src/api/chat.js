import api from './client'

export const getUnreadCount   = ()           => api.get('/chat/unread-count')
export const getConversations = ()           => api.get('/chat/conversations')
export const getHistory       = (otherUserId) => api.get(`/chat/history/${otherUserId}`)
export const getOnlineUsers   = ()           => api.get('/chat/online')

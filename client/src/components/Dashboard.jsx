import { useState, useEffect } from 'react'
import { Search, LogOut, UserPlus, Globe, Users, Clock } from 'lucide-react'

export default function Dashboard({ user, ws, onChatSelect, onLogout }) {
  const [users, setUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [chatRequests, setChatRequests] = useState([])
  const [activeTab, setActiveTab] = useState('discover')

  useEffect(() => {
    fetchUsers()
    if (ws) {
      setupSocketListeners()
    }
  }, [ws])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const setupSocketListeners = () => {
    if (!ws) return

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      switch (message.type) {
        case 'chat_request':
          setChatRequests(prev => [...prev, message.data])
          break
        case 'request_accepted':
          onChatSelect(message.data.senderId)
          break
        case 'user_status':
          setUsers(prev => prev.map(u => 
            u._id === message.data.userId ? { ...u, status: message.data.status } : u
          ))
          break
      }
    }
  }

  const sendChatRequest = (receiverId) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'send_chat_request',
        data: {
          senderId: user.userId,
          receiverId
        }
      }))
    }
  }

  const acceptRequest = (requestId) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'accept_chat_request',
        data: { requestId }
      }))
      setChatRequests(prev => prev.filter(r => r._id !== requestId))
    }
  }

  const rejectRequest = (requestId) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'reject_chat_request',
        data: { requestId }
      }))
      setChatRequests(prev => prev.filter(r => r._id !== requestId))
    }
  }

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-dark-surface border-b border-dark-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Vanish Chat</h1>
              <p className="text-xs text-gray-400">Global Connections</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor('online')}`} />
              <span className="text-sm">{user.username}</span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 hover:bg-dark-border rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'discover'
                ? 'bg-primary-600 text-white'
                : 'bg-dark-surface text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Discover
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors relative ${
              activeTab === 'requests'
                ? 'bg-primary-600 text-white'
                : 'bg-dark-surface text-gray-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4 inline mr-2" />
            Requests
            {chatRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                {chatRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users globally..."
            className="w-full bg-dark-surface border border-dark-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>

        {/* Content */}
        {activeTab === 'discover' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u) => (
              <div
                key={u._id}
                className="bg-dark-surface rounded-xl p-4 hover:border-primary-500 border border-transparent transition-all animate-slide-up"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${getStatusColor(u.status)} border-2 border-dark-surface`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{u.username}</h3>
                    <p className="text-xs text-gray-400 capitalize">{u.status}</p>
                  </div>
                </div>
                <button
                  onClick={() => sendChatRequest(u._id)}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg transition-colors font-medium"
                >
                  Send Request
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {chatRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <UserPlus className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No pending requests</p>
              </div>
            ) : (
              chatRequests.map((request) => (
                <div
                  key={request._id}
                  className="bg-dark-surface rounded-xl p-4 flex items-center justify-between animate-slide-up"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                      {request.senderId?.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="font-semibold">{request.senderId?.username || 'Unknown'}</h3>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(request.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => rejectRequest(request._id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => acceptRequest(request._id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

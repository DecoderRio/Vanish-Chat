import { useState, useEffect, useRef } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Chat from './components/Chat'

function App() {
  const [user, setUser] = useState(null)
  const [currentChat, setCurrentChat] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const ws = useRef(null)

  useEffect(() => {
    if (token) {
      const userData = JSON.parse(localStorage.getItem('user'))
      setUser(userData)
      
      // Connect to WebSocket
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000'
      ws.current = new WebSocket(`${wsUrl}/ws/${userData.userId}`)
      
      ws.current.onopen = () => {
        console.log('WebSocket connected')
      }
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    }
    
    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [token])

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(token)
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    setCurrentChat(null)
    if (ws.current) {
      ws.current.close()
    }
  }

  const handleChatSelect = (chatUser) => {
    setCurrentChat(chatUser)
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  if (currentChat) {
    return (
      <Chat
        user={user}
        chatUser={currentChat}
        ws={ws.current}
        onBack={() => setCurrentChat(null)}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <Dashboard
      user={user}
      ws={ws.current}
      onChatSelect={handleChatSelect}
      onLogout={handleLogout}
    />
  )
}

export default App

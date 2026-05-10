import { useState } from 'react'
import { MessageCircle, Lock, Mail, User } from 'lucide-react'

export default function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    const url = isLogin 
      ? `${API_URL}/api/login`
      : `${API_URL}/api/register`
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed')
      }
      
      onLogin(data.token, {
        userId: data.userId,
        username: data.username,
        avatar: data.avatar
      })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-4">
      <div className="bg-dark-surface rounded-3xl shadow-2xl p-8 w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-600 mb-4">
            <MessageCircle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Vanish Chat</h1>
          <p className="text-gray-400">Messages that disappear</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="Choose a username"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary-500 transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary-500 transition-colors"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full gradient-bg text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
              setFormData({ username: '', email: '', password: '' })
            }}
            className="text-primary-400 hover:text-primary-300 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-dark-border">
          <h3 className="text-sm font-semibold mb-3 text-center">Unique Features</h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-500" />
              <span>Auto-delete (30min)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-500" />
              <span>Global Connect</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-500" />
              <span>Message Reactions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-500" />
              <span>Typing Indicators</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

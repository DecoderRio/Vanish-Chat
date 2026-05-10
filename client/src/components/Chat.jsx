import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, Smile, MoreVertical, Clock, CheckCheck } from 'lucide-react'

export default function Chat({ user, chatUser, ws, onBack, onLogout }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const emojis = ['😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😡', '👍', '❤️', '🔥', '✨']

  useEffect(() => {
    if (ws) {
      setupSocketListeners()
    }
    scrollToBottom()
    return () => {
      if (ws) {
        ws.onmessage = null
      }
    }
  }, [ws, chatUser])

  const setupSocketListeners = () => {
    if (!ws) return

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      switch (message.type) {
        case 'receive_message':
          setMessages(prev => [...prev, message.data])
          scrollToBottom()
          break
        case 'message_sent':
          setMessages(prev => [...prev, message.data])
          scrollToBottom()
          break
        case 'user_typing':
          setIsTyping(true)
          setTimeout(() => setIsTyping(false), 2000)
          break
        case 'message_read':
          setMessages(prev => prev.map(msg => 
            msg._id === message.data.messageId ? { ...msg, read: true, readAt: Date.now(), deleteAt: message.data.deleteAt } : msg
          ))
          break
        case 'reaction_added':
          setMessages(prev => prev.map(msg => 
            msg._id === message.data.messageId ? { ...msg, reactions: [...(msg.reactions || []), message.data.emoji] } : msg
          ))
          break
      }
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'send_message',
        data: {
          senderId: user.userId,
          receiverId: chatUser._id,
          content: newMessage,
          type: 'text'
        }
      }))
    }

    setNewMessage('')
    setShowEmojiPicker(false)
  }

  const handleTyping = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'typing',
        data: {
          senderId: user.userId,
          receiverId: chatUser._id
        }
      }))
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  const markAsRead = (message) => {
    if (!message.read && message.receiverId === user.userId) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'mark_as_read',
          data: {
            messageId: message._id,
            userId: user.userId
          }
        }))
      }
    }
  }

  const addReaction = (messageId, emoji) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'add_reaction',
        data: { messageId, emoji, userId: user.userId }
      }))
    }
  }

  const getTimeUntilDelete = (deleteAt) => {
    if (!deleteAt) return null
    const minutesLeft = Math.ceil((deleteAt - Date.now()) / (1000 * 60))
    return minutesLeft > 0 ? `${minutesLeft}m` : 'Deleting...'
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      {/* Header */}
      <header className="bg-dark-surface border-b border-dark-border px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-dark-border rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white font-bold">
              {chatUser.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold">{chatUser.username}</h2>
              <p className="text-xs text-gray-400 capitalize">{chatUser.status}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2 hover:bg-dark-border rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => {
            const isOwn = message.senderId === user.userId
            const timeUntilDelete = getTimeUntilDelete(message.deleteAt)
            
            return (
              <div
                key={message._id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                onMouseEnter={() => markAsRead(message)}
              >
                <div className={`max-w-xs lg:max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div
                    className={`message-bubble ${
                      isOwn
                        ? 'bg-primary-600 text-white rounded-br-md'
                        : 'bg-dark-surface text-white rounded-bl-md'
                    }`}
                  >
                    <p className="break-words">{message.content}</p>
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {message.reactions.map((emoji, idx) => (
                          <span key={idx} className="text-sm">{emoji}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className={`flex items-center gap-2 mt-1 text-xs text-gray-400 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isOwn && message.read && (
                      <CheckCheck className="w-3 h-3 text-primary-400" />
                    )}
                    {message.read && timeUntilDelete && (
                      <span className="flex items-center gap-1 text-orange-400">
                        <Clock className="w-3 h-3" />
                        {timeUntilDelete}
                      </span>
                    )}
                  </div>

                  {/* Quick reactions */}
                  <div className={`flex gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {emojis.slice(0, 6).map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => addReaction(message._id, emoji)}
                        className="text-sm hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
          
          {isTyping && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-dark-surface rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-dark-surface border-t border-dark-border p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 hover:bg-dark-border rounded-lg transition-colors"
            >
              <Smile className="w-5 h-5 text-gray-400" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-20 left-4 bg-dark-surface border border-dark-border rounded-xl p-3 shadow-xl animate-fade-in">
                <div className="grid grid-cols-6 gap-2">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setNewMessage(prev => prev + emoji)
                        setShowEmojiPicker(false)
                      }}
                      className="text-2xl hover:bg-dark-border rounded p-1 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                handleTyping()
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-dark-bg border border-dark-border rounded-xl py-3 px-4 focus:outline-none focus:border-primary-500 transition-colors"
            />

            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-3 gradient-bg rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          
          <p className="text-xs text-gray-400 text-center mt-2">
            Messages auto-delete 30 minutes after being read
          </p>
        </div>
      </div>
    </div>
  )
}

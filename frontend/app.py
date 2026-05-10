import streamlit as st
import requests
import json
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")

# Initialize session state
if 'token' not in st.session_state:
    st.session_state.token = None
if 'user' not in st.session_state:
    st.session_state.user = None
if 'current_view' not in st.session_state:
    st.session_state.current_view = 'login'
if 'selected_chat' not in st.session_state:
    st.session_state.selected_chat = None
if 'messages' not in st.session_state:
    st.session_state.messages = []
if 'users' not in st.session_state:
    st.session_state.users = []
if 'chat_requests' not in st.session_state:
    st.session_state.chat_requests = []

# Custom CSS
st.markdown("""
<style>
    .stApp {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    }
    .message-bubble {
        padding: 12px 16px;
        border-radius: 16px;
        max-width: 70%;
        margin: 8px 0;
    }
    .message-sent {
        background: linear-gradient(135deg, #0ea5e9 0%, #7c3aed 100%);
        margin-left: auto;
    }
    .message-received {
        background: #334155;
        margin-right: auto;
    }
    .online-indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
        margin-right: 8px;
    }
    .online {
        background-color: #22c55e;
    }
    .offline {
        background-color: #64748b;
    }
</style>
""", unsafe_allow_html=True)

# API Functions
def register(username, email, password):
    try:
        response = requests.post(f"{BACKEND_URL}/api/register", json={
            "username": username,
            "email": email,
            "password": password
        })
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def login(email, password):
    try:
        response = requests.post(f"{BACKEND_URL}/api/login", json={
            "email": email,
            "password": password
        })
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def get_users(token):
    try:
        response = requests.get(f"{BACKEND_URL}/api/users", 
                              headers={"Authorization": f"Bearer {token}"})
        return response.json()
    except Exception as e:
        return []

# Views
def login_view():
    st.title("🔮 Vanish Chat")
    st.markdown("---")
    
    tab1, tab2 = st.tabs(["Login", "Register"])
    
    with tab1:
        with st.form("login_form"):
            email = st.text_input("Email")
            password = st.text_input("Password", type="password")
            submit = st.form_submit_button("Login", use_container_width=True)
            
            if submit:
                result = login(email, password)
                if 'token' in result:
                    st.session_state.token = result['token']
                    st.session_state.user = {
                        'userId': result['userId'],
                        'username': result['username'],
                        'avatar': result.get('avatar', '')
                    }
                    st.session_state.current_view = 'dashboard'
                    st.success("Login successful!")
                    st.rerun()
                else:
                    st.error(result.get('error', 'Login failed'))
    
    with tab2:
        with st.form("register_form"):
            username = st.text_input("Username")
            email = st.text_input("Email")
            password = st.text_input("Password", type="password")
            submit = st.form_submit_button("Register", use_container_width=True)
            
            if submit:
                result = register(username, email, password)
                if 'token' in result:
                    st.session_state.token = result['token']
                    st.session_state.user = {
                        'userId': result['userId'],
                        'username': result['username'],
                        'avatar': result.get('avatar', '')
                    }
                    st.session_state.current_view = 'dashboard'
                    st.success("Registration successful!")
                    st.rerun()
                else:
                    st.error(result.get('error', 'Registration failed'))
    
    st.markdown("---")
    st.markdown("""
    ### ✨ Unique Features
    - 🗑️ Messages auto-delete after 30 minutes when read
    - 🌍 Connect with anyone globally
    - 😊 Message reactions with emojis
    - ⌨️ Real-time typing indicators
    - 👁️ Read receipts with countdown timer
    """)

def dashboard_view():
    st.title(f"🌍 Vanish Chat - {st.session_state.user['username']}")
    
    # Fetch users
    st.session_state.users = get_users(st.session_state.token)
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        if st.button("👥 Discover Users", use_container_width=True):
            st.session_state.active_tab = 'discover'
    
    with col2:
        if st.button("📨 Chat Requests", use_container_width=True):
            st.session_state.active_tab = 'requests'
    
    if 'active_tab' not in st.session_state:
        st.session_state.active_tab = 'discover'
    
    search = st.text_input("🔍 Search users...", placeholder="Search by username")
    
    st.markdown("---")
    
    if st.session_state.active_tab == 'discover':
        st.subheader("👥 Discover Users")
        
        filtered_users = [u for u in st.session_state.users 
                         if search.lower() in u['username'].lower()]
        
        cols = st.columns(3)
        for idx, user in enumerate(filtered_users):
            with cols[idx % 3]:
                with st.container():
                    status_class = "online" if user['status'] == 'online' else "offline"
                    st.markdown(f"""
                    <div style='background: #1e293b; padding: 16px; border-radius: 12px; margin: 8px 0;'>
                        <div style='display: flex; align-items: center; margin-bottom: 12px;'>
                            <span class='online-indicator {status_class}'></span>
                            <strong>{user['username']}</strong>
                        </div>
                        <small style='color: #94a3b8;'>{user['status'].capitalize()}</small>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    if st.button(f"Send Request", key=f"req_{user['_id']}", use_container_width=True):
                        st.success("Request sent! (Note: Real-time features need WebSocket)")
    
    else:
        st.subheader("📨 Chat Requests")
        
        if not st.session_state.chat_requests:
            st.info("No pending requests")
        else:
            for request in st.session_state.chat_requests:
                st.write(f"From: {request.get('senderId', 'Unknown')}")
    
    if st.button("🚪 Logout", use_container_width=True):
        st.session_state.clear()
        st.rerun()

def chat_view():
    st.title(f"💬 Chat with {st.session_state.selected_chat.get('username', 'User')}")
    
    st.info("Note: Real-time messaging requires WebSocket integration. This is a simplified version for demonstration.")
    
    st.markdown("---")
    
    # Message input
    st.markdown("---")
    with st.form("message_form", enter_to_submit=True):
        col1, col2 = st.columns([4, 1])
        with col1:
            message = st.text_input("Type a message...", key="message_input")
        with col2:
            send = st.form_submit_button("Send")
        
        if send and message:
            st.session_state.messages.append({
                "content": message,
                "senderId": st.session_state.user['userId'],
                "createdAt": datetime.now().isoformat()
            })
            st.success("Message sent! (Note: Real-time delivery requires WebSocket)")
            st.rerun()
    
    # Display messages
    for msg in st.session_state.messages:
        is_own = msg['senderId'] == st.session_state.user['userId']
        bubble_class = "message-sent" if is_own else "message-received"
        
        with st.container():
            st.markdown(f"""
            <div class='message-bubble {bubble_class}'>
                {msg['content']}
            </div>
            """, unsafe_allow_html=True)
            st.caption(f"Sent {datetime.fromisoformat(msg['createdAt']).strftime('%H:%M')}")
            st.markdown("---")
    
    if st.button("← Back to Dashboard", use_container_width=True):
        st.session_state.current_view = 'dashboard'
        st.session_state.selected_chat = None
        st.session_state.messages = []
        st.rerun()

# Main app
def main():
    if st.session_state.current_view == 'login':
        login_view()
    elif st.session_state.current_view == 'dashboard':
        dashboard_view()
    elif st.session_state.current_view == 'chat':
        chat_view()

if __name__ == "__main__":
    main()

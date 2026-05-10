# Vanish Chat - Modern Chat Application

A modern, global chat application with unique features including auto-deleting messages.

## Features

- **Auto-Delete Messages**: Messages automatically delete 30 minutes after being read
- **Global Chat**: Connect with anyone worldwide by sending and accepting chat requests
- **Unique Features**:
  - Message reactions with emojis
  - Real-time typing indicators
  - Message read receipts with timer
  - Online status indicators
  - Self-destruct timer preview
  - Modern dark theme with gradient accents

## Tech Stack

- **Frontend**: Streamlit (Python)
- **Backend**: Python, FastAPI, WebSockets
- **Database**: SQLite
- **Authentication**: JWT

## Prerequisites

1. **Python 3.8+** - Download from https://www.python.org/

## Installation

```bash
# Install all dependencies
npm run install-all

# Or install separately:
cd server
pip install -r requirements.txt

cd ../frontend
pip install -r requirements.txt
```

## Running the Application

### Option 1: Using the Startup Script (Recommended)
```bash
python start.py
```
This starts both backend and frontend servers automatically.

### Option 2: Manual Start

#### Start the Backend
```bash
cd server
python main.py
```

#### Start the Frontend (in a new terminal)
```bash
cd frontend
streamlit run app.py
```

### Option 3: Using npm
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:8501
- Backend: http://localhost:5000

## Deployment

For deployment options and detailed instructions, see [DEPLOY.md](DEPLOY.md).

Quick deployment options:
- **Local**: `python start.py`
- **Docker**: `docker build -t vanish-chat . && docker run -p 5000:5000 -p 8501:8501 vanish-chat`
- **Cloud**: See DEPLOY.md for Render, Heroku, and PythonAnywhere instructions

## Project Structure

```
chat_application/
├── server/
│   ├── main.py              # FastAPI backend with WebSockets
│   ├── requirements.txt     # Python dependencies
│   ├── vanish_chat.db       # SQLite database (auto-created)
│   └── .env                # Environment variables
├── frontend/
│   ├── app.py              # Streamlit frontend
│   └── requirements.txt     # Python dependencies
├── start.py                # Startup script (runs both servers)
├── Dockerfile              # Docker configuration
├── render.yaml             # Render deployment config
├── DEPLOY.md               # Detailed deployment guide
├── client/                 # Legacy React frontend (deprecated)
├── package.json
└── README.md
```

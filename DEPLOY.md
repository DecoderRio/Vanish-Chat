# Vanish Chat - Deployment Guide

## Overview
Vanish Chat is a modern chat application built with:
- **Backend**: Python FastAPI + SQLite
- **Frontend**: Streamlit
- **Features**: Auto-delete messages, global chat, message reactions, typing indicators

## Deployment Options

### Option 1: Local Deployment (Easiest)

#### Prerequisites
- Python 3.8+
- pip

#### Steps
1. Install dependencies:
```bash
# Install backend dependencies
cd server
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
pip install -r requirements.txt
```

2. Start the application using the startup script:
```bash
cd ..
python start.py
```

Or manually:
```bash
# Terminal 1 - Backend
cd server
python main.py

# Terminal 2 - Frontend
cd frontend
streamlit run app.py
```

3. Access the application:
- Frontend: http://localhost:8501
- Backend API: http://localhost:5000

---

### Option 2: Docker Deployment

#### Prerequisites
- Docker
- Docker Compose (optional)

#### Steps
1. Build the Docker image:
```bash
docker build -t vanish-chat .
```

2. Run the container:
```bash
docker run -p 5000:5000 -p 8501:8501 vanish-chat
```

3. Access the application:
- Frontend: http://localhost:8501
- Backend: http://localhost:5000

---

### Option 3: Render Deployment (Free Cloud Hosting)

#### Prerequisites
- GitHub account
- Render account (free tier available at render.com)

#### Steps
1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

2. Go to [Render Dashboard](https://dashboard.render.com)

3. Click "New +" → "Blueprint"

4. Connect your GitHub repository

5. Render will automatically detect the `render.yaml` file and deploy both services

6. Once deployed:
   - Frontend URL will be provided by Render
   - Update the `BACKEND_URL` environment variable in the frontend service to point to your backend URL

---

### Option 4: Heroku Deployment

#### Prerequisites
- Heroku CLI installed
- Heroku account

#### Steps
1. Login to Heroku:
```bash
heroku login
```

2. Create a new app:
```bash
heroku create vanish-chat-app
```

3. Set environment variables:
```bash
heroku config:set JWT_SECRET=your-secret-key
```

4. Deploy:
```bash
git push heroku main
```

---

### Option 5: PythonAnywhere Deployment

#### Prerequisites
- PythonAnywhere account (free tier available)

#### Steps
1. Upload your code to PythonAnywhere

2. Create a new Web App:
   - Go to Web tab
   - Click "Add a new web app"
   - Choose "Manual configuration" with Python 3.11

3. Set up virtual environment:
```bash
mkvirtualenv --python=/usr/bin/python3.11 vanish-chat
pip install -r server/requirements.txt
pip install -r frontend/requirements.txt
```

4. Configure WSGI file to point to your FastAPI app

5. Set up static files for the frontend

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key-change-in-production` |
| `BACKEND_URL` | Backend server URL | `http://localhost:5000` |
| `PORT` | Backend server port | `5000` |

---

## Database

The application uses SQLite by default. The database file (`vanish_chat.db`) is created automatically in the `server/` directory.

**Note**: SQLite is suitable for development and small deployments. For production with many users, consider migrating to PostgreSQL or MySQL.

---

## Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

### Dependencies Issues
```bash
# Reinstall dependencies
pip install --upgrade --force-reinstall -r requirements.txt
```

### Database Issues
```bash
# Delete and recreate database (WARNING: This will delete all data)
cd server
del vanish_chat.db  # Windows
rm vanish_chat.db   # Linux/Mac
```

---

## Production Considerations

1. **Change JWT_SECRET**: Use a strong, random secret key
2. **Use HTTPS**: Enable SSL/TLS for production
3. **Database**: Migrate to PostgreSQL for production
4. **Environment Variables**: Set proper environment variables for production
5. **Firewall**: Configure firewall rules appropriately

---

## Support

For issues or questions, please refer to the main README.md file or check the project repository.

#!/usr/bin/env python3
"""
Vanish Chat - Startup Script
Starts both backend and frontend servers
"""

import subprocess
import sys
import os
import time
import signal

# Process holders
backend_process = None
frontend_process = None

def signal_handler(sig, frame):
    print('\nShutting down servers...')
    if backend_process:
        backend_process.terminate()
    if frontend_process:
        frontend_process.terminate()
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

print("🚀 Starting Vanish Chat Application...")
print("=" * 50)

# Get the project directory
project_dir = os.path.dirname(os.path.abspath(__file__))

# Start backend
print("📡 Starting Backend Server...")
backend_dir = os.path.join(project_dir, "server")
backend_process = subprocess.Popen(
    [sys.executable, "main.py"],
    cwd=backend_dir,
    creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == "win32" else 0
)

# Wait for backend to start
time.sleep(3)

# Start frontend
print("🎨 Starting Frontend Server...")
frontend_dir = os.path.join(project_dir, "frontend")
frontend_process = subprocess.Popen(
    [sys.executable, "-m", "streamlit", "run", "app.py", "--server.port=8501"],
    cwd=frontend_dir,
    creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == "win32" else 0
)

print("=" * 50)
print("✅ Application started successfully!")
print("")
print("🔗 Access the application:")
print("   Frontend: http://localhost:8501")
print("   Backend:  http://localhost:5000")
print("")
print("⚠️  Press Ctrl+C to stop both servers")
print("=" * 50)

# Keep the script running
try:
    while True:
        time.sleep(1)
        # Check if processes are still running
        if backend_process.poll() is not None:
            print("❌ Backend server stopped unexpectedly")
            break
        if frontend_process.poll() is not None:
            print("❌ Frontend server stopped unexpectedly")
            break
except KeyboardInterrupt:
    signal_handler(signal.SIGINT, None)

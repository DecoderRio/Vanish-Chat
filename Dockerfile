# Dockerfile for Vanish Chat
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY server/requirements.txt .
COPY frontend/requirements.txt ./frontend-requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir -r frontend-requirements.txt

# Copy application code
COPY server/ ./server/
COPY frontend/ ./frontend/

# Create a startup script
RUN echo '#!/bin/bash\n\
cd /app/server && python main.py &\n\
sleep 5\n\
cd /app/frontend && streamlit run app.py --server.port=8501 --server.address=0.0.0.0\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose ports
EXPOSE 5000 8501

# Start both services
CMD ["/app/start.sh"]

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine, Column, String, DateTime, Boolean, Text, Integer, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from datetime import datetime, timedelta
import json
import bcrypt
import jwt
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio
from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS middleware
# Allow multiple origins for local development and production
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:8501,http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLite Database Setup
DATABASE_URL = "sqlite:///./vanish_chat.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    avatar = Column(String, default="")
    status = Column(String, default="offline")
    theme = Column(String, default="dark")
    created_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    message_type = Column(String, default="text")
    read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    delete_at = Column(DateTime, nullable=True)
    reactions = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])

class ChatRequest(Base):
    __tablename__ = "chat_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    request_status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    participant1_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    participant2_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    last_message_id = Column(Integer, ForeignKey("messages.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
security = HTTPBearer()

online_users = {}
scheduler = AsyncIOScheduler()

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "userId": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["userId"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/api/register")
async def register(user: UserRegister, db: Session = Depends(get_db)):
    try:
        print(f"Registration attempt: username={user.username}, email={user.email}")
        
        existing_email = db.query(User).filter(User.email == user.email).first()
        if existing_email:
            print(f"Email already registered: {user.email}")
            raise HTTPException(status_code=400, detail="Email already registered")
        
        existing_username = db.query(User).filter(User.username == user.username).first()
        if existing_username:
            print(f"Username already taken: {user.username}")
            raise HTTPException(status_code=400, detail="Username already taken")
        
        new_user = User(
            username=user.username,
            email=user.email,
            password=hash_password(user.password),
            avatar="",
            status="offline",
            theme="dark"
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        token = create_token(str(new_user.id))
        
        print(f"Registration successful for user: {new_user.username}")
        return {
            "token": token,
            "userId": str(new_user.id),
            "username": new_user.username
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")

@app.post("/api/login")
async def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    token = create_token(str(db_user.id))
    
    return {
        "token": token,
        "userId": str(db_user.id),
        "username": db_user.username,
        "avatar": db_user.avatar
    }

@app.get("/api/users")
async def get_users(user_id: str = Depends(verify_token), db: Session = Depends(get_db)):
    users = db.query(User).filter(User.id != int(user_id)).all()
    
    return [{
        "_id": str(user.id),
        "username": user.username,
        "avatar": user.avatar,
        "status": user.status
    } for user in users]

@app.get("/api/conversations/{user_id}")
async def get_conversations(user_id: str, current_user: str = Depends(verify_token), db: Session = Depends(get_db)):
    conversations = db.query(Conversation).filter(
        (Conversation.participant1_id == int(user_id)) | 
        (Conversation.participant2_id == int(user_id))
    ).order_by(Conversation.updated_at.desc()).all()
    
    return [{
        "_id": str(conv.id),
        "participants": [str(conv.participant1_id), str(conv.participant2_id)],
        "lastMessage": str(conv.last_message_id) if conv.last_message_id else None
    } for conv in conversations]

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
    
    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        online_users[user_id] = {"websocket": websocket}
        
        db = SessionLocal()
        try:
            db_user = db.query(User).filter(User.id == int(user_id)).first()
            if db_user:
                db_user.status = "online"
                db.commit()
        finally:
            db.close()
        
        for uid, ws in self.active_connections.items():
            if uid != user_id:
                try:
                    await ws.send_json({
                        "type": "user_status",
                        "data": {"userId": user_id, "status": "online"}
                    })
                except:
                    pass
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if user_id in online_users:
            del online_users[user_id]
        
        db = SessionLocal()
        try:
            db_user = db.query(User).filter(User.id == int(user_id)).first()
            if db_user:
                db_user.status = "offline"
                db.commit()
        finally:
            db.close()
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except:
                pass

manager = ConnectionManager()

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "send_message":
                message_data = data.get("data")
                db = SessionLocal()
                try:
                    message = Message(
                        sender_id=int(message_data["senderId"]),
                        receiver_id=int(message_data["receiverId"]),
                        content=message_data["content"],
                        message_type=message_data.get("type", "text"),
                        read=False,
                        reactions="[]"
                    )
                    
                    db.add(message)
                    db.commit()
                    db.refresh(message)
                    
                    conv = db.query(Conversation).filter(
                        ((Conversation.participant1_id == int(message_data["senderId"])) & 
                         (Conversation.participant2_id == int(message_data["receiverId"]))) |
                        ((Conversation.participant1_id == int(message_data["receiverId"])) & 
                         (Conversation.participant2_id == int(message_data["senderId"])))
                    ).first()
                    
                    if conv:
                        conv.last_message_id = message.id
                        conv.updated_at = datetime.utcnow()
                    else:
                        conv = Conversation(
                            participant1_id=int(message_data["senderId"]),
                            participant2_id=int(message_data["receiverId"]),
                            last_message_id=message.id
                        )
                        db.add(conv)
                    
                    db.commit()
                    
                    message_dict = {
                        "_id": str(message.id),
                        "senderId": str(message.sender_id),
                        "receiverId": str(message.receiver_id),
                        "content": message.content,
                        "type": message.message_type,
                        "read": message.read,
                        "readAt": message.read_at.isoformat() if message.read_at else None,
                        "deleteAt": message.delete_at.isoformat() if message.delete_at else None,
                        "reactions": json.loads(message.reactions) if message.reactions else [],
                        "createdAt": message.created_at.isoformat()
                    }
                    
                    await manager.send_personal_message({
                        "type": "receive_message",
                        "data": message_dict
                    }, message_data["receiverId"])
                    
                    await manager.send_personal_message({
                        "type": "message_sent",
                        "data": message_dict
                    }, message_data["senderId"])
                finally:
                    db.close()
            
            elif message_type == "mark_as_read":
                req_data = data.get("data")
                db = SessionLocal()
                try:
                    message = db.query(Message).filter(Message.id == int(req_data["messageId"])).first()
                    if message:
                        message.read = True
                        message.read_at = datetime.utcnow()
                        message.delete_at = datetime.utcnow() + timedelta(minutes=30)
                        db.commit()
                        
                        await manager.send_personal_message({
                            "type": "message_read",
                            "data": {
                                "messageId": req_data["messageId"],
                                "deleteAt": message.delete_at.isoformat()
                            }
                        }, str(message.sender_id))
                finally:
                    db.close()
            
            elif message_type == "typing":
                req_data = data.get("data")
                await manager.send_personal_message({
                    "type": "user_typing",
                    "data": {"senderId": req_data["senderId"]}
                }, req_data["receiverId"])
            
            elif message_type == "send_chat_request":
                req_data = data.get("data")
                db = SessionLocal()
                try:
                    existing = db.query(ChatRequest).filter(
                        ChatRequest.sender_id == int(req_data["senderId"]),
                        ChatRequest.receiver_id == int(req_data["receiverId"]),
                        ChatRequest.request_status == "pending"
                    ).first()
                    
                    if not existing:
                        request = ChatRequest(
                            sender_id=int(req_data["senderId"]),
                            receiver_id=int(req_data["receiverId"]),
                            request_status="pending"
                        )
                        db.add(request)
                        db.commit()
                        db.refresh(request)
                        
                        request_dict = {
                            "_id": str(request.id),
                            "senderId": str(request.sender_id),
                            "receiverId": str(request.receiver_id),
                            "status": request.request_status,
                            "createdAt": request.created_at.isoformat()
                        }
                        
                        await manager.send_personal_message({
                            "type": "chat_request",
                            "data": request_dict
                        }, req_data["receiverId"])
                finally:
                    db.close()
            
            elif message_type == "accept_chat_request":
                req_data = data.get("data")
                db = SessionLocal()
                try:
                    request = db.query(ChatRequest).filter(
                        ChatRequest.id == int(req_data["requestId"])
                    ).first()
                    
                    if request:
                        request.request_status = "accepted"
                        db.commit()
                        
                        await manager.send_personal_message({
                            "type": "request_accepted",
                            "data": {
                                "_id": str(request.id),
                                "senderId": str(request.sender_id),
                                "receiverId": str(request.receiver_id)
                            }
                        }, str(request.sender_id))
                finally:
                    db.close()
            
            elif message_type == "reject_chat_request":
                req_data = data.get("data")
                db = SessionLocal()
                try:
                    request = db.query(ChatRequest).filter(
                        ChatRequest.id == int(req_data["requestId"])
                    ).first()
                    if request:
                        request.request_status = "rejected"
                        db.commit()
                finally:
                    db.close()
            
            elif message_type == "add_reaction":
                req_data = data.get("data")
                db = SessionLocal()
                try:
                    message = db.query(Message).filter(Message.id == int(req_data["messageId"])).first()
                    if message:
                        reactions = json.loads(message.reactions) if message.reactions else []
                        if req_data["emoji"] not in reactions:
                            reactions.append(req_data["emoji"])
                            message.reactions = json.dumps(reactions)
                            db.commit()
                        
                        await manager.send_personal_message({
                            "type": "reaction_added",
                            "data": {
                                "messageId": req_data["messageId"],
                                "emoji": req_data["emoji"]
                            }
                        }, str(message.receiver_id))
                        await manager.send_personal_message({
                            "type": "reaction_added",
                            "data": {
                                "messageId": req_data["messageId"],
                                "emoji": req_data["emoji"]
                            }
                        }, str(message.sender_id))
                finally:
                    db.close()
    
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        for uid, ws in manager.active_connections.items():
            try:
                await ws.send_json({
                    "type": "user_status",
                    "data": {"userId": user_id, "status": "offline"}
                })
            except:
                pass

async def delete_expired_messages():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        result = db.query(Message).filter(Message.delete_at <= now).delete()
        db.commit()
        if result > 0:
            print(f"Deleted {result} expired messages")
    finally:
        db.close()

@app.on_event("startup")
async def startup_event():
    scheduler.add_job(delete_expired_messages, 'interval', minutes=1)
    scheduler.start()

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)

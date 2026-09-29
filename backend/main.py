import sqlite3
import datetime
import jwt
import bcrypt
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional

SECRET_KEY = "super_secret_jwt_key_arqvanta"
ALGORITHM = "HS256"

app = FastAPI(title="Mini Helpdesk API")

# React frontend nunchi request allow cheyadaniki CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLite Database connection
def get_db():
    conn = sqlite3.connect("helpdesk.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user'
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            priority TEXT NOT NULL,
            status TEXT DEFAULT 'Open',
            user_id INTEGER,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# Request schemas
class RegisterSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "user"

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class TicketCreateSchema(BaseModel):
    title: str
    description: str
    category: str
    priority: str

class StatusUpdateSchema(BaseModel):
    status: str

# Helper functions for Auth
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Session expired, please login again")

# --- Authentication APIs ---
@app.post("/api/auth/register")
def register(user: RegisterSchema):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (user.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(user.password)
    cursor.execute("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
                   (user.name, user.email, hashed, user.role))
    conn.commit()
    conn.close()
    return {"message": "User registered successfully"}

@app.post("/api/auth/login")
def login(creds: LoginSchema):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (creds.email,))
    row = cursor.fetchone()
    conn.close()
    
    if not row or not verify_password(creds.password, row["password"]):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    token_payload = {
        "user_id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"]
    }
    token = jwt.encode(token_payload, SECRET_KEY, algorithm=ALGORITHM)
    return {"token": token, "user": token_payload}

# --- Ticket Management APIs ---
@app.post("/api/tickets")
def create_ticket(ticket: TicketCreateSchema, user: dict = Depends(get_current_user)):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO tickets (title, description, category, priority, status, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'Open', ?, ?, ?)
    ''', (ticket.title, ticket.description, ticket.category, ticket.priority, user["user_id"], now, now))
    conn.commit()
    conn.close()
    return {"message": "Ticket created successfully"}

@app.get("/api/tickets/my")
def get_my_tickets(user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tickets WHERE user_id = ? ORDER BY id DESC", (user["user_id"],))
    tickets = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return tickets

@app.delete("/api/tickets/{ticket_id}")
def delete_ticket(ticket_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    if user["role"] == "admin":
        cursor.execute("DELETE FROM tickets WHERE id = ?", (ticket_id,))
    else:
        cursor.execute("DELETE FROM tickets WHERE id = ? AND user_id = ?", (ticket_id, user["user_id"]))
    conn.commit()
    conn.close()
    return {"message": "Ticket deleted successfully"}

# --- Admin APIs ---
@app.get("/api/admin/tickets")
def get_all_tickets(status: Optional[str] = None, priority: Optional[str] = None, search: Optional[str] = None, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT t.*, u.name as user_name, u.email as user_email FROM tickets t JOIN users u ON t.user_id = u.id WHERE 1=1"
    params = []
    if status:
        query += " AND t.status = ?"
        params.append(status)
    if priority:
        query += " AND t.priority = ?"
        params.append(priority)
    if search:
        query += " AND t.title LIKE ?"
        params.append(f"%{search}%")
    query += " ORDER BY t.id DESC"
    cursor.execute(query, params)
    tickets = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return tickets

@app.patch("/api/admin/tickets/{ticket_id}/status")
def update_status(ticket_id: int, body: StatusUpdateSchema, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?", (body.status, now, ticket_id))
    conn.commit()
    conn.close()
    return {"message": "Status updated successfully"}

@app.get("/api/admin/stats")
def get_stats(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as total FROM tickets")
    total = cursor.fetchone()["total"]
    cursor.execute("SELECT COUNT(*) as open_cnt FROM tickets WHERE status = 'Open'")
    open_cnt = cursor.fetchone()["open_cnt"]
    cursor.execute("SELECT COUNT(*) as in_progress FROM tickets WHERE status = 'In Progress'")
    in_progress = cursor.fetchone()["in_progress"]
    cursor.execute("SELECT COUNT(*) as resolved FROM tickets WHERE status = 'Resolved'")
    resolved = cursor.fetchone()["resolved"]
    conn.close()
    return {"total": total, "open": open_cnt, "in_progress": in_progress, "resolved": resolved}
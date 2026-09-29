# Mini Helpdesk & Support Ticket System

A full-stack support ticket management web application developed for the Arqvanta Technologies Technical Assessment.

## Tech Stack
- **Frontend:** React.js (Vite), Axios, CSS3
- **Backend:** Python (FastAPI), SQLite, PyJWT, Bcrypt
- **Authentication:** JWT-based stateless authentication with password hashing

## Features
- User registration, login, and JWT-authenticated session handling.
- Role-based permissions (Regular User and Admin).
- Ticket operations: Create ticket, list user tickets, view status, and delete.
- Admin dashboard: Filter tickets by status and priority, search by title, live status updates.
- Real-time statistics counters: Total, Open, In Progress, and Resolved tickets.

## How to Run Locally

### 1. Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install fastapi uvicorn pydantic pyjwt bcrypt python-multipart email-validator
python -m uvicorn main:app --reload --port 8000

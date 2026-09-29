# Mini Helpdesk & Support Ticket System

A full-stack support ticket management web application built for the Arqvanta Technologies Technical Assessment.

## 🚀 Tech Stack
- **Frontend:** React.js (Vite), CSS3, Axios
- **Backend:** Python (FastAPI), SQLite
- **Authentication:** JWT-based stateless authentication with bcrypt password hashing

## ✨ Features Implemented
- **User Authentication:** Secure registration and login functionalities.
- **Role-Based Access Control:** Distinct interfaces and permissions for Regular Users and Admins.
- **User Ticket Management:** Users can seamlessly create, view, and delete their own support tickets.
- **Admin Dashboard:** Admins have access to view all tickets, search by title, and filter by priority or status.
- **Status Management:** Admins can instantly update the status of any ticket (Open, In Progress, Resolved).
- **Real-time Statistics:** Admin dashboard automatically displays aggregate counts for Total, Open, In Progress, and Resolved tickets.

## 🛠️ Local Setup Instructions

### 1. Backend Setup (FastAPI & SQLite)
Open a terminal and run the following commands to start the backend server:

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install fastapi uvicorn pydantic pyjwt bcrypt python-multipart email-validator
python -m uvicorn main:app --reload --port 8000

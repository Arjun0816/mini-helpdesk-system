import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = 'http://127.0.0.1:8000/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [isRegister, setIsRegister] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');

  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technical');
  const [priority, setPriority] = useState('Medium');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const axiosInstance = axios.create({
    baseURL: API_BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await axios.post(`${API_BASE}/auth/register`, { name, email, password, role });
        alert('Registration successful! Login now.');
        setIsRegister(false);
      } else {
        const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken('');
    setUser(null);
  };

  const loadTickets = async () => {
    try {
      if (user?.role === 'admin') {
        const res = await axiosInstance.get('/admin/tickets', {
          params: { search: search || undefined, status: filterStatus || undefined, priority: filterPriority || undefined }
        });
        setTickets(res.data);
        const statsRes = await axiosInstance.get('/admin/stats');
        setStats(statsRes.data);
      } else {
        const res = await axiosInstance.get('/tickets/my');
        setTickets(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) loadTickets();
  }, [token, search, filterStatus, filterPriority]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/tickets', { title, description, category, priority });
      setTitle('');
      setDescription('');
      loadTickets();
    } catch (err) {
      alert('Failed to create ticket');
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await axiosInstance.patch(`/admin/tickets/${id}/status`, { status: newStatus });
      loadTickets();
    } catch (err) {
      alert('Status update failed');
    }
  };

  const handleDeleteTicket = async (id) => {
    if (!window.confirm('Delete this ticket?')) return;
    try {
      await axiosInstance.delete(`/tickets/${id}`);
      loadTickets();
    } catch (err) {
      alert('Delete failed');
    }
  };

  if (!token) {
    return (
      <div className="container" style={{ maxWidth: '400px', marginTop: '60px' }}>
        <div className="card">
          <h2>{isRegister ? 'Register' : 'Login'}</h2>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <form onSubmit={handleAuth}>
            {isRegister && (
              <>
                <input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required />
                <select value={role} onChange={e => setRole(e.target.value)}>
                  <option value="user">Regular User</option>
                  <option value="admin">Admin</option>
                </select>
              </>
            )}
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit">{isRegister ? 'Register Account' : 'Login'}</button>
          </form>
          <p style={{ textAlign: 'center', cursor: 'pointer', color: '#2563eb' }} onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="navbar">
        <h3 style={{ margin: 0 }}>ArqVanta Support Desk</h3>
        <div>
          <span>{user?.name} <strong>({user?.role})</strong></span>
          <button onClick={handleLogout} style={{ marginLeft: '12px', background: '#ef4444', width: 'auto', padding: '6px 12px' }}>Logout</button>
        </div>
      </div>

      <div className="container">
        {user?.role === 'admin' ? (
          <div>
            <h2>Admin Control Panel</h2>
            {stats && (
              <div className="stats-grid">
                <div className="stat-box"><h3>{stats.total}</h3><p>Total</p></div>
                <div className="stat-box"><h3>{stats.open}</h3><p>Open</p></div>
                <div className="stat-box"><h3>{stats.in_progress}</h3><p>In Progress</p></div>
                <div className="stat-box"><h3>{stats.resolved}</h3><p>Resolved</p></div>
              </div>
            )}

            <div className="card" style={{ display: 'flex', gap: '10px' }}>
              <input placeholder="Search title..." value={search} onChange={e => setSearch(e.target.value)} />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                <option value="">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="card">
            <h3>New Support Ticket</h3>
            <form onSubmit={handleCreateTicket}>
              <input placeholder="Issue Title" value={title} onChange={e => setTitle(e.target.value)} required />
              <textarea placeholder="Describe the issue..." value={description} onChange={e => setDescription(e.target.value)} required />
              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="Technical">Technical</option>
                  <option value="Billing">Billing</option>
                  <option value="Account">Account</option>
                </select>
                <select value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <button type="submit">Submit Ticket</button>
            </form>
          </div>
        )}

        <div className="card">
          <h3>{user?.role === 'admin' ? 'All Submitted Tickets' : 'My Tickets'}</h3>
          <table className="ticket-table">
            <thead>
              <tr>
                <th>Title & Info</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.title}</strong>
                    <br /><small style={{ color: '#64748b' }}>{t.description}</small>
                    {t.user_name && <><br /><small style={{ color: '#0284c7' }}>User: {t.user_name} ({t.user_email})</small></>}
                  </td>
                  <td>{t.category}</td>
                  <td>{t.priority}</td>
                  <td>
                    <span className={`badge badge-${t.status.replace(/\s+/g, '')}`}>{t.status}</span>
                  </td>
                  <td>
                    {user?.role === 'admin' ? (
                      <select value={t.status} onChange={e => handleStatusUpdate(t.id, e.target.value)} style={{ padding: '4px' }}>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    ) : (
                      <button className="btn-delete" onClick={() => handleDeleteTicket(t.id)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8' }}>No tickets found</p>}
        </div>
      </div>
    </div>
  );
}
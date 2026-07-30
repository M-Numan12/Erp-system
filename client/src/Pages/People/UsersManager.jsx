import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import '../../Styles/UsersManager.scss';
import { UserPlus, Save } from 'lucide-react';
import ActionMenu from '../../components/ActionMenu';

const availableModules = [
  { id: 'wholesale', label: 'Wholesale' },
  { id: 'retail', label: 'Retail Sale' },
  { id: 'users', label: 'Users & Permissions' },
  { id: 'products', label: 'Products' },
  { id: 'stock', label: 'Stock' },
  { id: 'billing', label: 'Billing' },
  { id: 'customers', label: 'Customers' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'transport', label: 'Transport' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'salary', label: 'Salary' },
  { id: 'profit', label: 'Profit' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'rent', label: 'Rent' },
  { id: 'investment', label: 'Investment' },
  { id: 'staff', label: 'Staff Ledger' },
  { id: 'labours', label: 'Labour Tracking' }
];

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user', module_type: '', permissions: [] });
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchDevices = async (userId) => {
    setLoadingDevices(true);
    try {
      const res = await api.get(`/users/${userId}/devices`);
      setDevices(res.data);
    } catch (err) {
      console.error('Failed to fetch user devices', err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handlePermissionToggle = (moduleId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(moduleId)
        ? prev.permissions.filter(p => p !== moduleId)
        : [...prev.permissions, moduleId]
    }));
  };

  const handleEditClick = (user) => {
    setEditingId(user.id);
    
    // Safety check: Ensure permissions is an array (sometimes it comes as a string from DB)
    let userPermissions = user.permissions;
    if (typeof userPermissions === 'string') {
      try { userPermissions = JSON.parse(userPermissions); } catch(e) { userPermissions = []; }
    }
    if (!Array.isArray(userPermissions)) userPermissions = [];

    setFormData({
      name: user.name,
      email: user.email,
      password: user.password || '', 
      role: user.role,
      module_type: user.module_type || '',
      permissions: userPermissions
    });
    setShowForm(true);
    fetchDevices(user.id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSend = { ...formData };
    if (!dataToSend.module_type) {
      dataToSend.module_type = null;
    }
    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, dataToSend);
      } else {
        await api.post('/users', dataToSend);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', email: '', password: '', role: 'user', module_type: '', permissions: [] });
      setDevices([]);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.msg || 'Error saving user');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogoutDevice = async (deviceId) => {
    if (window.confirm('Are you sure you want to force logout and revoke this device?')) {
      try {
        await api.delete(`/users/devices/${deviceId}`);
        if (editingId) {
          fetchDevices(editingId);
        }
      } catch (err) {
        console.error('Failed to logout device', err);
        alert(err.response?.data?.msg || 'Error logging out device');
      }
    }
  };

  const handleApproveDevice = async (deviceId) => {
    try {
      await api.put(`/users/devices/${deviceId}/approve`);
      if (editingId) {
        fetchDevices(editingId);
      }
    } catch (err) {
      console.error('Failed to approve device', err);
      alert(err.response?.data?.msg || 'Error approving device');
    }
  };

  return (
    <div className="users-manager">
      <div className="header">
        <h2>Users & Permissions</h2>
        <button className="btn-primary" onClick={() => {
          setShowForm(!showForm);
          if (editingId) {
            setEditingId(null);
            setFormData({ name: '', email: '', password: '', role: 'user', module_type: '', permissions: [] });
            setDevices([]);
          }
        }}>
          <UserPlus size={20} /> {showForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {showForm && (
        <form className="user-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Edit User' : 'Create New User'}</h3>
          <div className="form-row">
            <input type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            <input type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
            <input type="text" placeholder={editingId ? "Edit Password" : "Password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
          </div>
          
          <div className="form-row">
            <select 
              value={formData.role} 
              onChange={e => {
                const nextRole = e.target.value;
                let nextModule = '';
                if (nextRole === 'admin') nextModule = 'admin';
                else if (nextRole === 'Wholesale') nextModule = 'Wholesale';
                else if (nextRole === 'Retail 1') nextModule = 'Retail 1';
                else if (nextRole === 'Retail 2') nextModule = 'Retail 2';
                else if (nextRole === 'Retail 3') nextModule = 'Retail 3';
                else nextModule = '';

                setFormData({
                  ...formData, 
                  role: nextRole,
                  module_type: nextModule
                });
              }} 
              required 
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}
            >
              <option value="admin">Admin Role</option>
              <option value="Wholesale">Wholesale Role</option>
              <option value="Retail 1">Retail 1 Role</option>
              <option value="Retail 2">Retail 2 Role</option>
              <option value="Retail 3">Retail 3 Role</option>
              <option value="user">User Role</option>
            </select>
            <select 
              value={formData.module_type} 
              onChange={e => {
                const nextModule = e.target.value;
                let nextRole = 'user';
                if (nextModule === 'admin') nextRole = 'admin';
                else if (nextModule === 'Wholesale') nextRole = 'Wholesale';
                else if (nextModule === 'Retail 1') nextRole = 'Retail 1';
                else if (nextModule === 'Retail 2') nextRole = 'Retail 2';
                else if (nextModule === 'Retail 3') nextRole = 'Retail 3';
                else nextRole = 'user';

                setFormData({
                  ...formData,
                  module_type: nextModule,
                  role: nextRole
                });
              }} 
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}
            >
              <option value="">No Specific Module (NULL)</option>
              <option value="admin">Admin Module</option>
              <option value="Wholesale">Wholesale Module</option>
              <option value="Retail 1">Retail 1 Module</option>
              <option value="Retail 2">Retail 2 Module</option>
              <option value="Retail 3">Retail 3 Module</option>
            </select>
          </div>

          <h4>Assign Module Permissions</h4>
          <div className="permissions-grid">
            {availableModules.map(mod => (
              <label key={mod.id} className="permission-item">
                <input 
                  type="checkbox" 
                  checked={formData.permissions.includes(mod.id)}
                  onChange={() => handlePermissionToggle(mod.id)}
                />
                {mod.label}
              </label>
            ))}
          </div>

          <button type="submit" className="btn-success">
            <Save size={18} /> {editingId ? 'Update User' : 'Save User'}
          </button>
        </form>
      )}

      {editingId ? (
        <div className="devices-container" style={{ marginTop: '24px', background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a', fontWeight: '600' }}>Active Sessions & Devices</h3>
          {loadingDevices ? (
            <p style={{ color: '#64748b' }}>Loading active sessions...</p>
          ) : devices.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '14.5px' }}>No active logged-in devices found for this user.</p>
          ) : (
            <div className="table-container" style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', fontSize: '13.5px' }}>Device / OS / Browser</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', fontSize: '13.5px' }}>IP Address</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', fontSize: '13.5px' }}>Live Location</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', fontSize: '13.5px' }}>Last Activity</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', fontSize: '13.5px' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', fontSize: '13.5px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', color: '#0f172a', fontSize: '13.5px', fontWeight: '500' }}>{d.device_name}</td>
                      <td style={{ padding: '14px 16px', color: '#475569', fontSize: '13.5px', fontFamily: 'monospace' }}>{d.ip_address}</td>
                      <td style={{ padding: '14px 16px', color: '#0f172a', fontSize: '13.5px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', background: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                            📍 {d.location || 'Local / Unknown'}
                          </span>
                          {d.latitude && d.longitude && (
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${d.latitude},${d.longitude}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              style={{ color: '#2563eb', textDecoration: 'underline', fontSize: '11px', fontWeight: '600', marginLeft: '4px' }}
                            >
                              Open in Maps 🗺️
                            </a>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '13.5px' }}>
                        {new Date(d.last_login_at).toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                        {d.is_approved ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', background: '#d1fae5', color: '#065f46', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}>
                            Approved
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}>
                            Pending Approval
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {d.is_approved ? (
                          <button 
                            onClick={() => handleLogoutDevice(d.id)}
                            style={{
                              backgroundColor: '#ef4444',
                              color: '#ffffff',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              fontSize: '12.5px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'opacity 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.opacity = '0.85'}
                            onMouseOut={(e) => e.target.style.opacity = '1'}
                          >
                            Force Logout
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleApproveDevice(d.id)}
                            style={{
                              backgroundColor: '#10b981',
                              color: '#ffffff',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              fontSize: '12.5px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'opacity 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.opacity = '0.85'}
                            onMouseOut={(e) => e.target.style.opacity = '1'}
                          >
                            Approve Device
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Module Type</th>
                <th>Permissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                  <td>{u.module_type || 'None'}</td>
                  <td className="perms-cell">
                    {u.permissions?.length ? u.permissions.join(', ') : 'None'}
                  </td>
                  <td>
                    <ActionMenu 
                      onEdit={() => handleEditClick(u)} 
                      onDelete={() => handleDelete(u.id)} 
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSend = { ...formData };
    if (dataToSend.role === 'admin') {
      dataToSend.module_type = 'admin';
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

  return (
    <div className="users-manager">
      <div className="header">
        <h2>Users & Permissions</h2>
        <button className="btn-primary" onClick={() => {
          setShowForm(!showForm);
          if (editingId) {
            setEditingId(null);
            setFormData({ name: '', email: '', password: '', role: 'user', module_type: '', permissions: [] });
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
                setFormData({
                  ...formData, 
                  role: nextRole,
                  module_type: nextRole === 'admin' ? 'admin' : (formData.module_type === 'admin' ? 'Wholesale' : formData.module_type)
                });
              }} 
              required 
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}
            >
              <option value="user">User Role</option>
              <option value="admin">Admin Role</option>
            </select>
            <select 
              value={formData.module_type} 
              onChange={e => setFormData({...formData, module_type: e.target.value})} 
              disabled={formData.role === 'admin'}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: formData.role === 'admin' ? '#f1f5f9' : 'white' }}
            >
              <option value="">No Specific Module (NULL)</option>
              <option value="admin">Admin Module</option>
              <option value="Wholesale">Wholesale Module</option>
              <option value="Retail 1">Retail 1 Module</option>
              <option value="Retail 2">Retail 2 Module</option>
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
    </div>
  );
}

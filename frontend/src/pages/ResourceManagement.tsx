import React, { useState, useEffect } from 'react';
import { Cpu, Plus, Edit2, Trash2, Search, X, Filter, RotateCcw, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface Resource {
  id: string;
  name: string;
  type: string;
  capacity: number;
  available: boolean;
  department: string;
  cost: number;
}

export const ResourceManagement: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [availFilter, setAvailFilter] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  // Form State
  const [name, setName] = useState('Full Stack Developer');
  const [type, setType] = useState('IT Staff');
  const [capacity, setCapacity] = useState(1);
  const [department, setDepartment] = useState('IT');
  const [cost, setCost] = useState(0.0);
  const [available, setAvailable] = useState(true);

  const resourceTypes = [
    'IT Staff',
    'Regular Employees',
    'Security Teams',
    'Backup Systems',
    'Equipment',
    'Emergency Funds',
    'Infrastructure Resources'
  ];

  const resourceNamesMap: Record<string, string[]> = {
    'IT Staff': [
      'Full Stack Developer',
      'Frontend Dev',
      'Backend Dev',
      'AWS Dev',
      'Network Engineer',
      'Cybersecurity Expert'
    ],
    'Regular Employees': [
      'Peons',
      'Security Guard',
      'Electrician'
    ],
    'Equipment': [
      'i7 Lenovo Laptops',
      'WiFi',
      'LAN Cables'
    ],
    'Security Teams': [
      'Cyber Incident Response Team (CIRT)',
      'Physical Security Unit'
    ],
    'Backup Systems': [
      'Cloud Disaster Recovery Backup Cluster',
      'Local NAS Backup'
    ],
    'Emergency Funds': [
      'Emergency Contingency Reserve Fund',
      'Petty Cash Reserve'
    ],
    'Infrastructure Resources': [
      'Backup Internet Gateway',
      'Mobile Support Workstation'
    ]
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
    const names = resourceNamesMap[newType] || [];
    if (names.length > 0) {
      setName(names[0]);
    } else {
      setName('');
    }
  };

  const departments = ['IT', 'Security', 'HR', 'Operations', 'Finance', 'Facilities'];

  const fetchResources = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getResources(searchQuery, {
        department: deptFilter,
        type: typeFilter,
        available: availFilter
      });
      setResources(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch corporate resources from C++ backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchResources();
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery, deptFilter, typeFilter, availFilter]);

  // Listen for global resource updates (e.g. after allocation or resolve)
  useEffect(() => {
    const handler = () => fetchResources();
    window.addEventListener('resourcesUpdated', handler);
    return () => window.removeEventListener('resourcesUpdated', handler);
  }, [searchQuery, deptFilter, typeFilter, availFilter]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setDeptFilter('All');
    setTypeFilter('All');
    setAvailFilter('All');
  };

  const hasActiveFilters = searchQuery !== '' || deptFilter !== 'All' || typeFilter !== 'All' || availFilter !== 'All';

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || capacity <= 0) {
      setError('Please provide valid resource attributes.');
      return;
    }

    try {
      await api.createResource({ name, type, capacity, department, cost });
      fetchResources();
      setShowAddForm(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to register resource.');
    }
  };

  const handleEditResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource || !name || capacity <= 0) return;

    try {
      await api.updateResource(editingResource.id, {
        name,
        type,
        capacity,
        department,
        cost,
        available
      });
      fetchResources();
      setEditingResource(null);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to update resource.');
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this resource asset from the system registry?')) return;
    try {
      await api.deleteResource(id);
      fetchResources();
    } catch (err) {
      console.error(err);
      setError('Failed to delete resource.');
    }
  };

  const openEditModal = (res: Resource) => {
    setEditingResource(res);
    setName(res.name);
    setType(res.type);
    setCapacity(res.capacity);
    setDepartment(res.department);
    setCost(res.cost);
    setAvailable(res.available);
  };

  const resetForm = () => {
    setName('Full Stack Developer');
    setType('IT Staff');
    setCapacity(1);
    setDepartment('IT');
    setCost(100.0);
    setAvailable(true);
    setError('');
  };

  return (
    <div className="animate-fade">
      {error && (
        <div className="glass-panel" style={{
          background: 'var(--color-critical-bg)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: 'var(--color-critical)',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <X size={16} onClick={() => setError('')} style={{ cursor: 'pointer' }} />
        </div>
      )}

      {/* Registry Controls Header & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Corporate Resource Assets</h2>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchResources}
            className="glass-btn-secondary"
            style={{ padding: '10px 16px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => { resetForm(); setShowAddForm(true); }}
            className="glass-btn"
            style={{ padding: '10px 18px', fontSize: '0.85rem' }}
          >
            <Plus size={14} />
            Register Asset
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
        borderRadius: '16px',
        border: '1px solid var(--border-primary)'
      }}>
        {/* Search Query Input */}
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="glass-input"
            style={{ paddingLeft: '38px', fontSize: '0.85rem', width: '100%' }}
            placeholder="Search resources by name, type, or dept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <X size={14} onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-tertiary)' }} />
          )}
        </div>

        {/* Department Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={14} style={{ color: 'var(--text-tertiary)' }} />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="glass-input"
            style={{ fontSize: '0.82rem', padding: '8px 12px' }}
          >
            <option value="All" style={{ color: '#000' }}>All Departments</option>
            {departments.map(d => <option key={d} value={d} style={{ color: '#000' }}>{d}</option>)}
          </select>
        </div>

        {/* Resource Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="glass-input"
          style={{ fontSize: '0.82rem', padding: '8px 12px' }}
        >
          <option value="All" style={{ color: '#000' }}>All Resource Types</option>
          {resourceTypes.map(t => <option key={t} value={t} style={{ color: '#000' }}>{t}</option>)}
        </select>

        {/* Availability Filter */}
        <select
          value={availFilter}
          onChange={(e) => setAvailFilter(e.target.value)}
          className="glass-input"
          style={{ fontSize: '0.82rem', padding: '8px 12px' }}
        >
          <option value="All" style={{ color: '#000' }}>All Availability</option>
          <option value="Available" style={{ color: '#000' }}>Available</option>
          <option value="false" style={{ color: '#000' }}>Deployed / In Use</option>
        </select>

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="glass-btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCcw size={13} />
            Reset Filters
          </button>
        )}
      </div>

      {/* Add / Edit Resource Modal */}
      {(showAddForm || editingResource) && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-panel animate-slide" style={{
            width: '100%',
            maxWidth: '520px',
            padding: '32px',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {editingResource ? `Edit Asset: ${editingResource.id}` : 'Register Resource Asset'}
              </h3>
              <X size={20} onClick={() => { setShowAddForm(false); setEditingResource(null); }} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} />
            </div>

            <form onSubmit={editingResource ? handleEditResource : handleAddResource} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Resource Type
                </label>
                <select
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="glass-input"
                >
                  {resourceTypes.map(t => <option key={t} value={t} style={{color: '#000'}}>{t}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Resource Name
                </label>
                <select
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input"
                >
                  <option value="" disabled>Select a resource name</option>
                  {(resourceNamesMap[type] || []).map(resourceName => (
                    <option key={resourceName} value={resourceName} style={{ color: '#000' }}>
                      {resourceName}
                    </option>
                  ))}
                  {name && !(resourceNamesMap[type] || []).includes(name) && (
                    <option value={name} style={{ color: '#000' }}>
                      {name}
                    </option>
                  )}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Managing Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="glass-input"
                  >
                    {departments.map(d => <option key={d} value={d} style={{color: '#000'}}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Capacity Limit / Count
                  </label>
                  <input
                    type="number"
                    className="glass-input"
                    value={capacity}
                    min={1}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              {editingResource && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="availableCheck"
                    checked={available}
                    onChange={(e) => setAvailable(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="availableCheck" style={{ fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                    Resource Available for Allocation
                  </label>
                </div>
              )}

              <button
                type="submit"
                className="glass-btn"
                style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700, marginTop: '8px' }}
              >
                {editingResource ? 'Update Registry Records' : 'Register Corporate Asset'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Resources Table */}
      {loading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '50px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--primary-light)' }} />
          <div>Querying system asset registers...</div>
        </div>
      ) : resources.length > 0 ? (
        <div className="enterprise-table-container">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Name</th>
                <th>Resource Type</th>
                <th>Capacity</th>
                <th>Department</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.id}</td>
                  <td style={{ fontWeight: 700 }}>{r.name}</td>
                  <td>
                    <span style={{
                      fontSize: '0.75rem',
                      background: 'var(--bg-secondary)',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-primary)',
                      fontWeight: 600
                    }}>
                      {r.type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{r.capacity} units</td>
                  <td>{r.department}</td>
                  <td>
                    <span className={`status-pill ${r.available ? 'resolved' : 'pending'}`}>
                      {r.available ? 'Available' : 'Deployed'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => openEditModal(r)}
                        className="glass-btn-secondary"
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--primary)',
                          border: '1px solid var(--border-primary)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-normal)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--primary)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-primary)';
                          e.currentTarget.style.transform = 'translateY(0px)';
                        }}
                      >
                        <Edit2 size={13} />
                      </button>

                      <button
                        onClick={() => handleDeleteResource(r.id)}
                        className="glass-btn-secondary"
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-critical)',
                          border: '1px solid rgba(244, 63, 94, 0.2)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-normal)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--color-critical-bg)';
                          e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.4)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--bg-secondary)';
                          e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.2)';
                          e.currentTarget.style.transform = 'translateY(0px)';
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-secondary)' }}>
          <Cpu size={48} style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }} />
          <h3>Registry Empty: No Resources Found</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '8px', marginBottom: '20px' }}>
            No corporate assets match your current search and filter criteria. Try adjusting your parameters.
          </p>
          {hasActiveFilters && (
            <button onClick={handleResetFilters} className="glass-btn" style={{ padding: '10px 20px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <RotateCcw size={14} /> Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

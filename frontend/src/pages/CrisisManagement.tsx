import React, { useState, useEffect } from 'react';
import { ShieldAlert, Plus, CheckCircle, RefreshCw, X } from 'lucide-react';
import { api } from '../services/api';

interface Crisis {
  id: string;
  type: string;
  department: string;
  severity: number;
  description: string;
  requiredResources: string[];
  requiredResourceType: string;
  requiredUnits: number;
  status: string;
  timestamp: string;
  allocatedResourceIds: string[];
}

interface CrisisManagementProps {
  user: {
    username: string;
    name: string;
    role: string;
    department: string;
  };
}

export const CrisisManagement: React.FC<CrisisManagementProps> = ({ user }) => {
  const [crises, setCrises] = useState<Crisis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New Crisis Form State
  const [type, setType] = useState('IT Outage');
  const [department, setDepartment] = useState('IT');
  const [severity, setSeverity] = useState(2); // Medium default
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState('Full Stack Developer');
  const [requiredUnits, setRequiredUnits] = useState(1);

  const crisisTypes = [
    'IT Outage',
    'Cybersecurity Incident',
    'Employee Shortage',
    'Infrastructure Failure',
    'Operational Disruption',
    'Emergency Business Situation'
  ];

  const departments = ['IT', 'Security', 'HR', 'Operations', 'Finance', 'Legal'];

  const allResourceNames = [
    // IT Staff
    'Full Stack Developer',
    'Frontend Dev',
    'Backend Dev',
    'AWS Dev',
    'Network Engineer',
    'Cybersecurity Expert',
    // Regular Employees
    'Peons',
    'Security Guard',
    'Electrician',
    // Equipment
    'i7 Lenovo Laptops',
    'WiFi',
    'LAN Cables',
    // Security Teams
    'Cyber Incident Response Team (CIRT)',
    'Physical Security Unit',
    // Backup Systems
    'Cloud Disaster Recovery Backup Cluster',
    'Local NAS Backup',
    // Emergency Funds
    'Emergency Contingency Reserve Fund',
    'Petty Cash Reserve',
    // Infrastructure Resources
    'Backup Internet Gateway',
    'Mobile Support Workstation'
  ];

  const fetchCrises = async () => {
    try {
      const data = await api.getCrises();
      setCrises(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch crises from C++ backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrises();
  }, []);

  const handleAddCrisis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) {
      setError('Description is required.');
      return;
    }
    if (requiredUnits <= 0) {
      setError('Required units must be greater than zero.');
      return;
    }

    try {
      await api.createCrisis({
        type,
        department,
        severity,
        description,
        requiredResourceType: resourceType,
        requiredUnits
      });
      // Refresh list, close form, reset state
      fetchCrises();
      setShowAddForm(false);
      setDescription('');
      setResourceType('Full Stack Developer');
      setRequiredUnits(1);
      setError('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to submit incident report.');
    }
  };

  const handleResolveCrisis = async (id: string) => {
    try {
      await api.resolveCrisis(id);
      fetchCrises();
      // Notify other parts of the app (resource registry) to refresh
      window.dispatchEvent(new CustomEvent('resourcesUpdated'));
    } catch (err) {
      console.error(err);
      setError('Failed to resolve crisis.');
    }
  };

  const handleDeleteCrisis = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this crisis? This cannot be undone.')) return;
    try {
      await api.deleteCrisis(id);
      fetchCrises();
      window.dispatchEvent(new CustomEvent('resourcesUpdated'));
    } catch (err) {
      console.error(err);
      setError('Failed to delete crisis.');
    }
  };

  const getSeverityLabel = (sev: number) => {
    switch (sev) {
      case 4: return 'Critical';
      case 3: return 'High';
      case 2: return 'Medium';
      case 1: return 'Low';
      default: return 'Low';
    }
  };

  const getSeverityClass = (sev: number) => {
    switch (sev) {
      case 4: return 'critical';
      case 3: return 'high';
      case 2: return 'medium';
      case 1: return 'low';
      default: return 'low';
    }
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

      {/* Control Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Tactical Incidents List</h2>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchCrises}
            className="glass-btn-secondary"
            style={{ padding: '10px 16px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          
          <button 
            onClick={() => setShowAddForm(true)}
            className="glass-btn"
            style={{ padding: '10px 18px', fontSize: '0.85rem' }}
          >
            <Plus size={14} />
            Report New Crisis
          </button>
        </div>
      </div>

      {/* Add Crisis Modal Overlays */}
      {showAddForm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-panel animate-slide" style={{
            width: '100%',
            maxWidth: '560px',
            padding: '32px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Declare Corporate Crisis</h3>
              <X size={20} onClick={() => setShowAddForm(false)} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} />
            </div>

            <form onSubmit={handleAddCrisis} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Incident Category
                  </label>
                  <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                    className="glass-input"
                  >
                    {crisisTypes.map(t => <option key={t} value={t} style={{color: '#000'}}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Impacted Department
                  </label>
                  <select 
                    value={department} 
                    onChange={(e) => setDepartment(e.target.value)}
                    className="glass-input"
                  >
                    {departments.map(d => <option key={d} value={d} style={{color: '#000'}}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Threat Severity Level
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[1, 2, 3, 4].map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={severity === sev ? '' : 'glass-btn-secondary'}
                      style={{
                        padding: '10px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: '1px solid var(--border-primary)',
                        background: severity === sev ? 'var(--primary-gradient)' : 'transparent',
                        color: severity === sev ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      {getSeverityLabel(sev)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Required Resource
                  </label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value)}
                    className="glass-input"
                  >
                    {allResourceNames.map(res => <option key={res} value={res} style={{ color: '#000' }}>{res}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Units Required
                  </label>
                  <input
                    type="number"
                    className="glass-input"
                    min={1}
                    value={requiredUnits}
                    onChange={(e) => setRequiredUnits(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Incident Description & Diagnostics
                </label>
                <textarea
                  className="glass-input"
                  rows={3}
                  placeholder="Provide precise details of the ongoing crisis incident, diagnostics, systems affected, or personnel limitations..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button 
                type="submit" 
                className="glass-btn" 
                style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700, marginTop: '8px' }}
              >
                Log Incident to C++ Core
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Incident List Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading incident reports...</div>
      ) : crises.length > 0 ? (
        <div className="enterprise-table-container">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Incident & Dept</th>
                <th>Severity</th>
                <th>Description</th>
                <th>Required Assets</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {crises.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.id}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{c.type}</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{c.department} Department</span>
                  </td>
                  <td>
                    <span className={`severity-badge ${getSeverityClass(c.severity)}`}>
                      {getSeverityLabel(c.severity)}
                    </span>
                  </td>
                  <td style={{ maxWidth: '280px', fontSize: '0.85rem', lineHeight: '1.4' }}>{c.description}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        background: 'var(--bg-secondary)',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-primary)',
                        fontWeight: 600,
                        display: 'inline-block'
                      }}>
                        {c.requiredResourceType || c.requiredResources[0] || 'N/A'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {c.requiredUnits || 1} units required
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill ${c.status.toLowerCase()}`}>
                      {c.status}
                    </span>
                    {c.status === 'Allocated' && c.allocatedResourceIds && c.allocatedResourceIds.length > 0 && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                        Assets: {c.allocatedResourceIds.join(', ')}
                      </div>
                    )}
                  </td>
                  <td>
                    {c.status !== 'Resolved' ? (
                      user.role === 'admin' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleResolveCrisis(c.id)}
                            className="glass-btn"
                            style={{
                              padding: '6px 12px',
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                              background: 'var(--color-low-bg)',
                              color: 'var(--color-low)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              boxShadow: 'none'
                            }}
                          >
                            <CheckCircle size={12} />
                            Resolve
                          </button>

                          <button
                            onClick={() => handleDeleteCrisis(c.id)}
                            className="glass-btn"
                            style={{
                              padding: '6px 12px',
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                              background: 'transparent',
                              color: 'var(--color-critical)',
                              border: '1px solid rgba(244, 63, 94, 0.12)'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                          Awaiting Admin
                        </span>
                      )
                    ) : (
                      <span style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        color: 'var(--color-low)', 
                        fontSize: '0.8rem',
                        fontWeight: 700
                      }}>
                        <CheckCircle size={14} />
                        Completed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          <ShieldAlert size={48} style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }} />
          <h3>System Clear: No Active Crises</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
            All operations are currently running within optimal margins. Click 'Report New Crisis' to simulate an operational failure.
          </p>
        </div>
      )}
    </div>
  );
};

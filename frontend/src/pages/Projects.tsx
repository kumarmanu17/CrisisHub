import React, { useEffect, useState } from 'react';
import { Briefcase, Plus, CheckCircle, Trash2, RefreshCw, X } from 'lucide-react';
import { api } from '../services/api';

interface Project {
  id: string;
  name: string;
  department: string;
  resourceType: string;
  requiredUnits: number;
  description: string;
  status: string;
  timestamp: string;
  allocatedResources: { resourceId: string; units: number }[];
}

export const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [name, setName] = useState('New Workforce Project');
  const [department, setDepartment] = useState('Operations');
  const [resourceType, setResourceType] = useState('Full Stack Developer');
  const [requiredUnits, setRequiredUnits] = useState(1);
  const [description, setDescription] = useState('');

  const departments = ['IT', 'Security', 'HR', 'Operations', 'Finance', 'Facilities'];
  
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

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch projects from C++ backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const resetForm = () => {
    setName('New Workforce Project');
    setDepartment('Operations');
    setResourceType('Full Stack Developer');
    setRequiredUnits(1);
    setDescription('');
    setError('');
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || requiredUnits <= 0) {
      setError('Project name and unit requirement are required.');
      return;
    }

    try {
      await api.createProject({
        name,
        department,
        resourceType,
        requiredUnits,
        description
      });
      await fetchProjects();
      setShowAddForm(false);
      resetForm();
      window.dispatchEvent(new CustomEvent('resourcesUpdated'));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create project.');
    }
  };

  const handleCompleteProject = async (id: string) => {
    if (!window.confirm('Mark this project complete and release all assigned units?')) return;
    try {
      await api.completeProject(id);
      await fetchProjects();
      window.dispatchEvent(new CustomEvent('resourcesUpdated'));
    } catch (err) {
      console.error(err);
      setError('Failed to complete project.');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('Delete this project permanently? Assigned units will be returned.')) return;
    try {
      await api.deleteProject(id);
      await fetchProjects();
      window.dispatchEvent(new CustomEvent('resourcesUpdated'));
    } catch (err) {
      console.error(err);
      setError('Failed to delete project.');
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

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Projects Assignment Board</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchProjects} className="glass-btn-secondary" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
            <RefreshCw size={14} />
            Refresh
          </button>
          <button onClick={() => { resetForm(); setShowAddForm(true); }} className="glass-btn" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>
            <Plus size={14} />
            Add Project
          </button>
        </div>
      </div>

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
          <div className="glass-panel animate-slide" style={{ width: '100%', maxWidth: '560px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Assign Project Resources</h3>
              <X size={20} onClick={() => setShowAddForm(false)} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} />
            </div>

            <form onSubmit={handleAddProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Project Name</label>
                <input className="glass-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Finance System Migration" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Project Department</label>
                  <select className="glass-input" value={department} onChange={(e) => setDepartment(e.target.value)}>
                    {departments.map((d) => <option key={d} value={d} style={{ color: '#000' }}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Required Resource</label>
                  <select className="glass-input" value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
                    {allResourceNames.map((nameOption) => <option key={nameOption} value={nameOption} style={{ color: '#000' }}>{nameOption}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Units Required</label>
                  <input type="number" min={1} className="glass-input" value={requiredUnits} onChange={(e) => setRequiredUnits(parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Description</label>
                  <input className="glass-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional project details" />
                </div>
              </div>

              <button type="submit" className="glass-btn" style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700, marginTop: '8px' }}>
                Reserve Units for Project
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading projects...</div>
      ) : projects.length > 0 ? (
        <div className="enterprise-table-container">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Project</th>
                <th>Resource Need</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{project.id}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{project.name}</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{project.department}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '12px', border: '1px solid var(--border-primary)', fontWeight: 600, display: 'inline-block' }}>
                        {project.resourceType}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{project.requiredUnits} units</span>
                    </div>
                  </td>
                  <td style={{ maxWidth: '280px', fontSize: '0.85rem', lineHeight: '1.4' }}>{project.description || 'No description provided.'}</td>
                  <td>
                    <span className={`status-pill ${project.status === 'Completed' ? 'resolved' : 'allocated'}`}>{project.status}</span>
                    {project.allocatedResources.length > 0 && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                        Assets: {project.allocatedResources.map((entry) => `${entry.resourceId} (${entry.units})`).join(', ')}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {project.status !== 'Completed' && (
                        <button
                          onClick={() => handleCompleteProject(project.id)}
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
                          Complete
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteProject(project.id)}
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
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          <Briefcase size={48} style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }} />
          <h3>No Projects Registered</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
            Create a project and reserve resource units from the registry. Completed projects return those units automatically.
          </p>
        </div>
      )}
    </div>
  );
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE as string) || '/api';

// Helper for standard headers
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  // Authentication
  async login(username: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(err.message || 'Authentication failed');
    }
    return res.json();
  },

  // Crises Management
  async getCrises(filters?: { status?: string; department?: string; severity?: string | number; type?: string; q?: string }) {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.status && filters.status !== 'All') params.append('status', filters.status);
      if (filters.department && filters.department !== 'All') params.append('department', filters.department);
      if (filters.severity && filters.severity !== 'All' && String(filters.severity) !== '0') params.append('severity', String(filters.severity));
      if (filters.type && filters.type !== 'All') params.append('type', filters.type);
      if (filters.q && filters.q.trim()) params.append('q', filters.q.trim());
    }
    const queryString = params.toString();
    const url = queryString ? `${API_BASE_URL}/crises?${queryString}` : `${API_BASE_URL}/crises`;

    const res = await fetch(url, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch crises');
    return res.json();
  },

  async createCrisis(crisisData: {
    type: string;
    department: string;
    severity: number;
    description: string;
    requiredResourceType: string;
    requiredUnits: number;
  }) {
    const res = await fetch(`${API_BASE_URL}/crises`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(crisisData)
    });
    if (!res.ok) throw new Error('Failed to report crisis');
    return res.json();
  },

  async resolveCrisis(id: string) {
    const res = await fetch(`${API_BASE_URL}/crises/resolve/${id}`, {
      method: 'PUT',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to resolve crisis');
    return res.json();
  },

  async deleteCrisis(id: string) {
    const res = await fetch(`${API_BASE_URL}/crises/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete crisis');
    return res.json();
  },

  // Projects Management
  async getProjects(filters?: { status?: string; department?: string; resourceType?: string; q?: string }) {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.status && filters.status !== 'All') params.append('status', filters.status);
      if (filters.department && filters.department !== 'All') params.append('department', filters.department);
      if (filters.resourceType && filters.resourceType !== 'All') params.append('resourceType', filters.resourceType);
      if (filters.q && filters.q.trim()) params.append('q', filters.q.trim());
    }
    const queryString = params.toString();
    const url = queryString ? `${API_BASE_URL}/projects?${queryString}` : `${API_BASE_URL}/projects`;

    const res = await fetch(url, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },

  async createProject(projectData: {
    name: string;
    department: string;
    resourceType: string;
    requiredUnits: number;
    description: string;
  }) {
    const res = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(projectData)
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },

  async completeProject(id: string) {
    const res = await fetch(`${API_BASE_URL}/projects/complete/${id}`, {
      method: 'PUT',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to complete project');
    return res.json();
  },

  async deleteProject(id: string) {
    const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete project');
    return res.json();
  },

  // Resource Management
  async getResources(query = '', filters?: { department?: string; type?: string; available?: string }) {
    const params = new URLSearchParams();
    if (query && query.trim()) params.append('q', query.trim());
    if (filters) {
      if (filters.department && filters.department !== 'All') params.append('department', filters.department);
      if (filters.type && filters.type !== 'All') params.append('type', filters.type);
      if (filters.available && filters.available !== 'All') params.append('available', filters.available);
    }
    const queryString = params.toString();
    const url = queryString ? `${API_BASE_URL}/resources?${queryString}` : `${API_BASE_URL}/resources`;

    const res = await fetch(url, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch resources');
    return res.json();
  },

  async createResource(resourceData: {
    name: string;
    type: string;
    capacity: number;
    department: string;
    cost: number;
  }) {
    const res = await fetch(`${API_BASE_URL}/resources`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(resourceData)
    });
    if (!res.ok) throw new Error('Failed to create resource');
    return res.json();
  },

  async updateResource(id: string, resourceData: {
    name: string;
    type: string;
    capacity: number;
    department: string;
    cost: number;
    available: boolean;
  }) {
    const res = await fetch(`${API_BASE_URL}/resources/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(resourceData)
    });
    if (!res.ok) throw new Error('Failed to update resource');
    return res.json();
  },

  async deleteResource(id: string) {
    const res = await fetch(`${API_BASE_URL}/resources/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete resource');
    return res.json();
  },

  // Core DSA Allocation Engine Trigger
  async runAllocationEngine() {
    const res = await fetch(`${API_BASE_URL}/allocate`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Allocation run failed');
    return res.json();
  },

  // Dashboard & Analytics
  async getDashboardStats() {
    const res = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
    return res.json();
  },

  async getReports() {
    const res = await fetch(`${API_BASE_URL}/reports/performance`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch analytics reports');
    return res.json();
  }
};

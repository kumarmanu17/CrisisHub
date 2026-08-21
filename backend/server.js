const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const HOST = '127.0.0.1';

const dataDir = path.join(__dirname, 'data');
const files = {
  users: path.join(dataDir, 'users.json'),
  crises: path.join(dataDir, 'crises.json'),
  projects: path.join(dataDir, 'projects.json'),
  resources: path.join(dataDir, 'resources.json'),
  allocations: path.join(dataDir, 'allocations.json')
};

function readJsonArray(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function loadState() {
  return {
    users: readJsonArray(files.users),
    crises: readJsonArray(files.crises),
    projects: readJsonArray(files.projects),
    resources: readJsonArray(files.resources),
    allocations: readJsonArray(files.allocations)
  };
}

function saveState(state) {
  writeJsonArray(files.users, state.users);
  writeJsonArray(files.crises, state.crises);
  writeJsonArray(files.projects, state.projects);
  writeJsonArray(files.resources, state.resources);
  writeJsonArray(files.allocations, state.allocations);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

function notFound(res) {
  sendJson(res, 404, { success: false, message: 'Not found' });
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function nextId(items, prefix, floor) {
  let max = floor;
  for (const item of items) {
    if (typeof item.id === 'string' && item.id.startsWith(prefix)) {
      const numeric = Number.parseInt(item.id.slice(prefix.length), 10);
      if (!Number.isNaN(numeric) && numeric > max) {
        max = numeric;
      }
    }
  }
  return `${prefix}${max + 1}`;
}

function publicUser(user) {
  const { password, ...rest } = user;
  return rest;
}

function getRequiredType(crisisOrProject) {
  if (crisisOrProject.requiredResourceType) {
    return crisisOrProject.requiredResourceType;
  }
  if (Array.isArray(crisisOrProject.requiredResources) && crisisOrProject.requiredResources.length > 0) {
    return crisisOrProject.requiredResources[0];
  }
  return '';
}

function getMatchingResources(resources, requiredType) {
  return resources.filter((resource) => resource.type === requiredType && resource.available !== false && resource.capacity > 0);
}

function reserveUnits(state, requiredType, requiredUnits) {
  const matches = getMatchingResources(state.resources, requiredType).sort((a, b) => a.cost - b.cost);
  const allocations = [];
  let remaining = requiredUnits;

  for (const resource of matches) {
    if (remaining <= 0) break;
    const units = Math.min(resource.capacity, remaining);
    if (units <= 0) continue;
    resource.capacity -= units;
    resource.available = resource.capacity > 0;
    allocations.push({ resourceId: resource.id, units });
    remaining -= units;
  }

  if (remaining > 0) {
    for (const allocation of allocations) {
      const resource = state.resources.find((item) => item.id === allocation.resourceId);
      if (resource) {
        resource.capacity += allocation.units;
        resource.available = true;
      }
    }
    return null;
  }

  return allocations;
}

function releaseUnits(state, allocations) {
  for (const allocation of allocations) {
    const resource = state.resources.find((item) => item.id === allocation.resourceId);
    if (!resource) continue;
    resource.capacity += allocation.units;
    resource.available = true;
  }
}

function normalizeCrisisRecord(crisis) {
  crisis.requiredResources = Array.isArray(crisis.requiredResources) ? crisis.requiredResources : [];
  crisis.allocatedResourceIds = Array.isArray(crisis.allocatedResourceIds) ? crisis.allocatedResourceIds : [];
  crisis.allocatedResources = Array.isArray(crisis.allocatedResources) ? crisis.allocatedResources : [];
  crisis.requiredResourceType = crisis.requiredResourceType || getRequiredType(crisis) || 'General Resources';
  crisis.requiredUnits = Number.isFinite(crisis.requiredUnits) ? crisis.requiredUnits : 1;
  crisis.status = crisis.status || 'Pending';
  crisis.timestamp = crisis.timestamp || nowIso();
  return crisis;
}

function normalizeProjectRecord(project) {
  project.allocatedResources = Array.isArray(project.allocatedResources) ? project.allocatedResources : [];
  project.resourceType = project.resourceType || 'General Resources';
  project.requiredUnits = Number.isFinite(project.requiredUnits) ? project.requiredUnits : 1;
  project.status = project.status || 'Pending';
  project.timestamp = project.timestamp || nowIso();
  return project;
}

function buildDashboardStats(state) {
  const crises = state.crises.map(normalizeCrisisRecord);
  const resources = state.resources;
  const allocations = state.allocations;

  const totalCrises = crises.length;
  const pendingCrises = crises.filter((crisis) => crisis.status === 'Pending').length;
  const allocatedCrises = crises.filter((crisis) => crisis.status === 'Allocated').length;
  const resolvedCrises = crises.filter((crisis) => crisis.status === 'Resolved').length;

  const severityStats = {
    critical: crises.filter((crisis) => crisis.severity >= 4).length,
    high: crises.filter((crisis) => crisis.severity === 3).length,
    medium: crises.filter((crisis) => crisis.severity === 2).length,
    low: crises.filter((crisis) => crisis.severity <= 1).length
  };

  const totalResources = resources.length;
  const availableResources = resources.filter((resource) => resource.available !== false && resource.capacity > 0).length;
  const allocatedResources = Math.max(0, totalResources - availableResources);
  const allocationRate = totalResources === 0 ? 0 : (allocatedResources / totalResources) * 100;
  const totalAllocationCost = allocations.reduce((sum, allocation) => sum + (Number(allocation.totalCost) || 0), 0);

  const deptCrisisBreakdown = {};
  for (const crisis of crises) {
    deptCrisisBreakdown[crisis.department] = (deptCrisisBreakdown[crisis.department] || 0) + 1;
  }

  const activeAlerts = crises
    .filter((crisis) => crisis.status === 'Pending')
    .map((crisis) => `Pending ${crisis.type} in ${crisis.department} needs ${crisis.requiredUnits} unit(s) of ${crisis.requiredResourceType}`);

  return {
    totalCrises,
    pendingCrises,
    allocatedCrises,
    resolvedCrises,
    severityStats,
    totalResources,
    availableResources,
    allocatedResources,
    allocationRate,
    totalAllocationCost,
    deptCrisisBreakdown,
    activeAlerts
  };
}

function buildReportStats(state) {
  const crises = state.crises.map(normalizeCrisisRecord);
  const allocations = state.allocations;
  const departments = Array.from(new Set(crises.map((crisis) => crisis.department))).sort();

  const departmentPerformance = departments.map((department) => {
    const departmentCrises = crises.filter((crisis) => crisis.department === department);
    const resolvedCrises = departmentCrises.filter((crisis) => crisis.status === 'Resolved').length;
    const activeCrises = departmentCrises.filter((crisis) => crisis.status !== 'Resolved').length;
    const departmentAllocations = allocations.filter((allocation) => {
      const crisis = crises.find((item) => item.id === allocation.crisisId);
      return crisis && crisis.department === department;
    });
    const estimatedOperationalCost = departmentAllocations.reduce((sum, allocation) => sum + (Number(allocation.totalCost) || 0), 0);
    const resolutionRate = departmentCrises.length === 0 ? 0 : (resolvedCrises / departmentCrises.length) * 100;

    return {
      department,
      totalCrises: departmentCrises.length,
      resolvedCrises,
      activeCrises,
      estimatedOperationalCost,
      resolutionRate
    };
  });

  return {
    departmentPerformance,
    allocationHistory: allocations
  };
}

function createAllocationRecord(prefix, crisis, allocations, totalCost) {
  return {
    id: nextId([], prefix, prefix === 'A-' ? 5000 : 5000),
    crisisId: crisis.id,
    crisisTitle: crisis.type,
    resourceIds: allocations.map((allocation) => allocation.resourceId),
    timestamp: nowIso(),
    totalCost
  };
}

function allocateCrisis(state, crisis) {
  const requiredType = getRequiredType(crisis);
  const allocations = reserveUnits(state, requiredType, crisis.requiredUnits);
  if (!allocations) {
    return null;
  }

  crisis.status = 'Allocated';
  crisis.requiredResources = requiredType ? [requiredType] : crisis.requiredResources;
  crisis.requiredResourceType = requiredType;
  crisis.allocatedResources = allocations;
  crisis.allocatedResourceIds = allocations.map((allocation) => allocation.resourceId);

  const totalCost = allocations.reduce((sum, allocation) => {
    const resource = state.resources.find((item) => item.id === allocation.resourceId);
    return sum + (resource ? Number(resource.cost || 0) * allocation.units : 0);
  }, 0);

  const allocationRecord = {
    id: nextId(state.allocations, 'A-', 5000),
    crisisId: crisis.id,
    crisisTitle: crisis.type,
    resourceIds: allocations.map((allocation) => allocation.resourceId),
    timestamp: nowIso(),
    totalCost
  };

  state.allocations.push(allocationRecord);
  return allocationRecord;
}

function handleOptions(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    handleOptions(res);
    return;
  }

  const state = loadState();

  try {
    if (req.method === 'POST' && pathname === '/api/login') {
      const body = JSON.parse(await getBody(req) || '{}');
      const user = state.users.find((item) => item.username === body.username && item.password === body.password);
      if (!user) {
        sendJson(res, 401, { success: false, message: 'Invalid username or password.' });
        return;
      }
      sendJson(res, 200, {
        success: true,
        token: `demo_session_token_${user.username}`,
        user: publicUser(user)
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/crises') {
      sendJson(res, 200, state.crises.map(normalizeCrisisRecord));
      return;
    }

    if (req.method === 'POST' && pathname === '/api/crises') {
      const body = JSON.parse(await getBody(req) || '{}');
      const requiredType = body.requiredResourceType || (Array.isArray(body.requiredResources) && body.requiredResources[0]) || '';
      const requiredUnits = Number(body.requiredUnits || 1);
      const crisis = normalizeCrisisRecord({
        id: nextId(state.crises, 'C-', 2000),
        type: body.type,
        department: body.department,
        severity: Number(body.severity || 1),
        description: body.description || '',
        requiredResources: requiredType ? [requiredType] : [],
        requiredResourceType: requiredType,
        requiredUnits,
        status: 'Pending',
        timestamp: nowIso(),
        allocatedResourceIds: [],
        allocatedResources: []
      });

      const allocationRecord = allocateCrisis(state, crisis);
      if (!allocationRecord) {
        sendJson(res, 400, { success: false, message: `Insufficient units in resource registry for ${requiredType || 'the requested resource type'}.` });
        return;
      }

      state.crises.push(crisis);
      saveState(state);
      sendJson(res, 201, { success: true, crisis });
      return;
    }

    if (req.method === 'PUT' && pathname.startsWith('/api/crises/resolve/')) {
      const crisisId = decodeURIComponent(pathname.replace('/api/crises/resolve/', ''));
      const crisis = state.crises.find((item) => item.id === crisisId);
      if (!crisis) {
        sendJson(res, 404, { success: false, message: 'Crisis not found.' });
        return;
      }

      releaseUnits(state, crisis.allocatedResources || []);
      crisis.status = 'Resolved';
      crisis.allocatedResourceIds = [];
      crisis.allocatedResources = [];
      saveState(state);
      sendJson(res, 200, { success: true, message: 'Crisis marked resolved and resources released.', crisis });
      return;
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/crises/')) {
      const crisisId = decodeURIComponent(pathname.replace('/api/crises/', ''));
      const crisisIndex = state.crises.findIndex((item) => item.id === crisisId);
      if (crisisIndex === -1) {
        sendJson(res, 404, { success: false, message: 'Crisis not found.' });
        return;
      }

      const crisis = state.crises[crisisIndex];
      releaseUnits(state, crisis.allocatedResources || []);
      state.crises.splice(crisisIndex, 1);
      saveState(state);
      sendJson(res, 200, { success: true, message: 'Crisis deleted successfully.' });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/resources') {
      const query = (url.searchParams.get('q') || '').toLowerCase();
      const resources = query
        ? state.resources.filter((resource) => [resource.name, resource.type, resource.department].some((field) => String(field || '').toLowerCase().includes(query)))
        : state.resources;
      sendJson(res, 200, resources);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/resources') {
      const body = JSON.parse(await getBody(req) || '{}');
      const resource = {
        id: nextId(state.resources, 'R-', 3000),
        name: body.name,
        type: body.type,
        capacity: Number(body.capacity || 0),
        available: body.available !== undefined ? Boolean(body.available) : true,
        department: body.department,
        cost: Number(body.cost || 0)
      };
      state.resources.push(resource);
      saveState(state);
      sendJson(res, 201, { success: true, resource });
      return;
    }

    if (req.method === 'PUT' && pathname.startsWith('/api/resources/')) {
      const resourceId = decodeURIComponent(pathname.replace('/api/resources/', ''));
      const resource = state.resources.find((item) => item.id === resourceId);
      if (!resource) {
        sendJson(res, 404, { success: false, message: 'Resource not found.' });
        return;
      }

      const body = JSON.parse(await getBody(req) || '{}');
      resource.name = body.name;
      resource.type = body.type;
      resource.capacity = Number(body.capacity || 0);
      resource.department = body.department;
      resource.cost = Number(body.cost || 0);
      resource.available = Boolean(body.available);
      saveState(state);
      sendJson(res, 200, { success: true, resource });
      return;
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/resources/')) {
      const resourceId = decodeURIComponent(pathname.replace('/api/resources/', ''));
      const index = state.resources.findIndex((item) => item.id === resourceId);
      if (index === -1) {
        sendJson(res, 404, { success: false, message: 'Resource not found.' });
        return;
      }
      state.resources.splice(index, 1);
      saveState(state);
      sendJson(res, 200, { success: true, message: 'Resource deleted successfully.' });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/projects') {
      sendJson(res, 200, state.projects.map(normalizeProjectRecord));
      return;
    }

    if (req.method === 'POST' && pathname === '/api/projects') {
      const body = JSON.parse(await getBody(req) || '{}');
      const resourceType = body.resourceType || '';
      const requiredUnits = Number(body.requiredUnits || 1);
      const project = normalizeProjectRecord({
        id: nextId(state.projects, 'P-', 4000),
        name: body.name,
        department: body.department,
        resourceType,
        requiredUnits,
        description: body.description || '',
        status: 'Pending',
        timestamp: nowIso(),
        allocatedResources: []
      });

      const allocations = reserveUnits(state, resourceType, requiredUnits);
      if (!allocations) {
        sendJson(res, 400, { success: false, message: `Insufficient units in resource registry for ${resourceType || 'the requested resource type'}.` });
        return;
      }

      project.status = 'Allocated';
      project.allocatedResources = allocations;
      state.projects.push(project);
      saveState(state);
      sendJson(res, 201, { success: true, project });
      return;
    }

    if (req.method === 'PUT' && pathname.startsWith('/api/projects/complete/')) {
      const projectId = decodeURIComponent(pathname.replace('/api/projects/complete/', ''));
      const project = state.projects.find((item) => item.id === projectId);
      if (!project) {
        sendJson(res, 404, { success: false, message: 'Project not found.' });
        return;
      }
      releaseUnits(state, project.allocatedResources || []);
      project.status = 'Completed';
      project.allocatedResources = [];
      saveState(state);
      sendJson(res, 200, { success: true, message: 'Project completed and resources released.', project });
      return;
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/projects/')) {
      const projectId = decodeURIComponent(pathname.replace('/api/projects/', ''));
      const index = state.projects.findIndex((item) => item.id === projectId);
      if (index === -1) {
        sendJson(res, 404, { success: false, message: 'Project not found.' });
        return;
      }
      releaseUnits(state, state.projects[index].allocatedResources || []);
      state.projects.splice(index, 1);
      saveState(state);
      sendJson(res, 200, { success: true, message: 'Project deleted successfully.' });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/allocate') {
      const alerts = [];
      let allocatedCount = 0;

      for (const crisis of state.crises) {
        normalizeCrisisRecord(crisis);
        if (crisis.status !== 'Pending') continue;
        const allocationRecord = allocateCrisis(state, crisis);
        if (allocationRecord) {
          allocatedCount += 1;
        } else {
          alerts.push(`Shortage for ${crisis.id} (${crisis.requiredResourceType})`);
        }
      }

      saveState(state);
      sendJson(res, 200, {
        success: true,
        allocatedCount,
        alertsGenerated: alerts.length,
        alerts
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/dashboard/stats') {
      sendJson(res, 200, buildDashboardStats(state));
      return;
    }

    if (req.method === 'GET' && pathname === '/api/reports/performance') {
      sendJson(res, 200, buildReportStats(state));
      return;
    }

    notFound(res);
  } catch (error) {
    sendJson(res, 400, { success: false, message: `Malformed request: ${error.message}` });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[API] CCRAS backend listening at http://${HOST}:${PORT}`);
});
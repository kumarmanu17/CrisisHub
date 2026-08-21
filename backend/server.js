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

function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

function isValidInt(val, minVal, maxVal = Number.MAX_SAFE_INTEGER) {
  const num = Number(val);
  return Number.isInteger(num) && num >= minVal && num <= maxVal;
}

function isValidNumber(val, minVal) {
  const num = Number(val);
  return !Number.isNaN(num) && Number.isFinite(num) && num >= minVal;
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
    // 1. POST /api/login
    if (req.method === 'POST' && pathname === '/api/login') {
      const rawBody = await getBody(req);
      if (!rawBody || !rawBody.trim()) {
        sendJson(res, 400, { success: false, message: 'Request body cannot be empty.' });
        return;
      }

      let body;
      try {
        body = JSON.parse(rawBody);
      } catch {
        sendJson(res, 400, { success: false, message: 'Invalid JSON payload format.' });
        return;
      }

      if (!isNonEmptyString(body.username) || !isNonEmptyString(body.password)) {
        sendJson(res, 400, { success: false, message: 'Username and password are required fields.' });
        return;
      }

      const user = state.users.find((item) => item.username === body.username.trim() && item.password === body.password.trim());
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

    // 2. GET /api/crises
    if (req.method === 'GET' && pathname === '/api/crises') {
      const statusFilter = (url.searchParams.get('status') || '').trim();
      const deptFilter = (url.searchParams.get('department') || '').trim();
      const severityFilter = Number(url.searchParams.get('severity') || 0);
      const typeFilter = (url.searchParams.get('type') || '').trim();
      const query = (url.searchParams.get('q') || '').toLowerCase().trim();

      let results = state.crises.map(normalizeCrisisRecord);

      if (statusFilter && statusFilter !== 'All') {
        results = results.filter((c) => c.status === statusFilter);
      }
      if (deptFilter && deptFilter !== 'All') {
        results = results.filter((c) => c.department === deptFilter);
      }
      if (severityFilter > 0) {
        results = results.filter((c) => Number(c.severity) === severityFilter);
      }
      if (typeFilter && typeFilter !== 'All') {
        results = results.filter((c) => c.type === typeFilter);
      }
      if (query) {
        results = results.filter((c) =>
          [c.type, c.department, c.description, c.requiredResourceType, c.id].some((f) => String(f || '').toLowerCase().includes(query))
        );
      }

      sendJson(res, 200, results);
      return;
    }

    // 3. POST /api/crises
    if (req.method === 'POST' && pathname === '/api/crises') {
      const rawBody = await getBody(req);
      if (!rawBody || !rawBody.trim()) {
        sendJson(res, 400, { success: false, message: 'Request body cannot be empty.' });
        return;
      }

      let body;
      try {
        body = JSON.parse(rawBody);
      } catch {
        sendJson(res, 400, { success: false, message: 'Invalid JSON payload format.' });
        return;
      }

      if (!isNonEmptyString(body.type)) {
        sendJson(res, 400, { success: false, message: "Incident category ('type') is required." });
        return;
      }

      if (!isNonEmptyString(body.department)) {
        sendJson(res, 400, { success: false, message: 'Impacted department is required.' });
        return;
      }

      if (!isValidInt(body.severity, 1, 4)) {
        sendJson(res, 400, { success: false, message: 'Threat severity level must be an integer between 1 (Low) and 4 (Critical).' });
        return;
      }

      if (!isNonEmptyString(body.description)) {
        sendJson(res, 400, { success: false, message: 'Incident description is required.' });
        return;
      }

      const requiredType = body.requiredResourceType || (Array.isArray(body.requiredResources) && isNonEmptyString(body.requiredResources[0]) && body.requiredResources[0]) || '';
      if (!isNonEmptyString(requiredType)) {
        sendJson(res, 400, { success: false, message: 'Required resource type must be specified.' });
        return;
      }

      const requiredUnits = Number(body.requiredUnits || 1);
      if (!isValidInt(requiredUnits, 1)) {
        sendJson(res, 400, { success: false, message: 'Required units must be a positive integer greater than zero.' });
        return;
      }

      const crisis = normalizeCrisisRecord({
        id: nextId(state.crises, 'C-', 2000),
        type: body.type.trim(),
        department: body.department.trim(),
        severity: Number(body.severity),
        description: body.description.trim(),
        requiredResources: [requiredType],
        requiredResourceType: requiredType,
        requiredUnits,
        status: 'Pending',
        timestamp: nowIso(),
        allocatedResourceIds: [],
        allocatedResources: []
      });

      const allocationRecord = allocateCrisis(state, crisis);
      if (!allocationRecord) {
        sendJson(res, 400, { success: false, message: `Insufficient units in resource registry for ${requiredType}.` });
        return;
      }

      state.crises.push(crisis);
      saveState(state);
      sendJson(res, 201, { success: true, crisis });
      return;
    }

    // 4. PUT /api/crises/resolve/:id
    if (req.method === 'PUT' && pathname.startsWith('/api/crises/resolve/')) {
      const crisisId = decodeURIComponent(pathname.replace('/api/crises/resolve/', '')).trim();
      if (!crisisId) {
        sendJson(res, 400, { success: false, message: 'Crisis ID cannot be empty.' });
        return;
      }

      const crisis = state.crises.find((item) => item.id === crisisId);
      if (!crisis) {
        sendJson(res, 404, { success: false, message: `Crisis with ID '${crisisId}' not found.` });
        return;
      }

      if (crisis.status === 'Resolved') {
        sendJson(res, 200, { success: true, message: 'Crisis is already resolved.', crisis });
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

    // 5. DELETE /api/crises/:id
    if (req.method === 'DELETE' && pathname.startsWith('/api/crises/')) {
      const crisisId = decodeURIComponent(pathname.replace('/api/crises/', '')).trim();
      if (!crisisId) {
        sendJson(res, 400, { success: false, message: 'Crisis ID cannot be empty.' });
        return;
      }

      const crisisIndex = state.crises.findIndex((item) => item.id === crisisId);
      if (crisisIndex === -1) {
        sendJson(res, 404, { success: false, message: `Crisis with ID '${crisisId}' not found.` });
        return;
      }

      const crisis = state.crises[crisisIndex];
      releaseUnits(state, crisis.allocatedResources || []);
      state.crises.splice(crisisIndex, 1);
      saveState(state);
      sendJson(res, 200, { success: true, message: 'Crisis deleted successfully.' });
      return;
    }

    // 6. GET /api/resources
    if (req.method === 'GET' && pathname === '/api/resources') {
      const query = (url.searchParams.get('q') || '').toLowerCase().trim();
      const deptFilter = (url.searchParams.get('department') || '').trim();
      const typeFilter = (url.searchParams.get('type') || '').trim();
      const availFilter = (url.searchParams.get('available') || '').trim();

      let resources = state.resources;

      if (deptFilter && deptFilter !== 'All') {
        resources = resources.filter((r) => r.department === deptFilter);
      }
      if (typeFilter && typeFilter !== 'All') {
        resources = resources.filter((r) => r.type === typeFilter);
      }
      if (availFilter && availFilter !== 'All') {
        const reqAvail = availFilter === 'true' || availFilter === 'Available' || availFilter === '1';
        resources = resources.filter((r) => Boolean(r.available) === reqAvail);
      }
      if (query) {
        resources = resources.filter((r) =>
          [r.name, r.type, r.department, r.id].some((f) => String(f || '').toLowerCase().includes(query))
        );
      }

      sendJson(res, 200, resources);
      return;
    }

    // 7. POST /api/resources
    if (req.method === 'POST' && pathname === '/api/resources') {
      const rawBody = await getBody(req);
      if (!rawBody || !rawBody.trim()) {
        sendJson(res, 400, { success: false, message: 'Request body cannot be empty.' });
        return;
      }

      let body;
      try {
        body = JSON.parse(rawBody);
      } catch {
        sendJson(res, 400, { success: false, message: 'Invalid JSON payload format.' });
        return;
      }

      if (!isNonEmptyString(body.name)) {
        sendJson(res, 400, { success: false, message: 'Resource name is required.' });
        return;
      }

      if (!isNonEmptyString(body.type)) {
        sendJson(res, 400, { success: false, message: 'Resource type is required.' });
        return;
      }

      if (!isNonEmptyString(body.department)) {
        sendJson(res, 400, { success: false, message: 'Managing department is required.' });
        return;
      }

      if (!isValidInt(body.capacity, 1)) {
        sendJson(res, 400, { success: false, message: 'Resource capacity must be an integer greater than zero.' });
        return;
      }

      if (!isValidNumber(body.cost, 0)) {
        sendJson(res, 400, { success: false, message: 'Resource operating cost must be a non-negative number.' });
        return;
      }

      const resource = {
        id: nextId(state.resources, 'R-', 3000),
        name: body.name.trim(),
        type: body.type.trim(),
        capacity: Number(body.capacity),
        available: body.available !== undefined ? Boolean(body.available) : true,
        department: body.department.trim(),
        cost: Number(body.cost)
      };

      state.resources.push(resource);
      saveState(state);
      sendJson(res, 201, { success: true, resource });
      return;
    }

    // 8. PUT /api/resources/:id
    if (req.method === 'PUT' && pathname.startsWith('/api/resources/')) {
      const resourceId = decodeURIComponent(pathname.replace('/api/resources/', '')).trim();
      if (!resourceId) {
        sendJson(res, 400, { success: false, message: 'Resource ID cannot be empty.' });
        return;
      }

      const resource = state.resources.find((item) => item.id === resourceId);
      if (!resource) {
        sendJson(res, 404, { success: false, message: `Resource with ID '${resourceId}' not found.` });
        return;
      }

      const rawBody = await getBody(req);
      if (!rawBody || !rawBody.trim()) {
        sendJson(res, 400, { success: false, message: 'Request body cannot be empty.' });
        return;
      }

      let body;
      try {
        body = JSON.parse(rawBody);
      } catch {
        sendJson(res, 400, { success: false, message: 'Invalid JSON payload format.' });
        return;
      }

      if (!isNonEmptyString(body.name) || !isNonEmptyString(body.type) || !isNonEmptyString(body.department)) {
        sendJson(res, 400, { success: false, message: 'Name, type, and department are required string fields.' });
        return;
      }

      if (!isValidInt(body.capacity, 0)) {
        sendJson(res, 400, { success: false, message: 'Capacity must be a non-negative integer.' });
        return;
      }

      if (!isValidNumber(body.cost, 0)) {
        sendJson(res, 400, { success: false, message: 'Cost must be a non-negative number.' });
        return;
      }

      resource.name = body.name.trim();
      resource.type = body.type.trim();
      resource.capacity = Number(body.capacity);
      resource.department = body.department.trim();
      resource.cost = Number(body.cost);
      resource.available = body.available !== undefined ? Boolean(body.available) : resource.capacity > 0;
      saveState(state);
      sendJson(res, 200, { success: true, resource });
      return;
    }

    // 9. DELETE /api/resources/:id
    if (req.method === 'DELETE' && pathname.startsWith('/api/resources/')) {
      const resourceId = decodeURIComponent(pathname.replace('/api/resources/', '')).trim();
      if (!resourceId) {
        sendJson(res, 400, { success: false, message: 'Resource ID cannot be empty.' });
        return;
      }

      const index = state.resources.findIndex((item) => item.id === resourceId);
      if (index === -1) {
        sendJson(res, 404, { success: false, message: `Resource with ID '${resourceId}' not found.` });
        return;
      }
      state.resources.splice(index, 1);
      saveState(state);
      sendJson(res, 200, { success: true, message: 'Resource deleted successfully.' });
      return;
    }

    // 10. GET /api/projects
    if (req.method === 'GET' && pathname === '/api/projects') {
      const statusFilter = (url.searchParams.get('status') || '').trim();
      const deptFilter = (url.searchParams.get('department') || '').trim();
      const resTypeFilter = (url.searchParams.get('resourceType') || '').trim();
      const query = (url.searchParams.get('q') || '').toLowerCase().trim();

      let results = state.projects.map(normalizeProjectRecord);

      if (statusFilter && statusFilter !== 'All') {
        results = results.filter((p) => p.status === statusFilter);
      }
      if (deptFilter && deptFilter !== 'All') {
        results = results.filter((p) => p.department === deptFilter);
      }
      if (resTypeFilter && resTypeFilter !== 'All') {
        results = results.filter((p) => p.resourceType === resTypeFilter);
      }
      if (query) {
        results = results.filter((p) =>
          [p.name, p.department, p.resourceType, p.description, p.id].some((f) => String(f || '').toLowerCase().includes(query))
        );
      }

      sendJson(res, 200, results);
      return;
    }

    // 11. POST /api/projects
    if (req.method === 'POST' && pathname === '/api/projects') {
      const rawBody = await getBody(req);
      if (!rawBody || !rawBody.trim()) {
        sendJson(res, 400, { success: false, message: 'Request body cannot be empty.' });
        return;
      }

      let body;
      try {
        body = JSON.parse(rawBody);
      } catch {
        sendJson(res, 400, { success: false, message: 'Invalid JSON payload format.' });
        return;
      }

      if (!isNonEmptyString(body.name)) {
        sendJson(res, 400, { success: false, message: 'Project name is required.' });
        return;
      }

      if (!isNonEmptyString(body.department)) {
        sendJson(res, 400, { success: false, message: 'Project department is required.' });
        return;
      }

      if (!isNonEmptyString(body.resourceType)) {
        sendJson(res, 400, { success: false, message: 'Required resource type is required.' });
        return;
      }

      const requiredUnits = Number(body.requiredUnits || 1);
      if (!isValidInt(requiredUnits, 1)) {
        sendJson(res, 400, { success: false, message: 'Required units must be a positive integer greater than zero.' });
        return;
      }

      const resourceType = body.resourceType.trim();

      const project = normalizeProjectRecord({
        id: nextId(state.projects, 'P-', 4000),
        name: body.name.trim(),
        department: body.department.trim(),
        resourceType,
        requiredUnits,
        description: body.description ? String(body.description).trim() : '',
        status: 'Pending',
        timestamp: nowIso(),
        allocatedResources: []
      });

      const allocations = reserveUnits(state, resourceType, requiredUnits);
      if (!allocations) {
        sendJson(res, 400, { success: false, message: `Insufficient units in resource registry for ${resourceType}.` });
        return;
      }

      project.status = 'Allocated';
      project.allocatedResources = allocations;
      state.projects.push(project);
      saveState(state);
      sendJson(res, 201, { success: true, project });
      return;
    }

    // 12. PUT /api/projects/complete/:id
    if (req.method === 'PUT' && pathname.startsWith('/api/projects/complete/')) {
      const projectId = decodeURIComponent(pathname.replace('/api/projects/complete/', '')).trim();
      if (!projectId) {
        sendJson(res, 400, { success: false, message: 'Project ID cannot be empty.' });
        return;
      }

      const project = state.projects.find((item) => item.id === projectId);
      if (!project) {
        sendJson(res, 404, { success: false, message: `Project with ID '${projectId}' not found.` });
        return;
      }

      if (project.status === 'Completed') {
        sendJson(res, 200, { success: true, message: 'Project is already completed.', project });
        return;
      }

      releaseUnits(state, project.allocatedResources || []);
      project.status = 'Completed';
      project.allocatedResources = [];
      saveState(state);
      sendJson(res, 200, { success: true, message: 'Project completed and resources released.', project });
      return;
    }

    // 13. DELETE /api/projects/:id
    if (req.method === 'DELETE' && pathname.startsWith('/api/projects/')) {
      const projectId = decodeURIComponent(pathname.replace('/api/projects/', '')).trim();
      if (!projectId) {
        sendJson(res, 400, { success: false, message: 'Project ID cannot be empty.' });
        return;
      }

      const index = state.projects.findIndex((item) => item.id === projectId);
      if (index === -1) {
        sendJson(res, 404, { success: false, message: `Project with ID '${projectId}' not found.` });
        return;
      }
      releaseUnits(state, state.projects[index].allocatedResources || []);
      state.projects.splice(index, 1);
      saveState(state);
      sendJson(res, 200, { success: true, message: 'Project deleted successfully.' });
      return;
    }

    // 14. POST /api/allocate
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

    // 15. GET /api/dashboard/stats
    if (req.method === 'GET' && pathname === '/api/dashboard/stats') {
      sendJson(res, 200, buildDashboardStats(state));
      return;
    }

    // 16. GET /api/reports/performance
    if (req.method === 'GET' && pathname === '/api/reports/performance') {
      sendJson(res, 200, buildReportStats(state));
      return;
    }

    notFound(res);
  } catch (error) {
    sendJson(res, 500, { success: false, message: `Internal server error: ${error.message}` });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[API] CCRAS backend listening at http://${HOST}:${PORT}`);
});
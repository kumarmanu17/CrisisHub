#include "HttpServer.h"
#include "../managers/ReportManager.h"
#include <iostream>
#include <chrono>
#include <algorithm>
#include <cctype>

namespace {
    bool hasNonEmptyString(const json& j, const std::string& key) {
        if (!j.contains(key) || !j[key].is_string()) return false;
        std::string s = j[key].get<std::string>();
        s.erase(s.begin(), std::find_if(s.begin(), s.end(), [](unsigned char ch) {
            return !std::isspace(ch);
        }));
        return !s.empty();
    }

    bool isValidIntRange(const json& j, const std::string& key, int minVal, int maxVal = 1000000) {
        if (!j.contains(key) || !j[key].is_number_integer()) return false;
        int val = j[key].get<int>();
        return val >= minVal && val <= maxVal;
    }

    bool isValidNumberMin(const json& j, const std::string& key, double minVal) {
        if (!j.contains(key) || !j[key].is_number()) return false;
        double val = j[key].get<double>();
        return val >= minVal;
    }
}

HttpServer::HttpServer(const std::string& host, int port,
                       std::shared_ptr<AuthenticationManager> auth,
                       std::shared_ptr<CrisisManager> crisis,
                       std::shared_ptr<ProjectManager> project,
                       std::shared_ptr<ResourceManager> resource,
                       std::shared_ptr<AllocationManager> allocation)
    : host(host), port(port), authMgr(auth), crisisMgr(crisis), projectMgr(project), resourceMgr(resource), allocationMgr(allocation) {
    setupRoutes();
}

void HttpServer::setCorsHeaders(httplib::Response& res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.set_header("Content-Type", "application/json");
}

void HttpServer::setupRoutes() {
    // 1. CORS OPTIONS preflight
    svr.Options(R"(/api/.*)", [this](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        res.status = 200;
    });

    // 2. POST /api/login
    svr.Post("/api/login", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            if (req.body.empty()) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Request body cannot be empty."}}.dump();
                return;
            }

            auto body = json::parse(req.body);
            if (!hasNonEmptyString(body, "username") || !hasNonEmptyString(body, "password")) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Username and password are required fields."}}.dump();
                return;
            }

            std::string username = body["username"].get<std::string>();
            std::string password = body["password"].get<std::string>();

            User user;
            if (authMgr->authenticate(username, password, user)) {
                res.status = 200;
                res.body = json{
                    {"success", true},
                    {"token", "demo_session_token_" + username},
                    {"user", user.to_json()}
                }.dump();
            } else {
                res.status = 401;
                res.body = json{{"success", false}, {"message", "Invalid username or password."}}.dump();
            }
        } catch (const nlohmann::json::parse_error& e) {
            res.status = 400;
            res.body = json{{"success", false}, {"message", "Invalid JSON payload format."}}.dump();
        } catch (const std::exception& e) {
            res.status = 500;
            res.body = json{{"success", false}, {"message", "Authentication process error: " + std::string(e.what())}}.dump();
        }
    });

    // 3. GET /api/crises
    svr.Get("/api/crises", [this](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            auto crises = crisisMgr->getAllCrises();
            json j = json::array();
            for (const auto& c : crises) {
                j.push_back(c.to_json());
            }
            res.status = 200;
            res.body = j.dump();
        } catch (const std::exception& e) {
            res.status = 500;
            res.body = json{{"success", false}, {"message", "Failed to retrieve crises: " + std::string(e.what())}}.dump();
        }
    });

    // 4. POST /api/crises
    svr.Post("/api/crises", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            if (req.body.empty()) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Request body cannot be empty."}}.dump();
                return;
            }

            auto body = json::parse(req.body);

            // Validation: type, department, severity, description
            if (!hasNonEmptyString(body, "type")) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Incident category ('type') is required."}}.dump();
                return;
            }

            if (!hasNonEmptyString(body, "department")) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Impacted department is required."}}.dump();
                return;
            }

            if (!isValidIntRange(body, "severity", 1, 4)) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Threat severity level must be an integer between 1 (Low) and 4 (Critical)."}}.dump();
                return;
            }

            if (!hasNonEmptyString(body, "description")) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Incident description is required."}}.dump();
                return;
            }

            std::string requiredType = body.value("requiredResourceType", std::string());
            if (requiredType.empty() && body.contains("requiredResources") && body["requiredResources"].is_array() && !body["requiredResources"].empty()) {
                if (body["requiredResources"].front().is_string()) {
                    requiredType = body["requiredResources"].front().get<std::string>();
                }
            }

            if (requiredType.empty()) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Required resource type must be specified."}}.dump();
                return;
            }

            int requiredUnits = body.value("requiredUnits", 1);
            if (requiredUnits <= 0) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Required units must be a positive integer greater than zero."}}.dump();
                return;
            }

            std::vector<ResourceAllocation> allocations;
            std::string allocationError;
            if (!resourceMgr->reserveUnits(requiredType, requiredUnits, allocations, allocationError)) {
                if (allocationError.empty()) allocationError = "Insufficient units in resource registry.";
                res.status = 400;
                res.body = json{{"success", false}, {"message", allocationError}}.dump();
                return;
            }

            Crisis c;
            c.type = body["type"].get<std::string>();
            c.department = body["department"].get<std::string>();
            c.severity = body["severity"].get<int>();
            c.description = body["description"].get<std::string>();
            c.requiredResourceType = requiredType;
            c.requiredUnits = requiredUnits;
            c.requiredResources = {requiredType};
            c.allocatedResources = allocations;
            
            // Generate standard ID based on existing max ID
            int maxIdNum = 2000;
            for (const auto& existing : crisisMgr->getAllCrises()) {
                if (existing.id.rfind("C-", 0) == 0) {
                    try {
                        int num = std::stoi(existing.id.substr(2));
                        if (num > maxIdNum) {
                            maxIdNum = num;
                        }
                    } catch (...) {}
                }
            }
            c.id = "C-" + std::to_string(maxIdNum + 1);
            
            // Set timestamp
            std::time_t now = std::time(nullptr);
            char buf[80];
            std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", std::gmtime(&now));
            c.timestamp = buf;
            c.status = "Allocated";
            for (const auto& allocation : allocations) {
                c.allocatedResourceIds.push_back(allocation.resourceId);
            }

            if (crisisMgr->addCrisis(c)) {
                res.status = 201;
                res.body = json{{"success", true}, {"crisis", c.to_json()}}.dump();
            } else {
                resourceMgr->releaseUnits(allocations);
                res.status = 500;
                res.body = json{{"success", false}, {"message", "Failed to add crisis. Duplicate ID."}}.dump();
            }
        } catch (const nlohmann::json::parse_error& e) {
            res.status = 400;
            res.body = json{{"success", false}, {"message", "Invalid JSON format."}}.dump();
        } catch (const std::exception& e) {
            res.status = 400;
            res.body = json{{"success", false}, {"message", "Malformed request: " + std::string(e.what())}}.dump();
        }
    });

    // 5. PUT /api/crises/resolve/:id
    svr.Put(R"(/api/crises/resolve/([^/]+))", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            std::string crisisId = req.matches[1];
            if (crisisId.empty()) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Crisis ID cannot be empty."}}.dump();
                return;
            }
            
            Crisis c = crisisMgr->getCrisisById(crisisId);
            if (c.id.empty()) {
                res.status = 404;
                res.body = json{{"success", false}, {"message", "Crisis with ID '" + crisisId + "' not found."}}.dump();
                return;
            }

            if (c.status == "Resolved") {
                res.status = 200;
                res.body = json{{"success", true}, {"message", "Crisis is already resolved.", "crisis", c.to_json()}}.dump();
                return;
            }

            std::vector<ResourceAllocation> allocationsToRelease = c.allocatedResources;
            if (allocationsToRelease.empty()) {
                for (const auto& resId : c.allocatedResourceIds) {
                    allocationsToRelease.push_back(ResourceAllocation{resId, 1});
                }
            }

            resourceMgr->releaseUnits(allocationsToRelease);

            c.status = "Resolved";
            c.allocatedResourceIds.clear();
            c.allocatedResources.clear();
            crisisMgr->updateCrisis(c);

            res.status = 200;
            res.body = json{{"success", true}, {"message", "Crisis marked resolved and resources released.", "crisis", c.to_json()}}.dump();
        } catch (const std::exception& e) {
            res.status = 500;
            res.body = json{{"success", false}, {"message", "Failed to resolve crisis: " + std::string(e.what())}}.dump();
        }
    });

    // 5b. DELETE /api/crises/:id
    svr.Delete(R"(/api/crises/([^/]+))", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            std::string crisisId = req.matches[1];
            if (crisisId.empty()) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Crisis ID cannot be empty."}}.dump();
                return;
            }

            Crisis c = crisisMgr->getCrisisById(crisisId);
            if (c.id.empty()) {
                res.status = 404;
                res.body = json{{"success", false}, {"message", "Crisis with ID '" + crisisId + "' not found."}}.dump();
                return;
            }

            if (!c.allocatedResources.empty()) {
                resourceMgr->releaseUnits(c.allocatedResources);
            } else if (!c.allocatedResourceIds.empty()) {
                std::vector<ResourceAllocation> fallbackAllocations;
                for (const auto& resId : c.allocatedResourceIds) {
                    fallbackAllocations.push_back(ResourceAllocation{resId, 1});
                }
                resourceMgr->releaseUnits(fallbackAllocations);
            }

            if (crisisMgr->deleteCrisis(crisisId)) {
                res.status = 200;
                res.body = json{{"success", true}, {"message", "Crisis deleted successfully."}}.dump();
            } else {
                res.status = 404;
                res.body = json{{"success", false}, {"message", "Crisis with ID '" + crisisId + "' not found."}}.dump();
            }
        } catch (const std::exception& e) {
            res.status = 500;
            res.body = json{{"success", false}, {"message", "Failed to delete crisis: " + std::string(e.what())}}.dump();
        }
    });

    // 6. GET /api/resources
    svr.Get("/api/resources", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            std::string query = req.has_param("q") ? req.get_param_value("q") : "";
            auto resources = resourceMgr->searchResources(query);
            
            json j = json::array();
            for (const auto& r : resources) {
                j.push_back(r.to_json());
            }
            res.status = 200;
            res.body = j.dump();
        } catch (const std::exception& e) {
            res.status = 500;
            res.body = json{{"success", false}, {"message", "Failed to search resources: " + std::string(e.what())}}.dump();
        }
    });

    // 7. POST /api/resources
    svr.Post("/api/resources", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            if (req.body.empty()) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Request body cannot be empty."}}.dump();
                return;
            }

            auto body = json::parse(req.body);

            if (!hasNonEmptyString(body, "name")) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Resource name is required."}}.dump();
                return;
            }

            if (!hasNonEmptyString(body, "type")) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Resource type is required."}}.dump();
                return;
            }

            if (!hasNonEmptyString(body, "department")) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Managing department is required."}}.dump();
                return;
            }

            if (!isValidIntRange(body, "capacity", 1)) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Resource capacity must be an integer greater than zero."}}.dump();
                return;
            }

            if (!isValidNumberMin(body, "cost", 0.0)) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Resource operating cost must be a non-negative number."}}.dump();
                return;
            }

            Resource r;
            r.name = body["name"].get<std::string>();
            r.type = body["type"].get<std::string>();
            r.capacity = body["capacity"].get<int>();
            r.department = body["department"].get<std::string>();
            r.cost = body["cost"].get<double>();

            int maxIdNum = 3000;
            for (const auto& existing : resourceMgr->getAllResources()) {
                if (existing.id.rfind("R-", 0) == 0) {
                    try {
                        int num = std::stoi(existing.id.substr(2));
                        if (num > maxIdNum) {
                            maxIdNum = num;
                        }
                    } catch (...) {}
                }
            }
            r.id = "R-" + std::to_string(maxIdNum + 1);
            r.available = true;

            if (resourceMgr->addResource(r)) {
                res.status = 201;
                res.body = json{{"success", true}, {"resource", r.to_json()}}.dump();
            } else {
                res.status = 500;
                res.body = json{{"success", false}, {"message", "Failed to add resource. Duplicate ID."}}.dump();
            }
        } catch (const nlohmann::json::parse_error& e) {
            res.status = 400;
            res.body = json{{"success", false}, {"message", "Invalid JSON format."}}.dump();
        } catch (const std::exception& e) {
            res.status = 400;
            res.body = json{{"success", false}, {"message", "Malformed request: " + std::string(e.what())}}.dump();
        }
    });

    // 8. PUT /api/resources/:id
    svr.Put(R"(/api/resources/([^/]+))", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            std::string id = req.matches[1];
            if (id.empty()) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Resource ID cannot be empty."}}.dump();
                return;
            }

            Resource existing = resourceMgr->getResourceById(id);
            if (existing.id.empty()) {
                res.status = 404;
                res.body = json{{"success", false}, {"message", "Resource with ID '" + id + "' not found."}}.dump();
                return;
            }

            if (req.body.empty()) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Request body cannot be empty."}}.dump();
                return;
            }

            auto body = json::parse(req.body);

            if (!hasNonEmptyString(body, "name") || !hasNonEmptyString(body, "type") || !hasNonEmptyString(body, "department")) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Name, type, and department are required string fields."}}.dump();
                return;
            }

            if (!isValidIntRange(body, "capacity", 0)) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Capacity must be a non-negative integer."}}.dump();
                return;
            }

            if (!isValidNumberMin(body, "cost", 0.0)) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Cost must be a non-negative number."}}.dump();
                return;
            }

            Resource r = Resource::from_json(body);
            r.id = id;

            if (resourceMgr->updateResource(r)) {
                res.status = 200;
                res.body = json{{"success", true}, {"resource", r.to_json()}}.dump();
            } else {
                res.status = 404;
                res.body = json{{"success", false}, {"message", "Resource with ID '" + id + "' not found."}}.dump();
            }
        } catch (const nlohmann::json::parse_error& e) {
            res.status = 400;
            res.body = json{{"success", false}, {"message", "Invalid JSON format."}}.dump();
        } catch (const std::exception& e) {
            res.status = 400;
            res.body = json{{"success", false}, {"message", "Malformed request: " + std::string(e.what())}}.dump();
        }
    });

    // 9. DELETE /api/resources/:id
    svr.Delete(R"(/api/resources/([^/]+))", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            std::string id = req.matches[1];
            if (id.empty()) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Resource ID cannot be empty."}}.dump();
                return;
            }

            Resource existing = resourceMgr->getResourceById(id);
            if (existing.id.empty()) {
                res.status = 404;
                res.body = json{{"success", false}, {"message", "Resource with ID '" + id + "' not found."}}.dump();
                return;
            }

            if (resourceMgr->deleteResource(id)) {
                res.status = 200;
                res.body = json{{"success", true}, {"message", "Resource deleted successfully."}}.dump();
            } else {
                res.status = 404;
                res.body = json{{"success", false}, {"message", "Resource with ID '" + id + "' not found."}}.dump();
            }
        } catch (const std::exception& e) {
            res.status = 500;
            res.body = json{{"success", false}, {"message", "Failed to delete resource: " + std::string(e.what())}}.dump();
        }
    });

    // 10. GET /api/projects
    svr.Get("/api/projects", [this](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            auto projects = projectMgr->getAllProjects();
            json j = json::array();
            for (const auto& project : projects) {
                j.push_back(project.to_json());
            }
            res.status = 200;
            res.body = j.dump();
        } catch (const std::exception& e) {
            res.status = 500;
            res.body = json{{"success", false}, {"message", "Failed to retrieve projects: " + std::string(e.what())}}.dump();
        }
    });

    // 11. POST /api/projects
    svr.Post("/api/projects", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            if (req.body.empty()) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Request body cannot be empty."}}.dump();
                return;
            }

            auto body = json::parse(req.body);

            if (!hasNonEmptyString(body, "name")) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Project name is required."}}.dump();
                return;
            }

            if (!hasNonEmptyString(body, "department")) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Project department is required."}}.dump();
                return;
            }

            if (!hasNonEmptyString(body, "resourceType")) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Required resource type is required."}}.dump();
                return;
            }

            int requiredUnits = body.value("requiredUnits", 1);
            if (requiredUnits <= 0) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Required units must be a positive integer greater than zero."}}.dump();
                return;
            }

            std::string resourceType = body["resourceType"].get<std::string>();

            std::vector<ResourceAllocation> allocations;
            std::string allocationError;
            if (!resourceMgr->reserveUnits(resourceType, requiredUnits, allocations, allocationError)) {
                if (allocationError.empty()) allocationError = "Insufficient units in resource registry.";
                res.status = 400;
                res.body = json{{"success", false}, {"message", allocationError}}.dump();
                return;
            }

            Project project;
            project.name = body["name"].get<std::string>();
            project.department = body["department"].get<std::string>();
            project.resourceType = resourceType;
            project.requiredUnits = requiredUnits;
            project.description = body.value("description", std::string());
            project.status = "Allocated";
            project.allocatedResources = allocations;

            int maxIdNum = 4000;
            for (const auto& existing : projectMgr->getAllProjects()) {
                if (existing.id.rfind("P-", 0) == 0) {
                    try {
                        int num = std::stoi(existing.id.substr(2));
                        if (num > maxIdNum) {
                            maxIdNum = num;
                        }
                    } catch (...) {}
                }
            }
            project.id = "P-" + std::to_string(maxIdNum + 1);

            std::time_t now = std::time(nullptr);
            char buf[80];
            std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", std::gmtime(&now));
            project.timestamp = buf;

            if (projectMgr->addProject(project)) {
                res.status = 201;
                res.body = json{{"success", true}, {"project", project.to_json()}}.dump();
            } else {
                resourceMgr->releaseUnits(allocations);
                res.status = 500;
                res.body = json{{"success", false}, {"message", "Failed to add project. Duplicate ID."}}.dump();
            }
        } catch (const nlohmann::json::parse_error& e) {
            res.status = 400;
            res.body = json{{"success", false}, {"message", "Invalid JSON format."}}.dump();
        } catch (const std::exception& e) {
            res.status = 400;
            res.body = json{{"success", false}, {"message", "Malformed request: " + std::string(e.what())}}.dump();
        }
    });

    // 12. PUT /api/projects/complete/:id
    svr.Put(R"(/api/projects/complete/([^/]+))", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            std::string projectId = req.matches[1];
            if (projectId.empty()) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Project ID cannot be empty."}}.dump();
                return;
            }

            Project project = projectMgr->getProjectById(projectId);
            if (project.id.empty()) {
                res.status = 404;
                res.body = json{{"success", false}, {"message", "Project with ID '" + projectId + "' not found."}}.dump();
                return;
            }

            if (project.status == "Completed") {
                res.status = 200;
                res.body = json{{"success", true}, {"message", "Project is already completed.", "project", project.to_json()}}.dump();
                return;
            }

            resourceMgr->releaseUnits(project.allocatedResources);
            project.status = "Completed";
            project.allocatedResources.clear();
            projectMgr->updateProject(project);

            res.status = 200;
            res.body = json{{"success", true}, {"message", "Project completed and resources released.", "project", project.to_json()}}.dump();
        } catch (const std::exception& e) {
            res.status = 500;
            res.body = json{{"success", false}, {"message", "Failed to complete project: " + std::string(e.what())}}.dump();
        }
    });

    // 13. DELETE /api/projects/:id
    svr.Delete(R"(/api/projects/([^/]+))", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            std::string projectId = req.matches[1];
            if (projectId.empty()) {
                res.status = 400;
                res.body = json{{"success", false}, {"message", "Project ID cannot be empty."}}.dump();
                return;
            }

            Project project = projectMgr->getProjectById(projectId);
            if (project.id.empty()) {
                res.status = 404;
                res.body = json{{"success", false}, {"message", "Project with ID '" + projectId + "' not found."}}.dump();
                return;
            }

            resourceMgr->releaseUnits(project.allocatedResources);

            if (projectMgr->deleteProject(projectId)) {
                res.status = 200;
                res.body = json{{"success", true}, {"message", "Project deleted successfully."}}.dump();
            } else {
                res.status = 404;
                res.body = json{{"success", false}, {"message", "Project with ID '" + projectId + "' not found."}}.dump();
            }
        } catch (const std::exception& e) {
            res.status = 500;
            res.body = json{{"success", false}, {"message", "Failed to delete project: " + std::string(e.what())}}.dump();
        }
    });

    // 14. POST /api/allocate
    svr.Post("/api/allocate", [this](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            json result = allocationMgr->runGreedyAllocation(*crisisMgr, *resourceMgr);
            res.status = 200;
            res.body = result.dump();
        } catch (const std::exception& e) {
            res.status = 500;
            res.body = json{{"success", false}, {"message", "Allocation engine failed: " + std::string(e.what())}}.dump();
        }
    });

    // 15. GET /api/dashboard/stats
    svr.Get("/api/dashboard/stats", [this](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            json stats = ReportManager::getDashboardStats(*crisisMgr, *resourceMgr, *allocationMgr);
            res.status = 200;
            res.body = stats.dump();
        } catch (const std::exception& e) {
            res.status = 500;
            res.body = json{{"success", false}, {"message", "Failed to fetch stats: " + std::string(e.what())}}.dump();
        }
    });

    // 16. GET /api/reports/performance
    svr.Get("/api/reports/performance", [this](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            json performance = ReportManager::getDepartmentPerformance(*crisisMgr, *resourceMgr);
            json allocations = json::array();
            for (const auto& a : allocationMgr->getAllAllocations()) {
                allocations.push_back(a.to_json());
            }
            res.status = 200;
            res.body = json{
                {"departmentPerformance", performance},
                {"allocationHistory", allocations}
            }.dump();
        } catch (const std::exception& e) {
            res.status = 500;
            res.body = json{{"success", false}, {"message", "Failed to compile reports: " + std::string(e.what())}}.dump();
        }
    });

    // 17. General 404 error handler for invalid endpoints
    svr.set_error_handler([this](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        if (res.status == 404 && res.body.empty()) {
            res.body = json{{"success", false}, {"message", "API endpoint not found."}}.dump();
        }
    });
}

void HttpServer::start() {
    std::cout << "[INFO] Booting Corporate Crisis REST Backend..." << std::endl;
    std::cout << "[INFO] Listening at http://" << host << ":" << port << std::endl;
    svr.listen(host.c_str(), port);
}

void HttpServer::stop() {
    std::cout << "[INFO] Shutting down backend..." << std::endl;
    svr.stop();
}


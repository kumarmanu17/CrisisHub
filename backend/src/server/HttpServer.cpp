#include "HttpServer.h"
#include "../managers/ReportManager.h"
#include <iostream>
#include <chrono>
#include <algorithm>

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
            auto body = json::parse(req.body);
            std::string username = body.at("username").get<std::string>();
            std::string password = body.at("password").get<std::string>();

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
        } catch (const std::exception& e) {
            res.status = 400;
            res.body = json{{"success", false}, {"message", "Malformed request: " + std::string(e.what())}}.dump();
        }
    });

    // 3. GET /api/crises
    svr.Get("/api/crises", [this](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        auto crises = crisisMgr->getAllCrises();
        json j = json::array();
        for (const auto& c : crises) {
            j.push_back(c.to_json());
        }
        res.status = 200;
        res.body = j.dump();
    });

    // 4. POST /api/crises
    svr.Post("/api/crises", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            auto body = json::parse(req.body);

            std::string requiredType = body.value("requiredResourceType", std::string());
            if (requiredType.empty() && body.contains("requiredResources") && body["requiredResources"].is_array() && !body["requiredResources"].empty()) {
                requiredType = body["requiredResources"].front().get<std::string>();
            }
            int requiredUnits = body.value("requiredUnits", 1);

            std::vector<ResourceAllocation> allocations;
            std::string allocationError;
            if (requiredType.empty() || !resourceMgr->reserveUnits(requiredType, requiredUnits, allocations, allocationError)) {
                if (allocationError.empty()) allocationError = "Insufficient units in resource registry.";
                res.status = 400;
                res.body = json{{"success", false}, {"message", allocationError}}.dump();
                return;
            }

            Crisis c;
            c.type = body.at("type").get<std::string>();
            c.department = body.at("department").get<std::string>();
            c.severity = body.at("severity").get<int>();
            c.description = body.at("description").get<std::string>();
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
                res.status = 500;
                res.body = json{{"success", false}, {"message", "Failed to add crisis. Duplicate ID."}}.dump();
            }
        } catch (const std::exception& e) {
            res.status = 400;
            res.body = json{{"success", false}, {"message", "Malformed request: " + std::string(e.what())}}.dump();
        }
    });

    // 5. PUT /api/crises/resolve/:id
    svr.Put(R"(/api/crises/resolve/([^/]+))", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        std::string crisisId = req.matches[1];
        
        Crisis c = crisisMgr->getCrisisById(crisisId);
        if (c.id.empty()) {
            res.status = 404;
            res.body = json{{"success", false}, {"message", "Crisis not found."}}.dump();
            return;
        }

        // Release allocated resources back to Available.
        // If the crisis did not persist explicit allocation units, fall back to
        // the legacy ids so older records can still be released.
        std::vector<ResourceAllocation> allocationsToRelease = c.allocatedResources;
        if (allocationsToRelease.empty()) {
            for (const auto& resId : c.allocatedResourceIds) {
                allocationsToRelease.push_back(ResourceAllocation{resId, 1});
            }
        }

        resourceMgr->releaseUnits(allocationsToRelease);

        // Mark as Resolved
        c.status = "Resolved";
        c.allocatedResourceIds.clear();
        c.allocatedResources.clear();
        crisisMgr->updateCrisis(c);

        res.status = 200;
        res.body = json{{"success", true}, {"message", "Crisis marked resolved and resources released.", "crisis", c.to_json()}}.dump();
    });

    // 5b. DELETE /api/crises/:id
    svr.Delete(R"(/api/crises/([^/]+))", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        std::string crisisId = req.matches[1];
        Crisis c = crisisMgr->getCrisisById(crisisId);
        if (!c.id.empty()) {
            if (!c.allocatedResources.empty()) {
                resourceMgr->releaseUnits(c.allocatedResources);
            } else if (!c.allocatedResourceIds.empty()) {
                std::vector<ResourceAllocation> fallbackAllocations;
                for (const auto& resId : c.allocatedResourceIds) {
                    fallbackAllocations.push_back(ResourceAllocation{resId, 1});
                }
                resourceMgr->releaseUnits(fallbackAllocations);
            }
        }
        if (crisisMgr->deleteCrisis(crisisId)) {
            res.status = 200;
            res.body = json{{"success", true}, {"message", "Crisis deleted successfully."}}.dump();
        } else {
            res.status = 404;
            res.body = json{{"success", false}, {"message", "Crisis not found."}}.dump();
        }
    });

    // 6. GET /api/resources
    svr.Get("/api/resources", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        std::string query = req.has_param("q") ? req.get_param_value("q") : "";
        auto resources = resourceMgr->searchResources(query);
        
        json j = json::array();
        for (const auto& r : resources) {
            j.push_back(r.to_json());
        }
        res.status = 200;
        res.body = j.dump();
    });

    // 7b. GET /api/projects
    svr.Get("/api/projects", [this](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        auto projects = projectMgr->getAllProjects();
        json j = json::array();
        for (const auto& project : projects) {
            j.push_back(project.to_json());
        }
        res.status = 200;
        res.body = j.dump();
    });

    // 7c. POST /api/projects
    svr.Post("/api/projects", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            auto body = json::parse(req.body);

            std::string resourceType = body.value("resourceType", std::string());
            int requiredUnits = body.value("requiredUnits", 1);

            std::vector<ResourceAllocation> allocations;
            std::string allocationError;
            if (resourceType.empty() || !resourceMgr->reserveUnits(resourceType, requiredUnits, allocations, allocationError)) {
                if (allocationError.empty()) allocationError = "Insufficient units in resource registry.";
                res.status = 400;
                res.body = json{{"success", false}, {"message", allocationError}}.dump();
                return;
            }

            Project project;
            project.name = body.at("name").get<std::string>();
            project.department = body.at("department").get<std::string>();
            project.resourceType = resourceType;
            project.requiredUnits = requiredUnits;
            project.description = body.value("description", std::string());
            project.status = "Allocated";
            project.allocatedResources = allocations;

            // Generate standard ID based on existing max ID
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
        } catch (const std::exception& e) {
            res.status = 400;
            res.body = json{{"success", false}, {"message", "Malformed request: " + std::string(e.what())}}.dump();
        }
    });

    // 7d. PUT /api/projects/complete/:id
    svr.Put(R"(/api/projects/complete/([^/]+))", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        std::string projectId = req.matches[1];
        Project project = projectMgr->getProjectById(projectId);
        if (project.id.empty()) {
            res.status = 404;
            res.body = json{{"success", false}, {"message", "Project not found."}}.dump();
            return;
        }

        resourceMgr->releaseUnits(project.allocatedResources);
        project.status = "Completed";
        project.allocatedResources.clear();
        projectMgr->updateProject(project);

        res.status = 200;
        res.body = json{{"success", true}, {"message", "Project completed and resources released.", "project", project.to_json()}}.dump();
    });

    // 7e. DELETE /api/projects/:id
    svr.Delete(R"(/api/projects/([^/]+))", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        std::string projectId = req.matches[1];
        Project project = projectMgr->getProjectById(projectId);
        if (!project.id.empty()) {
            resourceMgr->releaseUnits(project.allocatedResources);
        }
        if (projectMgr->deleteProject(projectId)) {
            res.status = 200;
            res.body = json{{"success", true}, {"message", "Project deleted successfully."}}.dump();
        } else {
            res.status = 404;
            res.body = json{{"success", false}, {"message", "Project not found."}}.dump();
        }
    });

    // 7. POST /api/resources
    svr.Post("/api/resources", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            auto body = json::parse(req.body);

            Resource r;
            r.name = body.at("name").get<std::string>();
            r.type = body.at("type").get<std::string>();
            r.capacity = body.at("capacity").get<int>();
            r.department = body.at("department").get<std::string>();
            r.cost = body.at("cost").get<double>();

            // Generate standard ID based on existing max ID
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
        } catch (const std::exception& e) {
            res.status = 400;
            res.body = json{{"success", false}, {"message", "Malformed request: " + std::string(e.what())}}.dump();
        }
    });

    // 8. PUT /api/resources/:id
    svr.Put(R"(/api/resources/([^/]+))", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        std::string id = req.matches[1];
        try {
            auto body = json::parse(req.body);
            Resource r = Resource::from_json(body);
            r.id = id; // Ensure ID matches URL

            if (resourceMgr->updateResource(r)) {
                res.status = 200;
                res.body = json{{"success", true}, {"resource", r.to_json()}}.dump();
            } else {
                res.status = 404;
                res.body = json{{"success", false}, {"message", "Resource not found."}}.dump();
            }
        } catch (const std::exception& e) {
            res.status = 400;
            res.body = json{{"success", false}, {"message", "Malformed request: " + std::string(e.what())}}.dump();
        }
    });

    // 9. DELETE /api/resources/:id
    svr.Delete(R"(/api/resources/([^/]+))", [this](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        std::string id = req.matches[1];
        if (resourceMgr->deleteResource(id)) {
            res.status = 200;
            res.body = json{{"success", true}, {"message", "Resource deleted successfully."}}.dump();
        } else {
            res.status = 404;
            res.body = json{{"success", false}, {"message", "Resource not found."}}.dump();
        }
    });

    // 10. POST /api/allocate
    svr.Post("/api/allocate", [this](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            // Run C++ core greedy allocation engine using Priority Queue
            json result = allocationMgr->runGreedyAllocation(*crisisMgr, *resourceMgr);
            res.status = 200;
            res.body = result.dump();
        } catch (const std::exception& e) {
            res.status = 500;
            res.body = json{{"success", false}, {"message", "Allocation failed: " + std::string(e.what())}}.dump();
        }
    });

    // 11. GET /api/dashboard/stats
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

    // 12. GET /api/reports/performance
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

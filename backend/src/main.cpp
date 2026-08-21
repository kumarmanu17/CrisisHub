#include <iostream>
#include <memory>
#include "managers/AuthenticationManager.h"
#include "managers/CrisisManager.h"
#include "managers/ProjectManager.h"
#include "managers/ResourceManager.h"
#include "managers/AllocationManager.h"
#include "server/HttpServer.h"

int main() {
    std::cout << "=========================================================" << std::endl;
    std::cout << "      CORPORATE CRISIS RESOURCE ALLOCATION SYSTEM        " << std::endl;
    std::cout << "                     C++ REST API                        " << std::endl;
    std::cout << "=========================================================" << std::endl;

    // Database file paths
    std::string usersPath = "backend/data/users.json";
    std::string crisesPath = "backend/data/crises.json";
    std::string projectsPath = "backend/data/projects.json";
    std::string resourcesPath = "backend/data/resources.json";
    std::string allocationsPath = "backend/data/allocations.json";

    std::cout << "[INIT] Initializing database managers..." << std::endl;

    // Create managers using shared_ptr for modularity
    auto authMgr = std::make_shared<AuthenticationManager>(usersPath);
    auto crisisMgr = std::make_shared<CrisisManager>(crisesPath);
    auto projectMgr = std::make_shared<ProjectManager>(projectsPath);
    auto resourceMgr = std::make_shared<ResourceManager>(resourcesPath);
    auto allocationMgr = std::make_shared<AllocationManager>(allocationsPath);

    std::cout << "[INIT] Data managers successfully initialized." << std::endl;
    std::cout << "[INIT] Active Crises Loaded: " << crisisMgr->getAllCrises().size() << std::endl;
    std::cout << "[INIT] Resources Registered: " << resourceMgr->getAllResources().size() << std::endl;

    // Set up Server
    std::string host = "127.0.0.1";
    int port = 8080;

    HttpServer server(host, port, authMgr, crisisMgr, projectMgr, resourceMgr, allocationMgr);

    try {
        server.start();
    } catch (const std::exception& e) {
        std::cerr << "[FATAL] Server encountered an error: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}

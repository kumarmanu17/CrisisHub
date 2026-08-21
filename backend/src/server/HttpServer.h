#pragma once
#include <string>
#include <memory>
#include "../../include/httplib.h"
#include "../managers/AuthenticationManager.h"
#include "../managers/CrisisManager.h"
#include "../managers/ProjectManager.h"
#include "../managers/ResourceManager.h"
#include "../managers/AllocationManager.h"

class HttpServer {
private:
    httplib::Server svr;
    std::string host;
    int port;
    
    std::shared_ptr<AuthenticationManager> authMgr;
    std::shared_ptr<CrisisManager> crisisMgr;
    std::shared_ptr<ProjectManager> projectMgr;
    std::shared_ptr<ResourceManager> resourceMgr;
    std::shared_ptr<AllocationManager> allocationMgr;

    void setupRoutes();
    void setCorsHeaders(httplib::Response& res);

public:
    HttpServer(const std::string& host, int port,
               std::shared_ptr<AuthenticationManager> auth,
               std::shared_ptr<CrisisManager> crisis,
               std::shared_ptr<ProjectManager> project,
               std::shared_ptr<ResourceManager> resource,
               std::shared_ptr<AllocationManager> allocation);
               
    void start();
    void stop();
};

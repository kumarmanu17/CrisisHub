#pragma once
#include <string>
#include "../../include/json.hpp"
#include "CrisisManager.h"
#include "ResourceManager.h"
#include "AllocationManager.h"

using json = nlohmann::json;

class ReportManager {
public:
    static json getDashboardStats(CrisisManager& crisisMgr, ResourceManager& resourceMgr, AllocationManager& allocationMgr);
    static json getDepartmentPerformance(CrisisManager& crisisMgr, ResourceManager& resourceMgr);
};

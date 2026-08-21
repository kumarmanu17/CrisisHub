#include "ReportManager.h"
#include <map>
#include <iostream>

json ReportManager::getDashboardStats(CrisisManager& crisisMgr, ResourceManager& resourceMgr, AllocationManager& allocationMgr) {
    auto crises = crisisMgr.getAllCrises();
    auto resources = resourceMgr.getAllResources();
    auto allocations = allocationMgr.getAllAllocations();
    auto alerts = allocationMgr.getActiveAlerts();

    int totalCrises = crises.size();
    int pendingCrises = 0;
    int allocatedCrises = 0;
    int resolvedCrises = 0;
    int criticalCrises = 0;
    int highCrises = 0;
    int mediumCrises = 0;
    int lowCrises = 0;

    std::map<std::string, int> deptCrisisCount;
    for (const auto& c : crises) {
        if (c.status == "Pending") pendingCrises++;
        else if (c.status == "Allocated") allocatedCrises++;
        else if (c.status == "Resolved") resolvedCrises++;

        if (c.severity == 4) criticalCrises++;
        else if (c.severity == 3) highCrises++;
        else if (c.severity == 2) mediumCrises++;
        else if (c.severity == 1) lowCrises++;

        deptCrisisCount[c.department]++;
    }

    int totalResources = resources.size();
    int availableResources = 0;
    int allocatedResourcesCount = 0;
    for (const auto& r : resources) {
        if (r.available) availableResources++;
        else allocatedResourcesCount++;
    }

    double totalAllocationCost = 0.0;
    for (const auto& a : allocations) {
        totalAllocationCost += a.totalCost;
    }

    json deptData = json::object();
    for (const auto& pair : deptCrisisCount) {
        deptData[pair.first] = pair.second;
    }

    return json{
        {"totalCrises", totalCrises},
        {"pendingCrises", pendingCrises},
        {"allocatedCrises", allocatedCrises},
        {"resolvedCrises", resolvedCrises},
        {"severityStats", {
            {"critical", criticalCrises},
            {"high", highCrises},
            {"medium", mediumCrises},
            {"low", lowCrises}
        }},
        {"totalResources", totalResources},
        {"availableResources", availableResources},
        {"allocatedResources", allocatedResourcesCount},
        {"allocationRate", totalResources > 0 ? (double(allocatedResourcesCount) / totalResources) * 100 : 0.0},
        {"totalAllocationCost", totalAllocationCost},
        {"deptCrisisBreakdown", deptData},
        {"activeAlerts", alerts}
    };
}

json ReportManager::getDepartmentPerformance(CrisisManager& crisisMgr, ResourceManager& resourceMgr) {
    auto crises = crisisMgr.getAllCrises();
    auto resources = resourceMgr.getAllResources();

    struct DeptMetrics {
        int total = 0;
        int resolved = 0;
        int active = 0;
        double totalCost = 0.0;
    };

    std::map<std::string, DeptMetrics> metrics;
    for (const auto& c : crises) {
        metrics[c.department].total++;
        if (c.status == "Resolved") {
            metrics[c.department].resolved++;
        } else {
            metrics[c.department].active++;
        }
    }

    for (const auto& r : resources) {
        if (!r.available) {
            metrics[r.department].totalCost += r.cost;
        }
    }

    json report = json::array();
    for (const auto& pair : metrics) {
        double resolutionRate = pair.second.total > 0 ? (double(pair.second.resolved) / pair.second.total) * 100 : 100.0;
        report.push_back(json{
            {"department", pair.first},
            {"totalCrises", pair.second.total},
            {"resolvedCrises", pair.second.resolved},
            {"activeCrises", pair.second.active},
            {"estimatedOperationalCost", pair.second.totalCost},
            {"resolutionRate", resolutionRate}
        });
    }

    return report;
}

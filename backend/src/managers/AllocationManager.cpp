#include "AllocationManager.h"
#include <fstream>
#include <iostream>
#include <ctime>

AllocationManager::AllocationManager(const std::string& dataPath) : filepath(dataPath) {
    loadAllocations();
}

void AllocationManager::loadAllocations() {
    std::ifstream file(filepath);
    if (!file.is_open()) {
        allocations.clear();
        saveAllocations();
        return;
    }
    try {
        json j;
        file >> j;
        allocations.clear();
        for (const auto& item : j) {
            allocations.push_back(Allocation::from_json(item));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error loading allocations: " << e.what() << "\n";
    }
}

void AllocationManager::saveAllocations() {
    json j = json::array();
    for (const auto& a : allocations) {
        j.push_back(a.to_json());
    }
    std::ofstream file(filepath);
    if (file.is_open()) {
        file << j.dump(4);
    }
}

std::vector<Allocation> AllocationManager::getAllAllocations() {
    return allocations;
}

std::vector<std::string> AllocationManager::getActiveAlerts() {
    return activeAlerts;
}

void AllocationManager::clearActiveAlerts() {
    activeAlerts.clear();
}

std::string generateUniqueId(const std::string& prefix) {
    static int counter = 100;
    return prefix + std::to_string(++counter) + "_" + std::to_string(std::time(nullptr) % 1000);
}

json AllocationManager::runGreedyAllocation(CrisisManager& crisisMgr, ResourceManager& resourceMgr) {
    activeAlerts.clear();
    
    std::vector<Crisis> allCrises = crisisMgr.getAllCrises();
    
    std::priority_queue<Crisis, std::vector<Crisis>, CrisisComparator> pq;
    int pendingCount = 0;
    for (const auto& c : allCrises) {
        if (c.status == "Pending") {
            pq.push(c);
            pendingCount++;
        }
    }
    
    if (pendingCount == 0) {
        return json{
            {"success", true},
            {"allocatedCount", 0},
            {"message", "No pending crises require allocation."}
        };
    }
    
    int successfullyAllocated = 0;
    json allocationReport = json::array();
    
    while (!pq.empty()) {
        Crisis currentCrisis = pq.top();
        pq.pop();
        
        std::string requiredType = currentCrisis.requiredResourceType;
        if (requiredType.empty() && !currentCrisis.requiredResources.empty()) {
            requiredType = currentCrisis.requiredResources.front();
        }

        std::vector<ResourceAllocation> reservedResources;
        std::string reserveError;

        if (requiredType.empty()) {
            reserveError = "No resource type specified for crisis allocation.";
        } else if (!resourceMgr.reserveUnits(requiredType, currentCrisis.requiredUnits, reservedResources, reserveError)) {
            if (reserveError.empty()) {
                reserveError = "Insufficient units in resource registry.";
            }
        }

        if (!reservedResources.empty()) {
            std::vector<std::string> allocatedIds;
            double totalCost = 0.0;

            for (const auto& allocation : reservedResources) {
                allocatedIds.push_back(allocation.resourceId);
                const auto resource = resourceMgr.getResourceById(allocation.resourceId);
                totalCost += resource.cost * allocation.units;
            }

            currentCrisis.requiredResourceType = requiredType;
            currentCrisis.requiredUnits = currentCrisis.requiredUnits > 0 ? currentCrisis.requiredUnits : 1;
            currentCrisis.allocatedResources = reservedResources;
            currentCrisis.allocatedResourceIds = allocatedIds;
            currentCrisis.status = "Allocated";
            crisisMgr.updateCrisis(currentCrisis);

            Allocation alloc;
            alloc.id = generateUniqueId("AL-");
            alloc.crisisId = currentCrisis.id;
            alloc.crisisTitle = currentCrisis.type + " - " + currentCrisis.department;
            alloc.resourceIds = allocatedIds;

            std::time_t now = std::time(nullptr);
            char buf[80];
            std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", std::gmtime(&now));
            alloc.timestamp = buf;
            alloc.totalCost = totalCost;

            allocations.push_back(alloc);
            successfullyAllocated++;

            allocationReport.push_back(json{
                {"crisisId", currentCrisis.id},
                {"crisisType", currentCrisis.type},
                {"requiredUnits", currentCrisis.requiredUnits},
                {"requiredResourceType", requiredType},
                {"allocatedResources", json::array()},
                {"totalCost", totalCost}
            });
        } else if (!reserveError.empty()) {
            activeAlerts.push_back("SHORTAGE ALERT: Crisis " + currentCrisis.id + " (" + currentCrisis.type + ") - " + reserveError);
        }
    }
    
    if (successfullyAllocated > 0) {
        saveAllocations();
    }
    
    return json{
        {"success", true},
        {"allocatedCount", successfullyAllocated},
        {"alertsGenerated", activeAlerts.size()},
        {"details", allocationReport}
    };
}

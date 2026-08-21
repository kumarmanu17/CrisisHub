#pragma once
#include <string>
#include <vector>
#include <queue>
#include "../models/Allocation.h"
#include "../models/Crisis.h"
#include "CrisisManager.h"
#include "ResourceManager.h"

struct CrisisComparator {
    bool operator()(const Crisis& a, const Crisis& b) const {
        if (a.severity != b.severity) {
            return a.severity < b.severity; // higher severity has priority
        }
        return a.timestamp > b.timestamp; // earlier timestamp goes first
    }
};

class AllocationManager {
private:
    std::string filepath;
    std::vector<Allocation> allocations;
    std::vector<std::string> activeAlerts;
    void loadAllocations();
    void saveAllocations();

public:
    AllocationManager(const std::string& dataPath);
    std::vector<Allocation> getAllAllocations();
    std::vector<std::string> getActiveAlerts();
    void clearActiveAlerts();
    
    // Core DSA Algorithm
    json runGreedyAllocation(CrisisManager& crisisMgr, ResourceManager& resourceMgr);
};

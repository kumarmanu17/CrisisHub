#include "CrisisManager.h"
#include <fstream>
#include <iostream>
#include <algorithm>
#include <filesystem>

CrisisManager::CrisisManager(const std::string& dataPath) : filepath(dataPath) {
    loadCrises();
}

void CrisisManager::loadCrises() {
    std::ifstream file(filepath);
    if (!file.is_open()) {
        seedCrises();
        return;
    }
    try {
        json j;
        file >> j;
        crises.clear();
        for (const auto& item : j) {
            crises.push_back(Crisis::from_json(item));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error loading crises: " << e.what() << "\n";
        seedCrises();
    }
}

#ifdef _WIN32
#include <direct.h>
#else
#include <sys/stat.h>
#endif

void CrisisManager::saveCrises() {
    json j = json::array();
    for (const auto& c : crises) {
        j.push_back(c.to_json());
    }
    
    size_t pos = filepath.find_last_of("/\\");
    if (pos != std::string::npos) {
        std::string dir = filepath.substr(0, pos);
#ifdef _WIN32
        _mkdir(dir.c_str());
#else
        mkdir(dir.c_str(), 0755);
#endif
    }

    std::ofstream file(filepath);
    if (file.is_open()) {
        file << j.dump(4);
    } else {
        std::cerr << "Failed to open crises file for writing: " << filepath << "\n";
    }
}

void CrisisManager::seedCrises() {
    crises.clear();

    Crisis c1;
    c1.id = "C-1001";
    c1.type = "Cybersecurity Incident";
    c1.department = "Security";
    c1.severity = 4; // Critical
    c1.description = "Ransomware outbreak detected on main database server.";
    c1.requiredResources = {"Security Teams", "Backup Systems"};
    c1.status = "Pending";
    c1.timestamp = "2026-05-25T10:15:00Z";
    c1.allocatedResourceIds = {};

    Crisis c2;
    c2.id = "C-1002";
    c2.type = "IT Outage";
    c2.department = "IT";
    c2.severity = 3; // High
    c2.description = "Primary network router switch hardware failure. Office Wi-Fi offline.";
    c2.requiredResources = {"IT Staff", "Equipment"};
    c2.status = "Pending";
    c2.timestamp = "2026-05-25T11:30:00Z";
    c2.allocatedResourceIds = {};

    Crisis c3;
    c3.id = "C-1003";
    c3.type = "Employee Shortage";
    c3.department = "Operations";
    c3.severity = 2; // Medium
    c3.description = "Over 40% of the logistics workforce call in sick. Delivery delays expected.";
    c3.requiredResources = {"IT Staff"};
    c3.status = "Pending";
    c3.timestamp = "2026-05-25T12:00:00Z";
    c3.allocatedResourceIds = {};

    crises.push_back(c1);
    crises.push_back(c2);
    crises.push_back(c3);

    saveCrises();
}

std::vector<Crisis> CrisisManager::getAllCrises() {
    return crises;
}

std::vector<Crisis> CrisisManager::searchAndFilterCrises(const std::string& status, const std::string& department, int severity, const std::string& type, const std::string& query) {
    std::vector<Crisis> results;
    std::string lowerQuery = query;
    std::transform(lowerQuery.begin(), lowerQuery.end(), lowerQuery.begin(), ::tolower);

    for (const auto& c : crises) {
        if (!status.empty() && status != "All" && c.status != status) continue;
        if (!department.empty() && department != "All" && c.department != department) continue;
        if (severity > 0 && c.severity != severity) continue;
        if (!type.empty() && type != "All" && c.type != type) continue;

        if (!lowerQuery.empty()) {
            std::string typeLower = c.type;
            std::string deptLower = c.department;
            std::string descLower = c.description;
            std::string resTypeLower = c.requiredResourceType;
            std::transform(typeLower.begin(), typeLower.end(), typeLower.begin(), ::tolower);
            std::transform(deptLower.begin(), deptLower.end(), deptLower.begin(), ::tolower);
            std::transform(descLower.begin(), descLower.end(), descLower.begin(), ::tolower);
            std::transform(resTypeLower.begin(), resTypeLower.end(), resTypeLower.begin(), ::tolower);

            bool matchesQuery = (typeLower.find(lowerQuery) != std::string::npos ||
                                 deptLower.find(lowerQuery) != std::string::npos ||
                                 descLower.find(lowerQuery) != std::string::npos ||
                                 resTypeLower.find(lowerQuery) != std::string::npos ||
                                 c.id.find(query) != std::string::npos);
            if (!matchesQuery) continue;
        }

        results.push_back(c);
    }
    return results;
}

Crisis CrisisManager::getCrisisById(const std::string& id) {
    for (const auto& c : crises) {
        if (c.id == id) return c;
    }
    return Crisis();
}

bool CrisisManager::addCrisis(const Crisis& c) {
    for (const auto& item : crises) {
        if (item.id == c.id) return false;
    }
    crises.push_back(c);
    saveCrises();
    return true;
}

bool CrisisManager::updateCrisis(const Crisis& c) {
    for (auto& item : crises) {
        if (item.id == c.id) {
            item = c;
            saveCrises();
            return true;
        }
    }
    return false;
}

bool CrisisManager::updateCrisisStatus(const std::string& id, const std::string& status) {
    for (auto& item : crises) {
        if (item.id == id) {
            item.status = status;
            saveCrises();
            return true;
        }
    }
    return false;
}

bool CrisisManager::deleteCrisis(const std::string& id) {
    auto it = std::remove_if(crises.begin(), crises.end(), [&](const Crisis& c) {
        return c.id == id;
    });
    if (it != crises.end()) {
        crises.erase(it, crises.end());
        saveCrises();
        return true;
    }
    return false;
}

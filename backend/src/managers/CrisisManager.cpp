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

void CrisisManager::saveCrises() {
    json j = json::array();
    for (const auto& c : crises) {
        j.push_back(c.to_json());
    }
    try {
        std::filesystem::path p(filepath);
        if (p.has_parent_path()) std::filesystem::create_directories(p.parent_path());
    } catch (const std::exception& e) {
        std::cerr << "Failed to create data directory for crises: " << e.what() << "\n";
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

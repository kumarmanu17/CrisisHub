#include "ResourceManager.h"
#include <algorithm>
#include <filesystem>
#include <fstream>
#include <iostream>

ResourceManager::ResourceManager(const std::string& dataPath) : filepath(dataPath) {
    loadResources();
}

void ResourceManager::loadResources() {
    std::ifstream file(filepath);
    if (!file.is_open()) {
        seedResources();
        return;
    }

    try {
        json j;
        file >> j;
        resources.clear();
        for (const auto& item : j) {
            resources.push_back(Resource::from_json(item));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error loading resources: " << e.what() << "\n";
        seedResources();
    }
}

void ResourceManager::saveResources() {
    json j = json::array();
    for (const auto& r : resources) {
        j.push_back(r.to_json());
    }

    try {
        std::filesystem::path p(filepath);
        if (p.has_parent_path()) {
            std::filesystem::create_directories(p.parent_path());
        }
    } catch (const std::exception& e) {
        std::cerr << "Failed to create data directory for resources: " << e.what() << "\n";
    }

    std::ofstream file(filepath);
    if (file.is_open()) {
        file << j.dump(4);
    } else {
        std::cerr << "Failed to open resources file for writing: " << filepath << "\n";
    }
}

void ResourceManager::seedResources() {
    resources.clear();

    Resource r1;
    r1.id = "R-2001";
    r1.name = "Cybersecurity Expert";
    r1.type = "IT Staff";
    r1.capacity = 5;
    r1.available = true;
    r1.department = "Security";
    r1.cost = 150.0;

    Resource r2;
    r2.id = "R-2002";
    r2.name = "WiFi";
    r2.type = "Equipment";
    r2.capacity = 3;
    r2.available = true;
    r2.department = "IT";
    r2.cost = 10.0;

    Resource r3;
    r3.id = "R-2003";
    r3.name = "Full Stack Developer";
    r3.type = "IT Staff";
    r3.capacity = 8;
    r3.available = true;
    r3.department = "IT";
    r3.cost = 120.0;

    Resource r4;
    r4.id = "R-2004";
    r4.name = "i7 Lenovo Laptops";
    r4.type = "Equipment";
    r4.capacity = 10;
    r4.available = true;
    r4.department = "Facilities";
    r4.cost = 50.0;

    Resource r5;
    r5.id = "R-2005";
    r5.name = "Peons";
    r5.type = "Regular Employees";
    r5.capacity = 4;
    r5.available = true;
    r5.department = "Operations";
    r5.cost = 15.0;

    resources.push_back(r1);
    resources.push_back(r2);
    resources.push_back(r3);
    resources.push_back(r4);
    resources.push_back(r5);

    saveResources();
}

std::vector<Resource> ResourceManager::getAllResources() {
    return resources;
}

Resource ResourceManager::getResourceById(const std::string& id) {
    for (const auto& r : resources) {
        if (r.id == id) return r;
    }
    return Resource();
}

std::vector<std::string> ResourceManager::getResourceIdsByType(const std::string& type) {
    std::vector<std::string> ids;
    for (const auto& r : resources) {
        if (r.type == type || r.name == type) {
            ids.push_back(r.id);
        }
    }
    return ids;
}

int ResourceManager::getAvailableUnitsByType(const std::string& type) {
    int total = 0;
    for (const auto& r : resources) {
        if ((r.type == type || r.name == type) && r.capacity > 0) {
            total += r.capacity;
        }
    }
    return total;
}

bool ResourceManager::reserveUnits(const std::string& type, int units, std::vector<ResourceAllocation>& allocations, std::string& errorMessage) {
    allocations.clear();

    if (units <= 0) {
        errorMessage = "Unit requirement must be greater than zero.";
        return false;
    }

    if (getAvailableUnitsByType(type) < units) {
        errorMessage = "Insufficient units in resource registry.";
        return false;
    }

    std::vector<size_t> matches;
    for (size_t i = 0; i < resources.size(); ++i) {
        if ((resources[i].type == type || resources[i].name == type) && resources[i].capacity > 0) {
            matches.push_back(i);
        }
    }

    std::sort(matches.begin(), matches.end(), [&](size_t lhs, size_t rhs) {
        if (resources[lhs].cost != resources[rhs].cost) {
            return resources[lhs].cost < resources[rhs].cost;
        }
        return resources[lhs].id < resources[rhs].id;
    });

    int remaining = units;
    for (size_t index : matches) {
        if (remaining <= 0) break;

        Resource& resource = resources[index];
        int reserved = std::min(remaining, resource.capacity);
        if (reserved <= 0) continue;

        resource.capacity -= reserved;
        resource.available = resource.capacity > 0;
        allocations.push_back(ResourceAllocation{resource.id, reserved});
        remaining -= reserved;
    }

    if (remaining > 0) {
        errorMessage = "Insufficient units in resource registry.";
        return false;
    }

    saveResources();
    return true;
}

bool ResourceManager::releaseUnits(const std::vector<ResourceAllocation>& allocations) {
    if (allocations.empty()) {
        return false;
    }

    bool updated = false;
    for (const auto& allocation : allocations) {
        for (auto& resource : resources) {
            if (resource.id == allocation.resourceId) {
                resource.capacity += allocation.units;
                resource.available = resource.capacity > 0;
                updated = true;
                break;
            }
        }
    }

    if (updated) {
        saveResources();
    }
    return updated;
}

bool ResourceManager::adjustCapacity(const std::string& id, int delta) {
    for (auto& r : resources) {
        if (r.id == id) {
            r.capacity += delta;
            if (r.capacity < 0) {
                r.capacity = 0;
            }
            r.available = r.capacity > 0;
            saveResources();
            return true;
        }
    }
    return false;
}

bool ResourceManager::addResource(const Resource& r) {
    for (const auto& item : resources) {
        if (item.id == r.id) return false;
    }
    resources.push_back(r);
    saveResources();
    return true;
}

bool ResourceManager::updateResource(const Resource& r) {
    for (auto& item : resources) {
        if (item.id == r.id) {
            item = r;
            saveResources();
            return true;
        }
    }
    return false;
}

bool ResourceManager::deleteResource(const std::string& id) {
    auto it = std::remove_if(resources.begin(), resources.end(), [&](const Resource& r) {
        return r.id == id;
    });
    if (it != resources.end()) {
        resources.erase(it, resources.end());
        saveResources();
        return true;
    }
    return false;
}

bool ResourceManager::setAvailability(const std::string& id, bool available) {
    for (auto& r : resources) {
        if (r.id == id) {
            r.available = available;
            saveResources();
            return true;
        }
    }
    return false;
}

std::vector<Resource> ResourceManager::searchResources(const std::string& query) {
    if (query.empty()) return resources;
    std::vector<Resource> results;
    std::string lowerQuery = query;
    std::transform(lowerQuery.begin(), lowerQuery.end(), lowerQuery.begin(), ::tolower);

    for (const auto& r : resources) {
        std::string nameLower = r.name;
        std::string typeLower = r.type;
        std::string deptLower = r.department;
        std::transform(nameLower.begin(), nameLower.end(), nameLower.begin(), ::tolower);
        std::transform(typeLower.begin(), typeLower.end(), typeLower.begin(), ::tolower);
        std::transform(deptLower.begin(), deptLower.end(), deptLower.begin(), ::tolower);

        if (nameLower.find(lowerQuery) != std::string::npos ||
            typeLower.find(lowerQuery) != std::string::npos ||
            deptLower.find(lowerQuery) != std::string::npos ||
            r.id.find(query) != std::string::npos) {
            results.push_back(r);
        }
    }
    return results;
}

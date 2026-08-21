#pragma once
#include <string>
#include <vector>
#include "../models/Resource.h"
#include "../models/ResourceAllocation.h"

class ResourceManager {
private:
    std::string filepath;
    std::vector<Resource> resources;
    void loadResources();
    void saveResources();
    void seedResources();

public:
    ResourceManager(const std::string& dataPath);
    std::vector<Resource> getAllResources();
    Resource getResourceById(const std::string& id);
    std::vector<std::string> getResourceIdsByType(const std::string& type);
    int getAvailableUnitsByType(const std::string& type);
    bool reserveUnits(const std::string& type, int units, std::vector<ResourceAllocation>& allocations, std::string& errorMessage);
    bool releaseUnits(const std::vector<ResourceAllocation>& allocations);
    bool adjustCapacity(const std::string& id, int delta);
    bool addResource(const Resource& r);
    bool updateResource(const Resource& r);
    bool deleteResource(const std::string& id);
    bool setAvailability(const std::string& id, bool available);
    std::vector<Resource> searchResources(const std::string& query);
};

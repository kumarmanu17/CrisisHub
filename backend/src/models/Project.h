#pragma once

#include <string>
#include <vector>
#include "ResourceAllocation.h"

using json = nlohmann::json;

struct Project {
    std::string id;
    std::string name;
    std::string department;
    std::string resourceType;
    int requiredUnits = 0;
    std::string description;
    std::string status;
    std::string timestamp;
    std::vector<ResourceAllocation> allocatedResources;

    json to_json() const {
        json allocations = json::array();
        for (const auto& allocation : allocatedResources) {
            allocations.push_back(allocation.to_json());
        }

        return json{
            {"id", id},
            {"name", name},
            {"department", department},
            {"resourceType", resourceType},
            {"requiredUnits", requiredUnits},
            {"description", description},
            {"status", status},
            {"timestamp", timestamp},
            {"allocatedResources", allocations}
        };
    }

    static Project from_json(const json& j) {
        Project project;
        project.id = j.at("id").get<std::string>();
        project.name = j.value("name", "");
        project.department = j.value("department", "");
        project.resourceType = j.value("resourceType", "");
        project.requiredUnits = j.value("requiredUnits", 0);
        project.description = j.value("description", "");
        project.status = j.value("status", "Pending");
        project.timestamp = j.value("timestamp", "");

        if (j.contains("allocatedResources") && j["allocatedResources"].is_array()) {
            for (const auto& item : j["allocatedResources"]) {
                project.allocatedResources.push_back(ResourceAllocation::from_json(item));
            }
        }

        return project;
    }
};
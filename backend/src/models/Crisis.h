#pragma once
#include <string>
#include <vector>
#include "ResourceAllocation.h"
#include "../../include/json.hpp"

using json = nlohmann::json;

struct Crisis {
    std::string id;
    std::string type;         // "IT Outage", "Cybersecurity Incident", "Employee Shortage", "Infrastructure Failure", "Operational Disruption", "Emergency Business Situation"
    std::string department;   // "IT", "Security", "HR", "Operations", "Finance", "Legal"
    int severity;             // 4 = Critical, 3 = High, 2 = Medium, 1 = Low
    std::string description;
    std::vector<std::string> requiredResources; // legacy multi-resource support
    std::string requiredResourceType;
    int requiredUnits = 1;
    std::string status;       // "Pending", "Allocated", "Resolved"
    std::string timestamp;    // ISO timestamp
    std::vector<std::string> allocatedResourceIds;
    std::vector<ResourceAllocation> allocatedResources;

    json to_json() const {
        json allocations = json::array();
        for (const auto& allocation : allocatedResources) {
            allocations.push_back(allocation.to_json());
        }

        std::vector<std::string> legacyResources = requiredResources;
        if (legacyResources.empty() && !requiredResourceType.empty()) {
            legacyResources.push_back(requiredResourceType);
        }

        std::vector<std::string> legacyAllocationIds = allocatedResourceIds;
        if (legacyAllocationIds.empty()) {
            for (const auto& allocation : allocatedResources) {
                legacyAllocationIds.push_back(allocation.resourceId);
            }
        }

        return json{
            {"id", id},
            {"type", type},
            {"department", department},
            {"severity", severity},
            {"description", description},
            {"requiredResources", legacyResources},
            {"requiredResourceType", requiredResourceType},
            {"requiredUnits", requiredUnits},
            {"status", status},
            {"timestamp", timestamp},
            {"allocatedResourceIds", legacyAllocationIds},
            {"allocatedResources", allocations}
        };
    }

    static Crisis from_json(const json& j) {
        Crisis c;
        c.id = j.value("id", "");
        c.type = j.value("type", "");
        c.department = j.value("department", "");
        c.severity = j.value("severity", 1);
        c.description = j.value("description", "");
        if (j.contains("requiredResources") && j["requiredResources"].is_array()) {
            c.requiredResources = j["requiredResources"].get<std::vector<std::string>>();
        }
        c.requiredResourceType = j.value("requiredResourceType", c.requiredResources.empty() ? std::string() : c.requiredResources.front());
        c.requiredUnits = j.value("requiredUnits", 1);
        c.status = j.value("status", "Pending");
        c.timestamp = j.value("timestamp", "");
        if (j.contains("allocatedResourceIds") && j["allocatedResourceIds"].is_array()) {
            c.allocatedResourceIds = j["allocatedResourceIds"].get<std::vector<std::string>>();
        }
        if (j.contains("allocatedResources") && j["allocatedResources"].is_array()) {
            for (const auto& item : j["allocatedResources"]) {
                c.allocatedResources.push_back(ResourceAllocation::from_json(item));
            }
        } else if (!c.allocatedResourceIds.empty()) {
            for (const auto& resourceId : c.allocatedResourceIds) {
                c.allocatedResources.push_back(ResourceAllocation{resourceId, 1});
            }
        }
        return c;
    }
};

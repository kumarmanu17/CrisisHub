#pragma once
#include <string>
#include <vector>
#include "../../include/json.hpp"

using json = nlohmann::json;

struct Allocation {
    std::string id;
    std::string crisisId;
    std::string crisisTitle;
    std::vector<std::string> resourceIds;
    std::string timestamp;
    double totalCost;

    json to_json() const {
        return json{
            {"id", id},
            {"crisisId", crisisId},
            {"crisisTitle", crisisTitle},
            {"resourceIds", resourceIds},
            {"timestamp", timestamp},
            {"totalCost", totalCost}
        };
    }

    static Allocation from_json(const json& j) {
        Allocation a;
        a.id = j.value("id", "");
        a.crisisId = j.value("crisisId", "");
        a.crisisTitle = j.value("crisisTitle", "");
        if (j.contains("resourceIds") && j["resourceIds"].is_array()) {
            a.resourceIds = j["resourceIds"].get<std::vector<std::string>>();
        }
        a.timestamp = j.value("timestamp", "");
        a.totalCost = j.value("totalCost", 0.0);
        return a;
    }
};

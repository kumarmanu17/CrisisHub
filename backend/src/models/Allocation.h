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
        a.id = j.at("id").get<std::string>();
        a.crisisId = j.at("crisisId").get<std::string>();
        a.crisisTitle = j.at("crisisTitle").get<std::string>();
        a.resourceIds = j.at("resourceIds").get<std::vector<std::string>>();
        a.timestamp = j.at("timestamp").get<std::string>();
        a.totalCost = j.at("totalCost").get<double>();
        return a;
    }
};

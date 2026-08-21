#pragma once

#include <string>
#include "../../include/json.hpp"

using json = nlohmann::json;

struct ResourceAllocation {
    std::string resourceId;
    int units = 0;

    json to_json() const {
        return json{{"resourceId", resourceId}, {"units", units}};
    }

    static ResourceAllocation from_json(const json& j) {
        ResourceAllocation allocation;
        allocation.resourceId = j.at("resourceId").get<std::string>();
        allocation.units = j.value("units", 1);
        return allocation;
    }
};
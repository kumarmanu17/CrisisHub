#pragma once
#include <string>
#include "../../include/json.hpp"

using json = nlohmann::json;

struct Resource {
    std::string id;
    std::string name;
    std::string type;       // "IT Staff", "Security Teams", "Backup Systems", "Equipment", "Emergency Funds", "Infrastructure Resources"
    int capacity;           // numerical limit or amount
    bool available;
    std::string department; // Owner department
    double cost;            // Cost metric (e.g. hourly rate or mobilization cost)

    json to_json() const {
        return json{
            {"id", id},
            {"name", name},
            {"type", type},
            {"capacity", capacity},
            {"available", available},
            {"department", department},
            {"cost", cost}
        };
    }

    static Resource from_json(const json& j) {
        Resource r;
        r.id = j.at("id").get<std::string>();
        r.name = j.at("name").get<std::string>();
        r.type = j.at("type").get<std::string>();
        r.capacity = j.at("capacity").get<int>();
        r.available = j.value("available", r.capacity > 0);
        r.department = j.at("department").get<std::string>();
        r.cost = j.at("cost").get<double>();
        return r;
    }
};

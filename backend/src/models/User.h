#pragma once
#include <string>
#include "../../include/json.hpp"

using json = nlohmann::json;

struct User {
    std::string username;
    std::string password;
    std::string role; // "admin" or "employee"
    std::string name;
    std::string department;

    json to_json() const {
        return json{
            {"username", username},
            {"role", role},
            {"name", name},
            {"department", department}
        };
    }

    static User from_json(const json& j) {
        User u;
        u.username = j.at("username").get<std::string>();
        if (j.contains("password")) {
            u.password = j.at("password").get<std::string>();
        }
        u.role = j.at("role").get<std::string>();
        u.name = j.at("name").get<std::string>();
        u.department = j.at("department").get<std::string>();
        return u;
    }
};

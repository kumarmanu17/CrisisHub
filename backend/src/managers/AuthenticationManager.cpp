#include "AuthenticationManager.h"
#include <fstream>
#include <iostream>

AuthenticationManager::AuthenticationManager(const std::string& dataPath) : filepath(dataPath) {
    loadUsers();
}

void AuthenticationManager::loadUsers() {
    std::ifstream file(filepath);
    if (!file.is_open()) {
        seedUsers();
        return;
    }
    try {
        json j;
        file >> j;
        users.clear();
        for (const auto& item : j) {
            users.push_back(User::from_json(item));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error loading users: " << e.what() << "\n";
        seedUsers();
    }
}

void AuthenticationManager::seedUsers() {
    users.clear();
    
    User admin;
    admin.username = "admin";
    admin.password = "admin123";
    admin.role = "admin";
    admin.name = "System Administrator";
    admin.department = "IT Operations";

    User emp;
    emp.username = "employee";
    emp.password = "emp123";
    emp.role = "employee";
    emp.name = "John Doe";
    emp.department = "Customer Support";

    users.push_back(admin);
    users.push_back(emp);

    json j = json::array();
    for (const auto& u : users) {
        json uj = u.to_json();
        uj["password"] = u.password;
        j.push_back(uj);
    }

    std::ofstream file(filepath);
    if (file.is_open()) {
        file << j.dump(4);
    }
}

bool AuthenticationManager::authenticate(const std::string& username, const std::string& password, User& outUser) {
    for (const auto& u : users) {
        if (u.username == username && u.password == password) {
            outUser = u;
            return true;
        }
    }
    return false;
}

std::vector<User> AuthenticationManager::getAllUsers() const {
    return users;
}

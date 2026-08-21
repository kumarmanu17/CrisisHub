#pragma once
#include <string>
#include <vector>
#include "../models/User.h"

class AuthenticationManager {
private:
    std::string filepath;
    std::vector<User> users;
    void loadUsers();
    void seedUsers();

public:
    AuthenticationManager(const std::string& dataPath);
    bool authenticate(const std::string& username, const std::string& password, User& outUser);
    std::vector<User> getAllUsers() const;
};

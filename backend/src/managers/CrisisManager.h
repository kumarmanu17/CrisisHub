#pragma once
#include <string>
#include <vector>
#include "../models/Crisis.h"

class CrisisManager {
private:
    std::string filepath;
    std::vector<Crisis> crises;
    void loadCrises();
    void saveCrises();
    void seedCrises();

public:
    CrisisManager(const std::string& dataPath);
    std::vector<Crisis> getAllCrises();
    Crisis getCrisisById(const std::string& id);
    bool addCrisis(const Crisis& c);
    bool updateCrisis(const Crisis& c);
    bool updateCrisisStatus(const std::string& id, const std::string& status);
    bool deleteCrisis(const std::string& id);
};

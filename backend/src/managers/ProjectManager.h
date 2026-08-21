#pragma once

#include <string>
#include <vector>
#include "../models/Project.h"

class ProjectManager {
private:
    std::string filepath;
    std::vector<Project> projects;
    void loadProjects();
    void saveProjects();
    void seedProjects();

public:
    ProjectManager(const std::string& dataPath);
    std::vector<Project> getAllProjects();
    Project getProjectById(const std::string& id);
    bool addProject(const Project& project);
    bool updateProject(const Project& project);
    bool updateProjectStatus(const std::string& id, const std::string& status);
    bool deleteProject(const std::string& id);
};
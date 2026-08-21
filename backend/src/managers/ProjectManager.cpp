#include "ProjectManager.h"
#include <fstream>
#include <iostream>
#include <algorithm>
#include <filesystem>

ProjectManager::ProjectManager(const std::string& dataPath) : filepath(dataPath) {
    loadProjects();
}

void ProjectManager::loadProjects() {
    std::ifstream file(filepath);
    if (!file.is_open()) {
        seedProjects();
        return;
    }

    try {
        json j;
        file >> j;
        projects.clear();
        for (const auto& item : j) {
            projects.push_back(Project::from_json(item));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error loading projects: " << e.what() << "\n";
        seedProjects();
    }
}

#ifdef _WIN32
#include <direct.h>
#else
#include <sys/stat.h>
#endif

void ProjectManager::saveProjects() {
    json j = json::array();
    for (const auto& project : projects) {
        j.push_back(project.to_json());
    }

    size_t pos = filepath.find_last_of("/\\");
    if (pos != std::string::npos) {
        std::string dir = filepath.substr(0, pos);
#ifdef _WIN32
        _mkdir(dir.c_str());
#else
        mkdir(dir.c_str(), 0755);
#endif
    }

    std::ofstream file(filepath);
    if (file.is_open()) {
        file << j.dump(4);
    }
}

void ProjectManager::seedProjects() {
    projects.clear();
    saveProjects();
}

std::vector<Project> ProjectManager::getAllProjects() {
    return projects;
}

std::vector<Project> ProjectManager::searchAndFilterProjects(const std::string& status, const std::string& department, const std::string& resourceType, const std::string& query) {
    std::vector<Project> results;
    std::string lowerQuery = query;
    std::transform(lowerQuery.begin(), lowerQuery.end(), lowerQuery.begin(), ::tolower);

    for (const auto& project : projects) {
        if (!status.empty() && status != "All" && project.status != status) continue;
        if (!department.empty() && department != "All" && project.department != department) continue;
        if (!resourceType.empty() && resourceType != "All" && project.resourceType != resourceType) continue;

        if (!lowerQuery.empty()) {
            std::string nameLower = project.name;
            std::string deptLower = project.department;
            std::string resTypeLower = project.resourceType;
            std::string descLower = project.description;
            std::transform(nameLower.begin(), nameLower.end(), nameLower.begin(), ::tolower);
            std::transform(deptLower.begin(), deptLower.end(), deptLower.begin(), ::tolower);
            std::transform(resTypeLower.begin(), resTypeLower.end(), resTypeLower.begin(), ::tolower);
            std::transform(descLower.begin(), descLower.end(), descLower.begin(), ::tolower);

            bool matchesQuery = (nameLower.find(lowerQuery) != std::string::npos ||
                                 deptLower.find(lowerQuery) != std::string::npos ||
                                 resTypeLower.find(lowerQuery) != std::string::npos ||
                                 descLower.find(lowerQuery) != std::string::npos ||
                                 project.id.find(query) != std::string::npos);
            if (!matchesQuery) continue;
        }

        results.push_back(project);
    }
    return results;
}

Project ProjectManager::getProjectById(const std::string& id) {
    for (const auto& project : projects) {
        if (project.id == id) return project;
    }
    return Project();
}

bool ProjectManager::addProject(const Project& project) {
    for (const auto& item : projects) {
        if (item.id == project.id) return false;
    }
    projects.push_back(project);
    saveProjects();
    return true;
}

bool ProjectManager::updateProject(const Project& project) {
    for (auto& item : projects) {
        if (item.id == project.id) {
            item = project;
            saveProjects();
            return true;
        }
    }
    return false;
}

bool ProjectManager::updateProjectStatus(const std::string& id, const std::string& status) {
    for (auto& item : projects) {
        if (item.id == id) {
            item.status = status;
            saveProjects();
            return true;
        }
    }
    return false;
}

bool ProjectManager::deleteProject(const std::string& id) {
    auto it = std::remove_if(projects.begin(), projects.end(), [&](const Project& project) {
        return project.id == id;
    });
    if (it != projects.end()) {
        projects.erase(it, projects.end());
        saveProjects();
        return true;
    }
    return false;
}
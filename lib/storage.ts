// Simple localStorage wrapper for managing video projects
// In a real app, this would be a database

import { VideoProject } from "./types";

const STORAGE_KEY = "mux_ai_projects";

export function saveProject(project: VideoProject): void {
  const projects = getProjects();
  const existingIndex = projects.findIndex((p) => p.id === project.id);

  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.push(project);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getProject(id: string): VideoProject | null {
  const projects = getProjects();
  return projects.find((p) => p.id === id) || null;
}

export function getProjects(): VideoProject[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function deleteProject(id: string): void {
  const projects = getProjects();
  const filtered = projects.filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function updateProjectStatus(
  id: string,
  status: VideoProject["status"]
): void {
  const project = getProject(id);
  if (project) {
    project.status = status;
    saveProject(project);
  }
}

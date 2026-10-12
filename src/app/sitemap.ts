import type { MetadataRoute } from "next";
import { baseURL } from "@/resources";
import { getProjects } from "@/utils/projects";

export default function sitemap(): MetadataRoute.Sitemap {
  const today = new Date().toISOString().split("T")[0];

  const pages = ["", "/work", "/gallery"].map((route) => ({
    url: `${baseURL}${route}`,
    lastModified: today,
  }));

  const projects = getProjects().map((project) => ({
    url: `${baseURL}/work/${project.slug}`,
    lastModified: project.publishedAt,
  }));

  return [...pages, ...projects];
}

import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type Project = {
  slug: string;
  title: string;
  publishedAt: string;
  /** Short display date, e.g. "Jun 2026". */
  date: string;
  summary: string;
  kind: string;
  stack: string[];
  /** Card image on the homepage; projects without one render text-only. */
  cover?: string;
  coverFit: "cover" | "contain";
  coverRatio: string;
  /** Screenshots shown on the case-study page. */
  images: string[];
  link?: string;
  linkLabel: string;
  content: string;
};

const PROJECTS_DIR = path.join(process.cwd(), "src", "app", "work", "projects");

function formatMonthYear(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function readProject(file: string): Project {
  const { data, content } = matter(fs.readFileSync(path.join(PROJECTS_DIR, file), "utf-8"));
  return {
    slug: path.basename(file, ".mdx"),
    title: data.title ?? "",
    publishedAt: data.publishedAt ?? "",
    date: data.publishedAt ? formatMonthYear(data.publishedAt) : "",
    summary: data.summary ?? "",
    kind: data.kind ?? "",
    stack: data.stack ?? [],
    cover: data.cover || undefined,
    coverFit: data.coverFit === "contain" ? "contain" : "cover",
    coverRatio: data.coverRatio ?? "16/10",
    images: data.images ?? [],
    link: data.link || undefined,
    linkLabel: data.linkLabel ?? "View project",
    content,
  };
}

/** All projects, newest first. */
export function getProjects(): Project[] {
  return fs
    .readdirSync(PROJECTS_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map(readProject)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getProject(slug: string): Project | undefined {
  return getProjects().find((project) => project.slug === slug);
}

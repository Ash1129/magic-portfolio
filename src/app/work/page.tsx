import type { Metadata } from "next";
import { ProjectCard } from "@/components/ProjectCard";
import { person } from "@/resources";
import { getProjects } from "@/utils/projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "Every AI, automation and product project Ashwin Prajeeth has built.",
  openGraph: { images: [`/api/og/generate?title=${encodeURIComponent("Projects")}`] },
};

export default function Work() {
  const projects = getProjects();

  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head">
          <div className="section-head__title">
            <div className="kicker">All projects</div>
            <h1 className="display">Things I've built</h1>
          </div>
          <a href={person.github} className="btn btn--primary" target="_blank" rel="noopener noreferrer">
            All projects on GitHub
          </a>
        </div>
        <div className="project-grid">
          {projects.map((project, i) => (
            <ProjectCard key={project.slug} project={project} priority={i < 2} />
          ))}
        </div>
      </div>
    </section>
  );
}

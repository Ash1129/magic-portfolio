import Link from "next/link";
import type { Project } from "@/utils/projects";
import { PlateImage } from "./PlateImage";

export function ProjectCard({ project, priority }: { project: Project; priority?: boolean }) {
  const href = `/work/${project.slug}`;

  return (
    <article className="project-card">
      {project.cover && (
        // Duplicate of the title link, so it stays out of the tab order and accessibility tree.
        <Link href={href} aria-hidden="true" tabIndex={-1}>
          <PlateImage
            src={project.cover}
            alt={`${project.title} screenshot`}
            ratio={project.coverRatio}
            fit={project.coverFit}
            sizes="(max-width: 1100px) 100vw, 600px"
            priority={priority}
          />
        </Link>
      )}
      <div className="project-card__meta">
        <span>{project.kind}</span>
        <span className="project-card__date">{project.date}</span>
      </div>
      <h3 className="project-card__title">
        <Link href={href}>{project.title}</Link>
      </h3>
      <p className="project-card__text justify">{project.summary}</p>
      <ul className="tags">
        {project.stack.map((tech) => (
          <li key={tech} className="tag">
            {tech}
          </li>
        ))}
      </ul>
      <div className="project-card__links">
        <Link href={href} className="text-link">
          Read the case study →
        </Link>
        {project.link && (
          <a href={project.link} className="text-link" target="_blank" rel="noopener noreferrer">
            {project.linkLabel} →
          </a>
        )}
      </div>
    </article>
  );
}

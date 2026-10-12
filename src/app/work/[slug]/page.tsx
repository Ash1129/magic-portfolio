import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomMDX } from "@/components/mdx";
import { PlateImage } from "@/components/PlateImage";
import { getProject, getProjects } from "@/utils/projects";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getProjects().map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = getProject((await params).slug);
  if (!project) return {};

  const image = `/api/og/generate?title=${encodeURIComponent(project.title)}`;
  return {
    title: project.title,
    description: project.summary,
    openGraph: { type: "article", title: project.title, description: project.summary, images: [image] },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const others = getProjects().filter((other) => other.slug !== slug);

  return (
    <article>
      <header className="case-head">
        <Link href="/work" className="back-link">
          ← All projects
        </Link>
        <div className="project-card__meta">
          <span>{project.kind}</span>
          <span className="project-card__date">{project.date}</span>
        </div>
        <h1 className="case-title">{project.title}</h1>
        <p className="case-summary justify">{project.summary}</p>
        <ul className="tags">
          {project.stack.map((tech) => (
            <li key={tech} className="tag">
              {tech}
            </li>
          ))}
        </ul>
        {project.link && (
          <div className="actions">
            <a
              href={project.link}
              className="btn btn--primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              {project.linkLabel} →
            </a>
          </div>
        )}
      </header>

      {project.images.length > 0 && (
        <section className="case-gallery" aria-label="Screenshots">
          {project.images.map((src, i) => (
            <a key={src} href={src} target="_blank" rel="noopener noreferrer">
              <PlateImage
                src={src}
                alt={`${project.title} screenshot ${i + 1}`}
                fit="contain"
                sizes={i === 0 ? "(max-width: 1120px) 100vw, 1000px" : "(max-width: 900px) 100vw, 500px"}
                priority={i === 0}
              />
            </a>
          ))}
        </section>
      )}

      <div className="case-body">
        <div className="prose">
          <CustomMDX source={project.content} />
        </div>
      </div>

      <section className="section">
        <div className="wrap">
          <div className="kicker">More projects</div>
          <ul className="more-list">
            {others.map((other) => (
              <li key={other.slug} className="more-item">
                <span className="kicker">{other.kind}</span>
                <Link href={`/work/${other.slug}`}>{other.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </article>
  );
}

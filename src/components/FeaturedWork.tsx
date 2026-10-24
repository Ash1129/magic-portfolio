import Link from "next/link";
import { featured } from "@/resources";
import { getProject } from "@/utils/projects";
import { PlateImage } from "./PlateImage";

/** Featured work: an intro column beside one large project tile and two smaller ones. */
export function FeaturedWork() {
  const tiles = featured.projects.flatMap(({ slug, image }) => {
    const project = getProject(slug);
    const src = image ?? project?.cover;
    return project && src ? [{ project, src }] : [];
  });
  const [lead, ...rest] = tiles;

  return (
    <section id="featured" className="section">
      <div className="wrap">
        <div className="split">
          <div className="featured__intro">
            <h2 className="display">Featured projects</h2>
            <p className="featured__blurb">{featured.blurb}</p>
            <Link href="/work" className="btn-solid">
              See all projects
            </Link>
          </div>
          <div className="featured">
            {lead && (
              <Link href={`/work/${lead.project.slug}`} className="feature-tile">
                <PlateImage
                  src={lead.src}
                  alt={`${lead.project.title} screenshot`}
                  ratio={lead.project.coverRatio}
                  fit={lead.project.coverFit}
                  sizes="(max-width: 900px) 100vw, 800px"
                />
                <span className="kicker">{lead.project.kind}</span>
                <span className="feature-tile__title">{lead.project.title}</span>
              </Link>
            )}
            <div className="featured__row">
              {rest.map(({ project, src }) => (
                <Link key={project.slug} href={`/work/${project.slug}`} className="feature-tile">
                  <PlateImage
                    src={src}
                    alt={`${project.title} screenshot`}
                    ratio="16/10"
                    fit={project.coverFit}
                    sizes="(max-width: 720px) 100vw, 400px"
                  />
                  <span className="kicker">{project.kind}</span>
                  <span className="feature-tile__title">{project.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

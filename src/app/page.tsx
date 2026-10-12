import Image from "next/image";
import Link from "next/link";
import { PlateImage } from "@/components/PlateImage";
import { ProjectCard } from "@/components/ProjectCard";
import { contact, hero, howIWork, person, photography, steps, work } from "@/resources";
import { getProjects } from "@/utils/projects";

const pad = (n: number) => String(n).padStart(2, "0");

export default function Home() {
  const projects = getProjects();

  return (
    <>
      <section id="top" className="hero">
        <div className="hero__text">
          <div className="kicker">{hero.kicker}</div>
          <h1 className="hero__title">
            Hi, I'm <em>{person.firstName}</em>
          </h1>
          <div className="rule" />
          <p className="hero__bio justify">{hero.bio}</p>
          <div className="actions">
            <a href="#work" className="btn btn--primary">
              See my work
            </a>
            <a href={`mailto:${person.email}`} className="btn">
              {person.email}
            </a>
          </div>
        </div>
        <figure className="hero__figure">
          <Image
            src={hero.photo.src}
            width={hero.photo.width}
            height={hero.photo.height}
            alt={person.name}
            className="hero__photo"
            sizes="(max-width: 900px) 100vw, 560px"
            priority
          />
          <figcaption className="caption">{hero.caption}</figcaption>
        </figure>
      </section>

      <section id="work" className="section">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__title">
              <div className="kicker">Featured work</div>
              <h2 className="display">Selected projects</h2>
            </div>
            <p className="section-head__aside">
              Work across consulting, product and early-stage ventures in India and the United
              States.
            </p>
          </div>
          <ol className="work-list">
            {work.map((item, i) => (
              <li key={item.title} className="work-item">
                <div className="work-item__meta">
                  <span className="numeral work-item__n">{pad(i + 1)}</span>
                  <span className="work-item__org">{item.org}</span>
                  <span className="work-item__when">{item.when}</span>
                </div>
                <div className="work-item__body">
                  <h3 className="work-item__title">{item.title}</h3>
                  <p className="work-item__text justify">{item.body}</p>
                  <div className="work-item__result">{item.result}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="projects" className="section">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__title">
              <div className="kicker">Projects</div>
              <h2 className="display">Things I've built</h2>
            </div>
            <a
              href={person.github}
              className="btn btn--primary"
              target="_blank"
              rel="noopener noreferrer"
            >
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

      <section className="section">
        <div className="wrap">
          <div className="statement">
            <div className="kicker">How I work</div>
            <div className="statement__body">
              <h2 className="statement__heading">{howIWork.heading}</h2>
              <p className="statement__text justify">{howIWork.body}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="approach" className="section">
        <div className="wrap">
          <h2 className="display">My approach</h2>
          <ol className="steps">
            {steps.map((step, i) => (
              <li key={step.title} className="step">
                <span className="numeral step__n">{pad(i + 1)}</span>
                <h3 className="step__title">{step.title}</h3>
                <p className="step__text justify">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="photography" className="section">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__title">
              <div className="kicker">Outside work</div>
              <h2 className="display">Photography</h2>
            </div>
            <p className="section-head__aside">{photography.intro}</p>
          </div>
          <div className="photo-strip">
            {photography.images.slice(0, 4).map((image) => (
              <Link key={image.src} href="/gallery" aria-hidden="true" tabIndex={-1}>
                <PlateImage
                  src={image.src}
                  alt={image.alt}
                  ratio="3/2"
                  sizes="(max-width: 720px) 100vw, 300px"
                />
              </Link>
            ))}
          </div>
          <div className="actions">
            <Link href="/gallery" className="btn btn--primary">
              View all photographs
            </Link>
            <a href={person.vsco} className="btn" target="_blank" rel="noopener noreferrer">
              More on VSCO ↗
            </a>
          </div>
        </div>
      </section>

      <section id="contact" className="section">
        <div className="wrap">
          <div className="contact-card">
            <div className="contact-card__head">
              <div className="kicker">Contact</div>
              <h2 className="contact-card__title">
                Let's work <em>together</em>
              </h2>
            </div>
            <div className="contact-card__body">
              <p className="justify">{contact.body}</p>
              <div className="actions">
                <a href={`mailto:${person.email}`} className="btn btn--primary">
                  Get in touch
                </a>
                <a href={`tel:${person.phone.replace(/\s/g, "")}`} className="btn">
                  {person.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

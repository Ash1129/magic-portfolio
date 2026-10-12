import { person } from "@/resources";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__inner">
        <span className="site-footer__brand">{person.name}</span>
        <div className="site-footer__links">
          <a href={person.linkedin} target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
          <a href={person.github} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href={`mailto:${person.email}`}>Email</a>
          <a href={person.resume} target="_blank" rel="noopener noreferrer">
            Resume
          </a>
        </div>
        <span>
          © {new Date().getFullYear()} · {person.location}
        </span>
      </div>
    </footer>
  );
}

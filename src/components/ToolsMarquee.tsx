import {
  siAirtable,
  siClaude,
  siFastapi,
  siGithub,
  siGooglecloud,
  siGooglesheets,
  siJira,
  siN8n,
  siNextdotjs,
  siNodedotjs,
  siNotion,
  siPostgresql,
  siPython,
  siQdrant,
  siReact,
  siScikitlearn,
  siSqlite,
  siTailwindcss,
  siVercel,
  type SimpleIcon,
} from "simple-icons";
import { SlowOnHover } from "./SlowOnHover";

// Tools from the resume and the projects. Brands that Simple Icons can't
// include (OpenAI, Microsoft, Kore.ai) render as a text wordmark.
const tools: { name: string; icon?: SimpleIcon }[] = [
  { name: "OpenAI" },
  { name: "Claude", icon: siClaude },
  { name: "Vertex AI", icon: siGooglecloud },
  { name: "Qdrant", icon: siQdrant },
  { name: "Python", icon: siPython },
  { name: "PostgreSQL", icon: siPostgresql },
  { name: "n8n", icon: siN8n },
  { name: "Airtable", icon: siAirtable },
  { name: "Notion", icon: siNotion },
  { name: "Jira", icon: siJira },
  { name: "Excel" },
  { name: "PowerPoint" },
  { name: "React", icon: siReact },
  { name: "Next.js", icon: siNextdotjs },
  { name: "Node.js", icon: siNodedotjs },
  { name: "FastAPI", icon: siFastapi },
  { name: "scikit-learn", icon: siScikitlearn },
  { name: "SQLite", icon: siSqlite },
  { name: "Tailwind CSS", icon: siTailwindcss },
  { name: "Google Sheets", icon: siGooglesheets },
  { name: "Kore.ai" },
  { name: "GitHub", icon: siGithub },
  { name: "Vercel", icon: siVercel },
];

function ToolList({ hidden }: { hidden?: boolean }) {
  return (
    <ul className="marquee__group" aria-hidden={hidden || undefined}>
      {tools.map((tool) => (
        <li key={tool.name} className="tool">
          {tool.icon && (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={tool.icon.path} />
            </svg>
          )}
          {tool.name}
        </li>
      ))}
    </ul>
  );
}

/** A continuously scrolling row of tool logos; the list is doubled so the loop is seamless. */
export function ToolsMarquee() {
  return (
    <section className="tools" aria-label="Tools I've worked with">
      <div className="wrap tools__inner">
        <div className="kicker tools__label">Tools I've worked with</div>
        <SlowOnHover>
          <div className="marquee__track">
            <ToolList />
            <ToolList hidden />
          </div>
        </SlowOnHover>
      </div>
    </section>
  );
}

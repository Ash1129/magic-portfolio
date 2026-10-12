import type { ReactNode } from "react";
import type { Service } from "@/resources";
import { services } from "@/resources";

// Thin line icons, drawn on a 48-unit grid and stroked in the accent color.
const icons: Record<Service["icon"], ReactNode> = {
  venn: (
    <>
      <circle cx="18" cy="19" r="11" />
      <circle cx="30" cy="19" r="11" />
      <circle cx="24" cy="29" r="11" />
    </>
  ),
  network: (
    <>
      <circle cx="24" cy="24" r="5" />
      <circle cx="9" cy="9" r="3.5" />
      <circle cx="39" cy="9" r="3.5" />
      <circle cx="9" cy="39" r="3.5" />
      <circle cx="39" cy="39" r="3.5" />
      <path d="M20.5 20.5 11.5 11.5M27.5 20.5l9-9M20.5 27.5l-9 9M27.5 27.5l9 9" />
    </>
  ),
  chart: (
    <>
      <path d="M6 42h36" />
      <rect x="10" y="30" width="6" height="12" />
      <rect x="21" y="22" width="6" height="20" />
      <rect x="32" y="13" width="6" height="29" />
      <path d="M8 22 19 13l8 4L40 5" />
    </>
  ),
  star: <path d="M24 5c1.6 12.3 6.7 17.4 19 19-12.3 1.6-17.4 6.7-19 19-1.6-12.3-6.7-17.4-19-19 12.3-1.6 17.4-6.7 19-19Z" />,
};

export function Services() {
  return (
    <section id="services" className="section">
      <div className="wrap">
        <div className="split">
          <div className="kicker">What I do</div>
          <ul className="services">
            {services.map((service) => (
              <li key={service.title} className="service">
                <svg
                  className="service__icon"
                  viewBox="0 0 48 48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  aria-hidden="true"
                >
                  {icons[service.icon]}
                </svg>
                <h3 className="service__title">{service.title}</h3>
                <p className="service__text">{service.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

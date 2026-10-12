import type { Metadata } from "next";
import Image from "next/image";
import { person, photography } from "@/resources";

export const metadata: Metadata = {
  title: "Photography",
  description: photography.intro,
  openGraph: { images: [`/api/og/generate?title=${encodeURIComponent("Photography")}`] },
};

export default function Gallery() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head">
          <div className="section-head__title">
            <div className="kicker">Outside work</div>
            <h1 className="display">Photography</h1>
          </div>
          <div className="section-head__aside stack">
            <p>{photography.intro}</p>
            <a href={person.vsco} className="btn btn--primary" target="_blank" rel="noopener noreferrer">
              More on VSCO ↗
            </a>
          </div>
        </div>
        <div className="photo-grid">
          {photography.images.map((image, i) => (
            <figure key={image.src} className="plate">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(max-width: 720px) 100vw, 600px"
                priority={i < 2}
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

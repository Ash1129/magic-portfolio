"use client";

import { Carousel, Column } from "@once-ui-system/core";
import styles from "./experienceCarousel.module.scss";

type ExperienceImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export default function ExperienceCarousel({
  images,
  title,
}: {
  images: ExperienceImage[];
  title: string;
}) {
  if (!images?.length) return null;

  return (
    <Column fillWidth horizontal="center">
      <Column style={{ width: "350px", maxWidth: "100%" }}>
        <Carousel
          sizes="(max-width: 600px) 100vw, 350px"
          items={images.map((img) => ({
            slide: img.src,
            alt: img.alt || title,
          }))}
        />
      </Column>
    </Column>
  );
}


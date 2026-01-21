import { Button, Flex, Meta, Schema } from "@once-ui-system/core";
import GalleryView from "@/components/gallery/GalleryView";
import { baseURL, gallery, person } from "@/resources";

export async function generateMetadata() {
  return Meta.generate({
    title: gallery.title,
    description: gallery.description,
    baseURL: baseURL,
    image: `/api/og/generate?title=${encodeURIComponent(gallery.title)}`,
    path: gallery.path,
  });
}

export default function Gallery() {
  return (
    <Flex maxWidth="l">
      
      <Schema
        as="webPage"
        baseURL={baseURL}
        title={gallery.title}
        description={gallery.description}
        path={gallery.path}
        image={`/api/og/generate?title=${encodeURIComponent(gallery.title)}`}
        author={{
          name: person.name,
          url: `${baseURL}${gallery.path}`,
          image: `${baseURL}${person.avatar}`,
        }}
      />
      <Flex horizontal="start" style={{ marginBottom: "12.5rem" }}>
        <Button
          href="https://vsco.co/ashwinprajeeth/gallery"
          target="_blank"
          rel="noopener noreferrer"
          // variant="solid"
          size="s"
          style={{
            borderRadius: "9999px",
            background: "var(--brand-background)",
            color: "var(--brand-on-background)",
          }}
        >
          View more on my VSCO ↗
        </Button>
      </Flex>
      
      <GalleryView />
    </Flex>
  );
}

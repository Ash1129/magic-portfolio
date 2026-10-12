import Image from "next/image";

type PlateImageProps = {
  src: string;
  alt: string;
  /** CSS aspect-ratio for the frame, e.g. "16/10". */
  ratio?: string;
  fit?: "cover" | "contain";
  sizes: string;
  priority?: boolean;
};

/** An image matted inside a thin surface border, the Classical "plate". */
export function PlateImage({
  src,
  alt,
  ratio = "16/10",
  fit = "cover",
  sizes,
  priority,
}: PlateImageProps) {
  return (
    <div className="plate">
      <div
        className={`plate__frame${fit === "contain" ? " plate__frame--contain" : ""}`}
        style={{ aspectRatio: ratio }}
      >
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} />
      </div>
    </div>
  );
}

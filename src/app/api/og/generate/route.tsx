import { ImageResponse } from "next/og";
import { person } from "@/resources";

export const runtime = "nodejs";

async function loadGoogleFont(family: string): Promise<ArrayBuffer> {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}`)).text();
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/);
  if (resource) {
    const response = await fetch(resource[1]);
    if (response.ok) return response.arrayBuffer();
  }
  throw new Error(`failed to load font data for ${family}`);
}

export async function GET(request: Request) {
  const title = new URL(request.url).searchParams.get("title") || person.name;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "96px",
        background: "#f3f2f2",
        color: "#201f1d",
        fontFamily: "Cormorant Garamond",
      }}
    >
      <span style={{ fontSize: 28, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7d5411" }}>
        Product Strategy · AI · Consulting
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
        <span style={{ fontSize: 112, lineHeight: 1, letterSpacing: "-0.02em" }}>{title}</span>
        <div style={{ width: 160, height: 2, background: "#b68235" }} />
      </div>
      <span style={{ fontSize: 40 }}>{person.name}</span>
    </div>,
    {
      width: 1280,
      height: 720,
      fonts: [
        {
          name: "Cormorant Garamond",
          data: await loadGoogleFont("Cormorant+Garamond:wght@400"),
          style: "normal",
        },
      ],
    },
  );
}

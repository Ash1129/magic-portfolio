export type WorkItem = {
  org: string;
  when: string;
  title: string;
  body: string;
  result: string;
};

export type Step = {
  title: string;
  body: string;
};

export type Service = {
  icon: "venn" | "network" | "chart" | "star";
  title: string;
  body: string;
};

export type FeaturedProject = {
  slug: string;
  image?: string;
};

export type GalleryImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export const person = {
  name: "Ashwin Prajeeth",
  firstName: "Ashwin",
  role: "Product Strategy · AI · Consulting",
  email: "ap2538@cornell.edu",
  location: "Ithaca, NY",
  linkedin: "https://www.linkedin.com/in/ashwinprajeeth/",
  github: "https://github.com/Ash1129",
  vsco: "https://vsco.co/ashwinprajeeth/gallery",
  resume: "/resume.pdf",
};

export const hero = {
  kicker: "Product Strategy · AI · Consulting",
  bio: "A product strategist who turns ambiguous business problems into AI products people actually use. From building GenAI proofs of concept at Deloitte to writing the PRD for an agentic customer-service product with Oracle, I sit between strategy, engineering and the customer. Currently an Engineering Management candidate at Cornell, based in Ithaca and New York.",
  photo: { src: "/images/ashwin-hero.jpg", width: 1500, height: 2000 },
  caption: "Dubai Autodrome, between laps.",
};

export const work: WorkItem[] = [
  {
    org: "VenueHorn",
    when: "Jun 2026 – Present",
    title: "An AI monetization feature for a venue marketplace",
    body: "Led eight data interns and diagnosed gaps in the revenue model, then wrote the PRD for a premium feature that generates curated venue listings from natural-language descriptions.",
    result: "Owned the workstream end to end",
  },
  {
    org: "Oracle × Cornell",
    when: "Jan 2026 – Present",
    title: "An agentic AI customer-service product on OCI",
    body: "Wrote the PR/FAQ and the end-to-end PRD, with American Express as the reference client. Set a three-feature roadmap: a RAG knowledge assistant, a points-expiry redemption flow and an agentic fulfillment engine.",
    result: "Aligned stakeholders on direction and governance",
  },
  {
    org: "Deloitte Consulting",
    when: "2023 – 2025",
    title: "A GenAI analytics microservice for banking",
    body: "Led a team of five building a proof of concept on Vertex AI, Qdrant and Cloud SQL that automated a large share of manual analyst workflows.",
    result: "35% of analyst workflows automated · new client won",
  },
  {
    org: "Deloitte Consulting",
    when: "2023 – 2025",
    title: "A conversational assistant for card onboarding",
    body: "Designed and launched a chatbot that automates supplementary card requests, working across product, design and engineering.",
    result: "+15% feature adoption",
  },
  {
    org: "MIT Global AI Hackathon",
    when: "Venture Lab",
    title: "An AI venture pitched to top-tier VCs",
    body: "One of 30 teams chosen from more than 6,500 applicants worldwide. Refined the venture in investor workshops and pitched it to a16z, Antler and Creandum.",
    result: "Top 1% of applicants",
  },
  {
    org: "Cornell Philanthropy Practicum",
    when: "Ongoing",
    title: "Allocating $80K to regional nonprofits",
    body: "Working with a student cohort to source, evaluate and fund nonprofit centers across Tompkins County.",
    result: "$80K in grants",
  },
];

export const services: Service[] = [
  {
    icon: "venn",
    title: "Product strategy",
    body: "I turn ambiguous business problems into clear product direction: PR/FAQs, end-to-end PRDs and roadmaps that product, data and leadership can align on.",
  },
  {
    icon: "network",
    title: "GenAI & multi-agent systems",
    body: "I scope and build AI products end to end, from RAG knowledge assistants on Vertex AI and Qdrant to multi-agent pipelines with OpenAI and Claude.",
  },
  {
    icon: "chart",
    title: "Consulting & business strategy",
    body: "I run market research, competitive analysis and RFPs, coordinating delivery, pricing and roadmaps across finance, product and engineering to win client work.",
  },
  {
    icon: "star",
    title: "Team leadership",
    body: "I lead and grow teams: eight data interns at VenueHorn, a five-person build team at Deloitte, and GenAI training that brought 15+ new analysts up to speed.",
  },
];

export const featured = {
  blurb:
    "A few of the AI systems I've designed and built end to end: multi-agent investment research, healthcare claims automation and an agentic personal assistant.",
  // The first project gets the large tile. `image` overrides the project's card image.
  projects: [
    { slug: "deepdiligence" },
    { slug: "cotiviti-policy-to-rules" },
    { slug: "cornell-personal-assistant", image: "/images/projects/cornell/featured.webp" },
  ] satisfies FeaturedProject[],
};

export const howIWork = {
  heading:
    "I help teams cut through the AI noise and ship products that solve a real business problem.",
  body: "My background is in computer science and consulting, so I'm as comfortable writing a PR/FAQ for executives as I am scoping a retrieval pipeline with engineers. I work closely with stakeholders, keep the team pointed at the metric that matters, and get hands-on with the build.",
};

export const steps: Step[] = [
  {
    title: "Frame",
    body: "Start with the business problem, not the technology. I dig into the data, talk to stakeholders, and turn ambiguity into a sharp PRD or PR/FAQ that everyone can sign off on.",
  },
  {
    title: "Build",
    body: "Prototype fast and close to the metal. I scope the data, APIs and governance, then work with engineers to get a working proof of concept in front of users.",
  },
  {
    title: "Deliver",
    body: "A project only succeeds if it moves a number. I keep teams aligned on outcomes like adoption, automation and revenue, and see the work through to launch.",
  },
];

export const contact = {
  body: "I'm open to full-time product strategy, product management and consulting roles starting in 2027. I'm F-1 STEM OPT eligible with 36 months of US work authorization, and no sponsorship is needed to start.",
};

export const photography = {
  intro:
    "Outside of work, I document striking places and people through visual storytelling.",
  images: [
    { src: "/images/gallery/horizontal1.jpg", alt: "Photograph by Ashwin Prajeeth", width: 6000, height: 3376 },
    { src: "/images/gallery/vertical1.jpg", alt: "Photograph by Ashwin Prajeeth", width: 6000, height: 4000 },
    { src: "/images/gallery/horizontal3.jpg", alt: "Photograph by Ashwin Prajeeth", width: 6000, height: 4000 },
    { src: "/images/gallery/vertical4.jpg", alt: "Photograph by Ashwin Prajeeth", width: 523, height: 696 },
    { src: "/images/gallery/vertical2.jpg", alt: "Photograph by Ashwin Prajeeth", width: 6000, height: 3376 },
    { src: "/images/gallery/horizontal2.jpg", alt: "Photograph by Ashwin Prajeeth", width: 6000, height: 3376 },
    { src: "/images/gallery/horizontal4.jpg", alt: "Photograph by Ashwin Prajeeth", width: 2937, height: 2881 },
    { src: "/images/gallery/vertical3.jpg", alt: "Photograph by Ashwin Prajeeth", width: 520, height: 692 },
  ] satisfies GalleryImage[],
};

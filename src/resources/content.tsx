import type { About, Blog, Gallery, Home, Newsletter, Person, Social, Work } from "@/types";
import { Line, Row, Text } from "@once-ui-system/core";

const person: Person = {
  firstName: "Ashwin",
  lastName: "Prajeeth",
  name: "Ashwin Prajeeth",
  role: "Engineering Management Graduate Student - Cornell",
  avatar: "/images/Ash.jpeg",
  email: "ap2538@cornell.edu",
  location: "America/New_York",
  locationLabel: "America/New York",
  languages: ["English", "Hindi", "Spanish"],
};

const newsletter: Newsletter = {
  // Turn this on later if you actually want a newsletter signup.
  display: false,
  title: <>Subscribe to {person.firstName}'s Newsletter</>,
  description: <>Notes on agentic AI, automation systems, and product strategy</>,
};

const social: Social = [
  {
    name: "GitHub",
    icon: "github",
    link: "https://github.com/Ash1129",
    essential: true,
  },
  {
    name: "LinkedIn",
    icon: "linkedin",
    link: "https://www.linkedin.com/in/ashwinprajeeth/",
    essential: true,
  },
  {
    name: "Email",
    icon: "email",
    link: "mailto:ap2538@cornell.edu",
    essential: true,
  },
  {
    name: "📄 Resume",
    icon: "fileText",
    link: "/resume.pdf",
    essential: true,
  },
];

const home: Home = {
  path: "/",
  image: "/images/og/home.jpg",
  label: "Home",
  title: `${person.name}'s Portfolio`,
  description: `Portfolio website showcasing my work in ${person.role}`,
  headline: <>Building real-world GenAI systems and Automations that automate work</>,
  featured: {
    display: true,
    // title: (
    //   <Row gap="12" vertical="center">
    //     <strong className="ml-4">Featured</strong>
    //     <Line background="brand-alpha-strong" vert height="20" />
    //     <Text marginRight="4" onBackground="brand-medium">
    //       Grad Student Automation Suite
    //     </Text>
    //   </Row>
    // ),
    items: [
      {
        title: (
          <Row gap="12" vertical="center">
            <strong className="ml-4">Featured</strong>
            <Line background="brand-alpha-strong" vert height="20" />
            <Text marginRight="4" onBackground="brand-medium">
              Cornell Personal Assistant
            </Text>
          </Row>
        ),
        href: "/work/cornell-personal-assistant",
      },
      {
        title: (
          <Row gap="12" vertical="center">
            <strong className="ml-4">Featured</strong>
            <Line background="accent-alpha-strong" vert height="20" />
            <Text marginRight="4" onBackground="accent-medium">
              Travel GPT
            </Text>
          </Row>
        ),
        href: "/work/koreai-travel-agent-gpt",
      },
    ],
    href: "/work/cornell-personal-assistant",
    title: undefined
  },
  subline: (
    <>
      I’m Ashwin, currently pursuing an M.Eng in Engineering Management at{" "}
      <Text as="span" size="xl" weight="strong">
        Cornell University
      </Text>
      . I build automation workflows and GenAI products using RAG, vector databases,
      and cloud-native stacks.
    </>
  ),
};

const about: About = {
  path: "/about",
  label: "About",
  title: `About – ${person.name}`,
  description: `Meet ${person.name}, ${person.role} based in Ithaca, NY`,
  tableOfContent: {
    display: true,
    subItems: false,
  },
  avatar: {
    display: true,
  },
  calendar: {
    // If you have a Cal.com link, add it here. Otherwise set display to false.
    display: false,
    link: "https://cal.com",
  },
  intro: {
    display: true,
    title: "Introduction",
    description: (
    <>
      I build technology-driven solutions at the intersection of strategy, product, and AI. At Deloitte, I worked with cross-functional teams to redesign customer journeys and deliver generative AI and RAG-based tools that automated manual analysis, surfaced market insights, and improved decision-making.
      <br />
      <br />
      Outside of my work, I have a strong passion for photography and enjoy documenting striking places and people through visual storytelling. A glimpse of this work can be found in the photography section.
    </>
    ),
  },
  work: {
    display: true,
    title: "Work Experience",
    experiences: [
      {
        company: "Deloitte Consulting",
        timeframe: "Aug 2023 – Mar 2025",
        role: "Analyst, Customer Strategy & Design",
        achievements: [
          "Built and shipped GenAI and RAG-based chatbot systems using Qdrant, GCP SQL, and Vertex AI, automating manual analyst workflows and improving document Q&A accuracy.",
          "Drove product strategy, UX improvements, and feature delivery through customer research, competitive analysis, and cross-functional execution, increasing customer satisfaction, engagement, and acquisitions.",
          "Partnered with cross-functional product, design, and engineering teams to deliver revenue-impacting chatbot features, including automated supplementary card requests.",
        ],
        images: [
          {
            src: "/images/deloitte/image01.jpeg",
            alt: "Image 01",
            width: 16,
            height: 9,
          },
          {
            src: "/images/deloitte/image02.jpeg",
            alt: "RAG document ingestion and Q&A workflow",
            width: 16,
            height: 9,
          },
          {
            src: "/images/deloitte/image03.jpeg",
            alt: "RAG document ingestion and Q&A workflow",
            width: 16,
            height: 14,
          },
        ],
      },
      {
        company: "Freshnest",
        timeframe: "Jun 2022 – Aug 2022",
        role: "Associate Consultant Intern",
        achievements: [
          "Led operational analysis initiatives to uncover inefficiencies in facility workflows, driving meaningful improvements in productivity and yield optimization.",
          "Conducted market research and built partnerships to expand reach and strengthen brand presence.",
        ],
        images: [
          {
            src: "/images/freshnest/image01",
            alt: "Image 01",
            width: 16,
            height: 9,
          },
          {
            src: "/images/freshnest/image02.jpg",
            alt: "RAG document ingestion and Q&A workflow",
            width: 16,
            height: 9,
          },
        ],
      },
    ],
  },
  studies: {
  display: true,
  title: "Education",
  institutions: [
    {
      name: "Cornell University",
      description: (
        <>
          <strong>Master’s in Engineering Management (Aug 2025 – Present)</strong> 
          <br />
          Coursework: Data Analytics, Decision Framing & Analytics, Project
          Management, Negotiations & Contracts, and Data Driven Marketing.
          <br />
          <em>GPA: 3.96 / 4</em>
        </>
      ),
    },
    {
      name: "Delhi Technological University",
      description: (
        <>
          <strong>Bachelor's in Technology in Computer Science (Jul 2019 – May 2023)</strong> 
          <br />
          Coursework: Artificial Intelligence, Algorithm Design & Analysis, Data Structures, Database Management Systems, Software Engineering.
          <br />
          <em>Cumulative GPA: 3.65 / 4 · Major GPA: 3.88 / 4</em>
        </>
      ),
    },
  ],
},
  // studies: {
  //   display: true,
  //   title: "Education",
  //   institutions: [
  //     {
  //       name: "Cornell University",
  //       description: (
  //         <>
  //           Master’s in Engineering Management (Aug 2025 – Present). Coursework includes
  //           Data Analytics, Decision Framing & Analytics, Project Management, Negotiations
  //           & Contracts, and Data Driven Marketing.
  //           <br />
  //           <em>GPA: 3.96 / 4</em>
  //         </>
  //       ),
  //     },
  //     {
  //       name: "Delhi Technological University",
  //       description: (
  //         <>
  //           B.Tech in Computer Science (Jul 2019 – May 2023).
  //           <br />
  //           <em>Cumulative GPA: 3.65 / 4 · Major GPA: 3.88 / 4</em>
  //         </>
  //       ),
  //     },
  //   ],
  // },
  technical: {
    display: true,
    title: "Technical skills",
    skills: [
      {
        title: "GenAI and RAG Systems",
        description: "Building retrieval-augmented generation systems using vector databases, structured prompting, and cloud data stores for high-accuracy Q&A and automation.",
        tags: [
          { name: "RAG", icon: "sparkles" },
          { name: "Qdrant", icon: "database" },
          { name: "OpenAI API", icon: "sparkles" },
          { name: "Vertex AI", icon: "google" },
        ],
        images: [],
      },
      {
        title: "Automation Workflows",
        description: "Designing practical automations in n8n, integrating Google Calendar, Airtable, email, and GPT to reduce manual effort and improve task readiness.",
        tags: [
          { name: "n8n", icon: "workflow" },
          { name: "Airtable", icon: "table" },
          { name: "Google Calendar", icon: "calendar" },
        ],
        images: [],
      },
      {
        title: "Data and Programming",
        description: "Strong foundations in Python, SQL, and analytics. Comfortable with dashboards and data workflows across spreadsheets and cloud platforms.",
        tags: [
          { name: "Python", icon: "python" },
          { name: "SQL", icon: "database" },
          { name: "Excel", icon: "excel" },
          { name: "GCP", icon: "google" },
        ],
        images: [],
      },
    ],
  },
  miscellaneous: {
    display: true,
    title: "Miscellaneous",
    sections: [
      {
        title: "Interests",
        items: [
          "Motorsports",
          "Soccer",
          "Running",
          "Poker",
          {
            label: "Photography",
            href: "/gallery", // replace with real link
            newTab: false,
          },
          "Chess",
        ],
      },
      // {
      //   title: "Active roles",
      //   items: [
      //     "President @ Duke Vibe Coding Club",
      //     "Adobe Student Ambassador",
      //     "Perplexity Campus Partner",
      //   ],
      // },
      {
        title: "Publications",
        items: [
          {
            label: "Assessing the Efficacy of Different BERT Variants for Distinguishing Types of Cyberbullying on Twitter",
            href: "https://link.springer.com/chapter/10.1007/978-981-99-6550-2_40", // replace with real link
          },
          {
            label: "Impact of Blockchain Technology in the Healthcare Systems",
            href: "https://link.springer.com/chapter/10.1007/978-981-16-7610-9_53", // replace with real link
          },
        ],
        
      },
    ],
  },
};

const blog: Blog = {
  path: "/blog",
  label: "Blog",
  title: "Writing about GenAI, automation, and product strategy",
  description: `Read what ${person.name} has been building and learning`,
  // Add posts by creating .mdx files in src/app/blog/posts
};

const work: Work = {
  path: "/work",
  label: "Projects",
  title: `Projects – ${person.name}`,
  description: `Selected GenAI and automation projects by ${person.name}`,
  // Add projects by creating .mdx files in src/app/work/projects
};

const gallery: Gallery = {
  path: "/gallery",
  label: "Photography",
  title: `Photography – ${person.name}`,
  description: `Photography by ${person.name}`,

  images: [
    { src: "/images/gallery/horizontal1.jpg", alt: "image", orientation: "horizontal" },
    { src: "/images/gallery/vertical1.jpg", alt: "image", orientation: "vertical" },
    { src: "/images/gallery/horizontal3.jpg", alt: "image", orientation: "horizontal" },
    { src: "/images/gallery/vertical4.jpg", alt: "image", orientation: "vertical" },
    { src: "/images/gallery/vertical2.jpg", alt: "image", orientation: "vertical" },
    { src: "/images/gallery/horizontal2.jpg", alt: "image", orientation: "horizontal" },
    { src: "/images/gallery/horizontal4.jpg", alt: "image", orientation: "horizontal" },
    { src: "/images/gallery/vertical3.jpg", alt: "image", orientation: "vertical" },
  ],
};

export { person, social, newsletter, home, about, blog, work, gallery };
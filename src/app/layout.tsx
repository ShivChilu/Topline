import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TOPLINE ODC - Premium Hospitality & Catering Staffing Solutions",
  description:
    "Hire verified university student catering staff and banquet stewards across Punjab & Northern India. Founded by LPU students Chiluveru Shiva Prasad & Balaji in Phagwara, Punjab. For client catering bookings, call +91 79869 55634.",
  keywords: [
    "TOPLINE ODC",
    "Topline ODC",
    "toplineodc",
    "hire catering staff Punjab",
    "banquet stewards Phagwara",
    "hospitality event crew Jalandhar",
    "catering staff Amritsar",
    "Chiluveru Shiva Prasad",
    "Balaji",
    "LPU students startup",
    "Lovely Professional University hospitality staff",
    "Phagwara Punjab event staff",
    "catering staff call 7986955634",
  ],
  authors: [
    { name: "Chiluveru Shiva Prasad", url: "https://www.toplineodc.co.in/about" },
    { name: "Balaji", url: "https://www.toplineodc.co.in/about" },
  ],
  creator: "Chiluveru Shiva Prasad",
  publisher: "TOPLINE ODC",
  metadataBase: new URL("https://www.toplineodc.co.in"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TOPLINE ODC - Premium Hospitality & Catering Staffing Solutions",
    description:
      "Deploy dependable, pre-screened student catering staff and hotel banquet crews. Founded by LPU students Chiluveru Shiva Prasad & Balaji in Phagwara, Punjab. Client inquiries: +91 79869 55634.",
    url: "https://www.toplineodc.co.in",
    siteName: "TOPLINE ODC",
    locale: "en_IN",
    type: "website",
  },
};

const jsonLdData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://www.toplineodc.co.in/#organization",
    name: "TOPLINE ODC",
    alternateName: ["Topline ODC", "Topline Hospitality Staffing", "TOPLINE On Duty Crew"],
    url: "https://www.toplineodc.co.in",
    logo: "https://www.toplineodc.co.in/favicon.png",
    description:
      "TOPLINE ODC is a premier hospitality recruitment and catering staffing platform founded by Lovely Professional University (LPU) students Chiluveru Shiva Prasad (Founder) and Balaji (Co-Founder) in Phagwara, Punjab. We supply verified university student workforces for catering events, buffet management, banquet service, and hospitality coordination across Punjab and Northern India.",
    founders: [
      {
        "@type": "Person",
        name: "Chiluveru Shiva Prasad",
        jobTitle: "Founder",
        alumniOf: {
          "@type": "CollegeOrUniversity",
          name: "Lovely Professional University (LPU)",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Phagwara",
            addressRegion: "Punjab",
            addressCountry: "IN",
          },
        },
      },
      {
        "@type": "Person",
        name: "Balaji",
        jobTitle: "Co-Founder",
        alumniOf: {
          "@type": "CollegeOrUniversity",
          name: "Lovely Professional University (LPU)",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Phagwara",
            addressRegion: "Punjab",
            addressCountry: "IN",
          },
        },
      },
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Phagwara",
      addressRegion: "Punjab",
      addressCountry: "IN",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+91-79869-55634",
        contactType: "Customer Support & Client Catering Staff Hire",
        areaServed: "IN",
        availableLanguage: ["English", "Hindi", "Punjabi", "Telugu"],
      },
    ],
    knowsAbout: [
      "Catering Staff Hire",
      "Banquet Stewards",
      "Hospitality Event Crews",
      "Buffet Management",
      "LPU Student Staffing",
      "Phagwara Hospitality Services",
      "Punjab Event Manpower",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "EmploymentAgency",
    "@id": "https://www.toplineodc.co.in/#agency",
    name: "TOPLINE ODC - Hospitality & Catering Staffing",
    url: "https://www.toplineodc.co.in",
    telephone: "+91-79869-55634",
    founder: {
      "@type": "Person",
      name: "Chiluveru Shiva Prasad",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Phagwara",
      addressRegion: "Punjab",
      addressCountry: "IN",
    },
    areaServed: ["Phagwara", "Jalandhar", "Amritsar", "Ludhiana", "Punjab", "Northern India"],
    description:
      "Connecting luxury hotels, resorts, banquet venues, and catering businesses with trained university student workforces.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Who founded TOPLINE ODC?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "TOPLINE ODC was founded by Lovely Professional University (LPU) students Chiluveru Shiva Prasad (Founder) and Balaji (Co-Founder), headquartered in Phagwara, Punjab, India.",
        },
      },
      {
        "@type": "Question",
        name: "How can clients hire catering staff or banquet stewards from TOPLINE ODC?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Hotels, resorts, event planners, and catering businesses can hire professional catering staff, food handlers, and banquet stewards by visiting toplineodc.co.in or calling Founder Chiluveru Shiva Prasad directly at +91 79869 55634.",
        },
      },
      {
        "@type": "Question",
        name: "Where is TOPLINE ODC based and which locations do you serve?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "TOPLINE ODC is based in Phagwara, Punjab (near LPU). We actively serve luxury events, hotels, resorts, and catering companies across Phagwara, Jalandhar, Amritsar, Ludhiana, and throughout Northern India.",
        },
      },
      {
        "@type": "Question",
        name: "What type of staff does TOPLINE ODC provide?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "TOPLINE ODC deploys verified university student workforces for banquet service, catering food counter management, buffet operations, VIP guest hospitality, and event coordination.",
        },
      },
    ],
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <head>
        {jsonLdData.map((schema, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

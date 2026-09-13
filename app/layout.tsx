import type { Metadata, Viewport } from "next"
import { Space_Grotesk, Inter, Instrument_Serif } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import SiteEffects from "@/components/SiteEffects"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
})

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
})

export const metadata: Metadata = {
  title: {
    default: "PetPal — Everything Your Pet Needs, In One Place",
    template: "%s · PetPal",
  },
  description:
    "Feeding plans, health tracking, food-safety checks, a wellness check and vets near you. The all-in-one companion for dogs, cats, rabbits, birds, reptiles and small pets.",
  applicationName: "PetPal",
  openGraph: {
    title: "PetPal — Everything Your Pet Needs, In One Place",
    description:
      "Feeding plans, health tracking, food-safety checks and trusted vets near you — for every kind of pet.",
    type: "website",
    siteName: "PetPal",
  },
  twitter: {
    card: "summary_large_image",
    title: "PetPal — Everything Your Pet Needs, In One Place",
    description: "Feeding plans, health tracking, food-safety checks and trusted vets near you.",
  },
}

export const viewport: Viewport = {
  themeColor: "#0D0A14",
  colorScheme: "dark",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // Next.js 16 no longer overrides `scroll-behavior` during route changes.
      // globals.css sets `scroll-behavior: smooth` on <html>, so without this
      // attribute every navigation animates a long scroll to the top instead of
      // jumping. Opts back into the previous instant-navigation behaviour.
      data-scroll-behavior="smooth"
      className={`${spaceGrotesk.variable} ${inter.variable} ${instrumentSerif.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0D0A14] text-[#F4EFF7]">
        <SiteEffects />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1C1630",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#F4EFF7",
            },
          }}
        />
      </body>
    </html>
  )
}

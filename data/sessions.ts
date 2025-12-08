export const SESSIONS = {
  iphone: {
    id: "iphone",
    title: "iPhone Session",
    slug: "iphone",
    blurb: "Casual, fast, instant delivery",
    price: "$35–$60",
    delivery: "Instant delivery on-site",
    output: "All photos, unedited",
    tagline: "Authentic moments, instantly yours",
    accentColor: "from-sky-400 to-cyan-300",
    gradient: "from-sky-500/20 via-cyan-500/10 to-transparent",
    icon: "📱",
    bestFor: [
      "Instagram stories & reels",
      "Quick content shoots",
      "Casual portraits & candids",
    ],
  },
  raw_dslr: {
    id: "raw_dslr",
    title: "RAW DSLR Session",
    slug: "raw_dslr",
    blurb: "Full gallery with full creative freedom",
    price: "$65–$120",
    delivery: "Instant delivery on-site",
    output: "Full RAW gallery (~100+ shots)",
    tagline: "Pro quality, your creative vision",
    accentColor: "from-violet-400 to-fuchsia-400",
    gradient: "from-violet-500/20 via-fuchsia-500/10 to-transparent",
    icon: "📷",
    bestFor: [
      "Professional portfolios",
      "Brand campaigns",
      "Creators who edit their own content",
    ],
  },
  edited_dslr: {
    id: "edited_dslr",
    title: "Edited DSLR Session",
    slug: "edited_dslr",
    blurb: "Curated edits returned in 24 hours",
    price: "$120–$250",
    delivery: "24 hour turnaround",
    output: "25–40 edited selects",
    tagline: "Magazine-ready, zero effort",
    accentColor: "from-amber-400 to-orange-400",
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    icon: "✨",
    bestFor: [
      "Professional headshots",
      "Brand launches & campaigns",
      "High-end content creation",
    ],
  },
} as const

export type SessionType = keyof typeof SESSIONS

export const SESSION_KEYS = Object.keys(SESSIONS) as SessionType[]

export function isValidSessionType(type: string): type is SessionType {
  return type in SESSIONS
}


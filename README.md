# photka

**by amalia karaman**

on-demand photography booking platform.

## overview

photka connects users with professional photographers in nashville, tennessee. book instant sessions or schedule ahead, choose your session type, and get your photos delivered the way you want them.

## why i built this

after running nashphotoco in nashville for over five years, i noticed how outdated the photography booking process really is. working directly with clients showed me the gaps in how people struggle to book photographers, communicate during shoots, and receive their photos. a huge shift i noticed is how the modern social media landscape has changed people's priorities in photo delivery, emphasizing speed for content and the freedom to edit photos how they want to align with their personal or business branding. photo editing isn't exclusive to photographers anymore as everyone captures and edits photos 24/7. the real difficulty now is finding someone to actually take the photos. that's what inspired photka: a streamlined, api-driven core for photography bookings and delivery that gives people fast access to photographers and full control over their final images, with the option to have them edited if desired. this project blends my creative background with engineering, creating something that's more intuitive for both photographers and clients.

## features

- **shoot now** — instant photographer matching for spontaneous shoots
- **shoot later** — schedule sessions in advance with your preferred photographer
- **three session types**:
  - iphone session ($35–$60) — casual, instant delivery, unedited
  - raw dslr session ($65–$120) — professional grade, instant delivery on-site, full creative control for brand identity
  - edited dslr session ($85–$150) — curated, professionally edited
- **ai support chat** — get instant help with bookings, pricing, and questions
- **photka pro membership** — priority matching, discounts, and exclusive perks
- **real-time messaging** — chat directly with your photographer
- **activity dashboard** — track all your bookings and view completed galleries
- **referral program** — share your code and earn credits

## stack

- **frontend**: next.js 16, react 19, typescript
- **styling**: tailwind css 4
- **database & auth**: supabase (postgresql + auth)
- **ai**: openai gpt-4o-mini (for support chatbot)
- **maps**: native browser geolocation api
- **animations**: framer motion
- **deployment**: vercel-ready

## getting started

### prerequisites

- node.js 18+ 
- npm or yarn
- supabase account
- openai api key (for ai support chat)

### installation

1. clone the repository:
```bash
git clone https://github.com/amaliakaraman/photka-app
cd photka
```

2. install dependencies:
```bash
npm install
```

3. set up environment variables:
create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
OPENAI_API_KEY=your-openai-api-key
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your-google-places-api-key
```

4. run the development server:
```bash
npm run dev
```

5. open [http://localhost:3000](http://localhost:3000) in your browser.

### database setup

run the sql scripts from the `database/` folder in your supabase sql editor:
- `supabase_messages_schema.sql` — messages table schema
- `supabase_rls_policy.sql` — row level security policies
- `fix_support_messages_final.sql` — support chat configuration

see `AI_CHATBOT_SETUP.md` for detailed ai chatbot setup instructions.



## project structure

```
photka/
├── app/                    # next.js app router pages
│   ├── api/               # api routes (chat, bookings, etc.)
│   ├── (auth)/           # authentication pages
│   └── ...               # feature pages
├── components/            # react components
├── constants/            # app constants
├── database/             # sql schema and migration files
├── data/                 # mock data and configurations
├── hooks/                # custom react hooks
├── lib/                  # library configurations
├── types/                # typescript type definitions
├── utils/                # utility functions
└── public/               # static assets
```

## future improvements

- [ ] payment integration (stripe)
- [ ] photo upload and storage (supabase storage)
- [ ] push notifications for booking updates
- [ ] photographer rating and review system
- [ ] advanced filtering for photographer search
- [ ] multi-city expansion
- [ ] mobile app (react native)
- [ ] analytics dashboard for photographers


private project built with <3 by amalia karaman

import Link from 'next/link';
import Image from 'next/image';
import ContactButton from '@/components/ContactButton';

export default function DemoProjectsPage() {
  const projects = [
    {
      slug: 'twitch',
      title: 'TWITCH',
      description: 'A global community creating the future of live entertainment',
      team: ['Emmett Shear', 'Justin Kan', 'Kyle Vogt', 'Kevin Lin'],
      primaryTag: 'AI',
      secondaryTag: 'CONTENT',
      coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop',
      bookmarked: true,
    },
    {
      slug: 'axel',
      title: 'AXEL',
      description: 'The future of education',
      team: ['Kaela Green', 'Carol Yeabby', 'Nina Wham', 'Victoria Mayo'],
      primaryTag: 'AI',
      secondaryTag: 'EDUCATION',
      coverUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop',
      bookmarked: false,
    },
    {
      slug: 'bash-track',
      title: 'BASH TRACK',
      description: 'Event logistics',
      team: ['David Yang', 'Carol Yeabby', 'Nina Wham', 'Reuben Ogbonna', 'Victoria Mayo'],
      primaryTag: 'AI',
      secondaryTag: 'OPERATIONS',
      coverUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop',
      bookmarked: false,
    },
    {
      slug: 'notion',
      title: 'NOTION',
      description: 'The AI workspace where teams and individuals work together',
      team: ['Emmett Shear', 'Justin Kan', 'Kyle Vogt', 'Kevin Lin'],
      primaryTag: 'AI',
      secondaryTag: 'OPERATIONS',
      coverUrl: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&h=600&fit=crop',
      bookmarked: true,
    },
    {
      slug: 'coinbase',
      title: 'COINBASE',
      description: 'Buy, sell, and manage cryptocurrencies',
      team: ['Brian Armstrong', 'Fred Ehrsam'],
      primaryTag: 'AI',
      secondaryTag: 'CRYPTO',
      coverUrl: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=800&h=600&fit=crop',
      bookmarked: false,
    },
    {
      slug: 'airbnb',
      title: 'AIRBNB',
      description: 'Vacation rentals, cabins, beach houses, & more',
      team: ['Brian Chesky', 'Joe Gebbia', 'Nathan Blecharczyk'],
      primaryTag: 'AI',
      secondaryTag: 'EDUCATION',
      coverUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
      bookmarked: true,
    },
    {
      slug: 'doordash',
      title: 'DOORDASH',
      description: 'Restaurant delivery',
      team: ['Tony Xu', 'Andy Fang', 'Stanley Tang'],
      primaryTag: 'AI',
      secondaryTag: 'MARKETPLACE',
      coverUrl: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800&h=600&fit=crop',
      bookmarked: false,
    },
    {
      slug: 'amplitude',
      title: 'AMPLITUDE',
      description: 'Digital analytics platform',
      team: ['Spencer Skates', 'Curtis Liu'],
      primaryTag: 'AI',
      secondaryTag: 'ANALYTICS',
      coverUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
      bookmarked: false,
    },
  ];

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Left Sidebar */}
      <aside className="hidden lg:block w-64 bg-white border-r border-neutral-200 p-6 overflow-y-auto">
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold">Cohort</h2>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">March '25: AI-Native</span>
            </label>
            <label className="flex items-center gap-2 pl-6">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">11.0: Web</span>
            </label>
            <label className="flex items-center gap-2 pl-6">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">10.0: Web</span>
            </label>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold">Industry Expertise</h2>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">All</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Consumer</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Fintech</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Healthcare</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Real Estate</span>
            </label>
          </div>
        </div>

        <div className="mb-8">
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Has Demo Video</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Open to Relocate</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Open to Work</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Freelance</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">NYC-based</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Remote Only</span>
            </label>
          </div>
        </div>

        <ContactButton />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {/* Top Bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/projects" className="rounded-full border bg-black px-3 py-1 text-sm text-white">
              PROJECTS
            </Link>
            <Link href="/people" className="rounded-full border px-3 py-1 text-sm hover:bg-neutral-50">
              PEOPLE
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-600">8 of 12</span>
            <div className="flex gap-2">
              <button className="rounded border p-2 hover:bg-neutral-100">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect width="7" height="7" x="3" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="14" rx="1" />
                  <rect width="7" height="7" x="3" y="14" rx="1" />
                </svg>
              </button>
              <button className="rounded border p-2 hover:bg-neutral-100">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="8" x2="21" y1="6" y2="6" />
                  <line x1="8" x2="21" y1="12" y2="12" />
                  <line x1="8" x2="21" y1="18" y2="18" />
                  <line x1="3" x2="3.01" y1="6" y2="6" />
                  <line x1="3" x2="3.01" y1="12" y2="12" />
                  <line x1="3" x2="3.01" y1="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button className="fixed left-72 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border bg-white p-3 shadow-lg hover:bg-neutral-50 lg:block">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button className="fixed right-8 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border bg-white p-3 shadow-lg hover:bg-neutral-50 lg:block">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Project Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}`}
              className="group relative overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-xl"
            >
              {/* Bookmark */}
              {project.bookmarked && (
                <div className="absolute right-3 top-3 z-10">
                  <svg className="h-6 w-6 fill-blue-600" viewBox="0 0 24 24">
                    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                  </svg>
                </div>
              )}

              {/* Image */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900">
                <Image
                  src={project.coverUrl}
                  alt={project.title}
                  fill
                  className="object-cover opacity-80 transition group-hover:scale-105 group-hover:opacity-100"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                {/* Title Overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-4">
                  <h3 className="mb-1 text-xl font-bold text-white">{project.title}</h3>
                  <p className="text-sm text-white/90">{project.description}</p>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="mb-3">
                  <h4 className="mb-1 text-xs font-semibold text-neutral-500">Project Team</h4>
                  <ul className="space-y-0.5">
                    {project.team.map((member) => (
                      <li key={member} className="text-sm text-neutral-700">• {member}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-800">
                    {project.primaryTag}
                  </span>
                  <button className="rounded-full border p-1.5 hover:bg-neutral-50">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </button>
                </div>

                <div className="mt-2">
                  <span className="inline-block rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                    {project.secondaryTag}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

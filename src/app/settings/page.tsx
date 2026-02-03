import Link from 'next/link';
import { db } from '@/lib/db';
import { endpoints } from '@/lib/db/schema';
import { EndpointForm } from '@/components/settings/EndpointForm';
import { EndpointList } from '@/components/settings/EndpointList';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const allEndpoints = await db.select().from(endpoints).all();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Add Endpoint
          </h2>
          <EndpointForm />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Saved Endpoints
          </h2>
          <EndpointList endpoints={allEndpoints} />
        </section>
      </main>
    </div>
  );
}

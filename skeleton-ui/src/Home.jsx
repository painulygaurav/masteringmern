import Card from "./Card";
import Skeleton from "./Skeleton";

const SKELETON_COUNT = 1;

export default function Home({ posts, loading, error, onRetry }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Latest posts
        </h1>

        {error ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          >
            <p>{error}</p>
            <button
              onClick={onRetry}
              className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              Retry
            </button>
          </div>
        ) : (
          <div
            aria-busy={loading}
            className="grid grid-cols-1 gap-6 sm:max-w-sm"
          >
            {loading
              ? Array.from({ length: SKELETON_COUNT }, (_, i) => (
                  <Skeleton key={i} />
                ))
              : posts.map((post) => <Card key={post.id} {...post} />)}
          </div>
        )}
      </div>
    </main>
  );
}

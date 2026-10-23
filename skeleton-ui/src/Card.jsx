export default function Card({
  image,
  title,
  description,
  category,
  author,
  readTime,
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      {/* Fixed aspect ratio keeps layout stable while the image loads */}
      <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {category && (
          <span className="w-fit rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
            {category}
          </span>
        )}

        <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-slate-900 dark:text-slate-100">
          {title}
        </h3>

        <p className="line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {description}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {author}
          </span>
          <span>{readTime} min read</span>
        </div>
      </div>
    </article>
  );
}

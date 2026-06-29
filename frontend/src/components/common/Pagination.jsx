export const Pagination = ({ page, total, limit, onChange, dark = false }) => {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const end = Math.min(totalPages, Math.max(page + 2, 5));
  const start = Math.max(1, end - 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const base = dark
    ? 'text-sm rounded-lg transition font-medium text-gray-400 hover:bg-white/5 disabled:opacity-30'
    : 'text-sm rounded-lg transition font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30';

  return (
    <div className="flex items-center justify-center gap-1 mt-6 pb-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className={`px-3 py-2 ${base}`}
      >
        ‹
      </button>
      {start > 1 && (
        <>
          <button onClick={() => onChange(1)} className={`w-9 h-9 ${base}`}>1</button>
          {start > 2 && <span className={`px-1 text-sm ${dark ? 'text-gray-600' : 'text-gray-400'}`}>…</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-9 h-9 ${
            p === page
              ? dark
                ? 'bg-amber-500 text-black rounded-lg text-sm font-bold'
                : 'bg-gray-900 text-white rounded-lg text-sm font-bold'
              : base
          }`}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className={`px-1 text-sm ${dark ? 'text-gray-600' : 'text-gray-400'}`}>…</span>}
          <button onClick={() => onChange(totalPages)} className={`w-9 h-9 ${base}`}>{totalPages}</button>
        </>
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className={`px-3 py-2 ${base}`}
      >
        ›
      </button>
    </div>
  );
};

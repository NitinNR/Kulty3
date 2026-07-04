export const Pagination = ({
  page, total, limit, onChange,
  onLimitChange, perPageOptions = [10, 20, 50],
  dark = false,
}) => {
  const totalPages = Math.ceil(total / limit) || 1;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  const end   = Math.min(totalPages, Math.max(page + 2, 5));
  const start = Math.max(1, end - 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const btnBase = dark
    ? 'text-sm rounded-lg transition font-medium text-gray-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed'
    : 'text-sm rounded-lg transition font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed';

  const activeBtn = dark
    ? 'bg-amber-500 text-black rounded-lg text-sm font-bold'
    : 'bg-gray-900 text-white rounded-lg text-sm font-bold';

  const dotColor = dark ? 'text-gray-600' : 'text-gray-400';

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 mt-6 pb-2 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>

      {/* Left: rows-per-page selector */}
      {onLimitChange ? (
        <div className="flex items-center gap-2 text-sm">
          <span className={dark ? 'text-gray-500' : 'text-gray-400'}>Rows per page</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className={`text-sm border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-400 ${
              dark
                ? 'bg-transparent border-white/10 text-gray-300'
                : 'bg-white border-gray-200 text-gray-700'
            }`}
          >
            {perPageOptions.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      ) : (
        <div />
      )}

      {/* Center: page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button onClick={() => onChange(page - 1)} disabled={page === 1} className={`px-3 py-2 ${btnBase}`}>
            ‹
          </button>

          {start > 1 && (
            <>
              <button onClick={() => onChange(1)} className={`w-9 h-9 ${btnBase}`}>1</button>
              {start > 2 && <span className={`px-1 text-sm ${dotColor}`}>…</span>}
            </>
          )}

          {pages.map((p) => (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`w-9 h-9 ${p === page ? activeBtn : btnBase}`}
            >
              {p}
            </button>
          ))}

          {end < totalPages && (
            <>
              {end < totalPages - 1 && <span className={`px-1 text-sm ${dotColor}`}>…</span>}
              <button onClick={() => onChange(totalPages)} className={`w-9 h-9 ${btnBase}`}>{totalPages}</button>
            </>
          )}

          <button onClick={() => onChange(page + 1)} disabled={page === totalPages} className={`px-3 py-2 ${btnBase}`}>
            ›
          </button>
        </div>
      )}

      {/* Right: record count */}
      <span className="text-xs">
        {total === 0 ? 'No records' : `Showing ${from}–${to} of ${total}`}
      </span>

    </div>
  );
};

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { getAllUsers } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { Pagination } from '../../components/common/Pagination';

const roleBadgeClass = {
  admin:       'bg-red-100 text-red-700',
  venue_owner: 'bg-purple-100 text-purple-700',
  venue_staff: 'bg-blue-100 text-blue-700',
  user:        'bg-gray-100 text-gray-700',
};

export const AdminUsersPage = () => {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);
  const [limit,   setLimit]   = useState(20);
  const [total,   setTotal]   = useState(0);
  const navigate = useNavigate();

  const fetchUsers = async (pg = 1, lim = limit) => {
    setLoading(true);
    try {
      const res = await getAllUsers({ page: pg, limit: lim });
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(page, limit); }, [page, limit]);

  const filtered = search
    ? users.filter(
        (u) =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-4 sm:px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/admin')} className="hover:text-gray-300 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg sm:text-xl font-bold">Users</h1>
        <span className="text-gray-400 text-sm ml-auto">{total} total</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filter current page by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">User</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Subscription</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50 transition">
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            {user.profilePhoto ? (
                              <img src={user.profilePhoto} alt={user.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                                {user.name?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{user.name || 'No name'}</p>
                              <p className="text-xs text-gray-400 truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            user.subscription?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {user.subscription?.status || 'inactive'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${roleBadgeClass[user.role] || 'bg-gray-100 text-gray-700'}`}>
                            {user.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400">No users found</div>
              )}
            </div>

            {!search && (
              <Pagination
                page={page}
                total={total}
                limit={limit}
                onChange={(p) => { setPage(p); window.scrollTo(0, 0); }}
                onLimitChange={(l) => { setLimit(l); setPage(1); }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

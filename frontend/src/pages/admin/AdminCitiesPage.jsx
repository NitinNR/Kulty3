import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Plus, Trash2, Loader2 } from 'lucide-react';
import { getAdminCities, addCity, deleteCity } from '../../services/api';

export const AdminCitiesPage = () => {
  const [cities,    setCities]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [newName,   setNewName]   = useState('');
  const [adding,    setAdding]    = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error,     setError]     = useState('');
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    getAdminCities()
      .then((res) => setCities(res.data?.cities || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setError('');
    try {
      await addCity(name);
      setNewName('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add city');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteCity(id);
      setCities((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove city');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/admin')} className="hover:text-gray-400 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Manage Cities</h1>
        <span className="ml-auto text-sm text-gray-400">{cities.length} cities</span>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Add city form */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Add New City</h2>
          <form onSubmit={handleAdd} className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError(''); }}
              placeholder="e.g. Hyderabad"
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
          </form>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>

        {/* City list */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : cities.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No cities added yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {cities.map((city) => (
                <li key={city._id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900">{city.name}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(city._id)}
                    disabled={deletingId === city._id}
                    className="text-gray-400 hover:text-red-500 transition disabled:opacity-40"
                    title="Remove city"
                  >
                    {deletingId === city._id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          These cities appear in the homepage city filter. New cities are added automatically when a venue application is approved.
        </p>
      </div>
    </div>
  );
};

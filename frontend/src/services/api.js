import axios from 'axios';
import auth from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const completeProfile = (data) => api.post('/auth/complete-profile', data);
export const getMe = () => api.get('/users/me');
export const updateProfile = (data) => api.patch('/users/me', data);

export const getVenues = (params) => api.get('/venues', { params });
export const getVenue = (id) => api.get(`/venues/${id}`);
export const createVenue = (data) => api.post('/venues', data);
export const updateVenue = (id, data) => api.put(`/venues/${id}`, data);
export const deleteVenue = (id) => api.delete(`/venues/${id}`);

export const getEvents       = (params) => api.get('/events', { params });
export const getEvent        = (id)     => api.get(`/events/${id}`);
export const createEvent     = (data)   => api.post('/events', data);
export const updateEvent     = (id, data) => api.put(`/events/${id}`, data);
export const deleteEvent     = (id)     => api.delete(`/events/${id}`);
export const registerEvent   = (id)     => api.post(`/events/${id}/register`);
export const unregisterEvent = (id)     => api.delete(`/events/${id}/register`);

export const scanQREntry = (data) => api.post('/entries/scan', data);
export const getMyEntries = (params) => api.get('/entries/my', { params });
export const getVenueEntries = (venueId, params) => api.get(`/entries/venue/${venueId}`, { params });
export const uploadBill = (entryId, data) => api.post(`/entries/${entryId}/bills`, data);
export const approveBill = (entryId, billId, data) => api.patch(`/entries/${entryId}/bills/${billId}`, data);

export const createPaymentOrder = (data) => api.post('/payments/create-order', data);
export const verifyPayment = (data) => api.post('/payments/verify', data);

export const bootstrapAdmin = (secret) => api.post('/auth/bootstrap-admin', { secret });

export const getAdminStats = () => api.get('/admin/stats');
export const getAllUsers = (params) => api.get('/admin/users', { params });
export const updateUserRole = (userId, role) => api.patch(`/admin/users/${userId}/role`, { role });
export const getAdminVenues = (params) => api.get('/admin/venues', { params });
export const getAdminEvents = (params) => api.get('/admin/events', { params });
export const getAllBills = (params) => api.get('/admin/bills', { params });
export const getAllEntries = (params) => api.get('/admin/entries', { params });

export const getMyVenue = () => api.get('/venues/my/venue');
export const addVenueStaff = (venueId, email) => api.post(`/venues/${venueId}/staff`, { email });
export const removeVenueStaff = (venueId, email) => api.delete(`/venues/${venueId}/staff/${encodeURIComponent(email)}`);

export const submitApplication = (data) => api.post('/applications', data);
export const getMyApplication = () => api.get('/applications/mine');

export const getAdminApplications = (params) => api.get('/admin/applications', { params });
export const approveApplication = (id) => api.patch(`/admin/applications/${id}/approve`);
export const rejectApplication = (id, reason) => api.patch(`/admin/applications/${id}/reject`, { reason });

export default api;

import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const RoleRoute = ({ children, allowedRoles = [] }) => {
  const { profile } = useAuth();

  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

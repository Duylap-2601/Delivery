import { createContext, useState } from 'react';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token') || null);

  const login = (userData, accessToken) => {
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('access_token', accessToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('access_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

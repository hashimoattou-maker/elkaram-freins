import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { User, LoginCredentials } from "@/types";
import { auth as authApi } from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
}

export function useAuth() {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    let user: User | null = null;
    try {
      if (userStr) user = JSON.parse(userStr);
    } catch {
      localStorage.removeItem("user");
    }
    return {
      token,
      user,
      isAuthenticated: !!token && !!user,
      isAdmin: user?.role === "admin",
      loading: false,
    };
  });

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const response = await authApi.login(credentials);
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
        setState({
          user: response.user,
          token: response.token,
          isAuthenticated: true,
          isAdmin: response.user.role === "admin",
          loading: false,
        });
        navigate("/");
      } catch (error) {
        setState((s) => ({ ...s, loading: false }));
        throw error;
      }
    },
    [navigate]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      loading: false,
    });
    navigate("/login");
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authApi.getMe();
      localStorage.setItem("user", JSON.stringify(user));
      setState((s) => ({
        ...s,
        user,
        isAdmin: user.role === "admin",
      }));
    } catch {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    if (state.isAuthenticated) {
      refreshUser();
    }
  }, []);

  return { ...state, login, logout, refreshUser };
}

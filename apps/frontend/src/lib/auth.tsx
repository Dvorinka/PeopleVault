import * as React from "react";

import { api, apiError } from "@/lib/api";
import type { components } from "@peoplevault/api-client";

type User = components["schemas"]["User"];
type UserSettings = components["schemas"]["UserSettings"];

interface AuthContextValue {
  user: User | null;
  settings: UserSettings | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  updateSettings: (settings: UserSettings) => Promise<void>;
  markOnboarded: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined
);

const DEFAULT_SETTINGS: UserSettings = {
  namedayCountry: "CZ",
  theme: "system",
  defaultReminderLeadDays: 7,
  onboarded: false,
};

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [user, setUser] = React.useState<User | null>(null);
  const [settings, setSettings] = React.useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshUser = React.useCallback(async () => {
    try {
      const { data, error } = await api.GET("/auth/me");
      if (error || !data) {
        setUser(null);
        return;
      }
      setUser(data);
    } catch {
      setUser(null);
    }
  }, []);

  const refreshSettings = React.useCallback(async () => {
    try {
      const { data, error } = await api.GET("/users/me/settings");
      if (error || !data) {
        setSettings(null);
        return;
      }
      setSettings(data);
    } catch {
      setSettings(null);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    (async () => {
      await refreshUser();
      if (active) setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshUser]);

  const login = React.useCallback(
    async (email: string, password: string, rememberMe = false) => {
      const { data, error } = await api.POST("/auth/login", {
        body: { email, password, rememberMe },
      });
      if (error || !data) {
        throw new Error(apiError(error));
      }
      setUser(data);
      await refreshSettings();
    },
    [refreshSettings]
  );

  const register = React.useCallback(
    async (email: string, password: string, name?: string) => {
      const { data, error } = await api.POST("/auth/register", {
        body: { email, password, name },
      });
      if (error || !data) {
        throw new Error(apiError(error));
      }
      setUser(data);
    },
    []
  );

  const logout = React.useCallback(async () => {
    try {
      await api.POST("/auth/logout");
    } catch {
      /* ignore */
    }
    setUser(null);
    setSettings(null);
  }, []);

  const updateSettings = React.useCallback(
    async (next: UserSettings) => {
      const { data, error } = await api.PUT("/users/me/settings", {
        body: next,
      });
      if (error || !data) {
        throw new Error(apiError(error));
      }
      setSettings(data);
    },
    []
  );

  const markOnboarded = React.useCallback(async () => {
    await updateSettings({ ...(settings ?? DEFAULT_SETTINGS), onboarded: true });
  }, [settings, updateSettings]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      settings,
      isLoading,
      isAuthenticated: user !== null,
      isOnboarded: settings?.onboarded === true,
      login,
      register,
      logout,
      refreshUser,
      refreshSettings,
      updateSettings,
      markOnboarded,
    }),
    [
      user,
      settings,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
      refreshSettings,
      updateSettings,
      markOnboarded,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

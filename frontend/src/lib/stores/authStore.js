import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null, // { id, email, full_name, role, username }
      setSession: (accessToken, refreshToken, user) => 
        set({ accessToken, refreshToken, user }),
      clearSession: () => {
        if (typeof document !== 'undefined') {
          document.cookie = 'timesheet_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
          document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        }
        set({ accessToken: null, refreshToken: null, user: null });
      },
    }),
    {
      name: 'timesheet-auth-storage', // unique name
    }
  )
);

export default useAuthStore;


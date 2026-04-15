import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { Profile, Location, MemberType } from '../types/database';

interface AppState {
  session: Session | null;
  profile: Profile | null;
  activeLocation: Location | null;
  memberType: MemberType | null;
  isLoading: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setActiveLocation: (location: Location | null) => void;
  setMemberType: (type: MemberType | null) => void;
  setIsLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  session: null,
  profile: null,
  activeLocation: null,
  memberType: null,
  isLoading: true,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setActiveLocation: (location) => set({ activeLocation: location }),
  setMemberType: (type) => set({ memberType: type }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  reset: () =>
    set({
      session: null,
      profile: null,
      activeLocation: null,
      memberType: null,
      isLoading: false,
    }),
}));

import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { Profile, Location, MemberType } from '../types/database';

interface AppState {
  session: Session | null;
  profile: Profile | null;
  activeLocation: Location | null;
  allLocations: Location[];
  memberType: MemberType | null;
  isLoading: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setActiveLocation: (location: Location | null) => void;
  setAllLocations: (locations: Location[]) => void;
  setMemberType: (type: MemberType | null) => void;
  setIsLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  session: null,
  profile: null,
  activeLocation: null,
  allLocations: [],
  memberType: null,
  isLoading: true,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setActiveLocation: (location) => set({ activeLocation: location }),
  setAllLocations: (locations) => set({ allLocations: locations }),
  setMemberType: (type) => set({ memberType: type }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  reset: () =>
    set({
      session: null,
      profile: null,
      activeLocation: null,
      allLocations: [],
      memberType: null,
      isLoading: false,
    }),
}));

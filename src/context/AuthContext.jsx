/**
 * src/context/AuthContext.jsx
 * Full, robust Authentication Context handling:
 * - Session bootstrap & auto token refresh
 * - Database profile synchronization (Full Name, Role, Avatar)
 * - Sign in, Sign up (with metadata), and Sign out
 * - Real-time profile state caching
 */
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({
  user: null,
  profile: null,
  session: null,
  loading: true,
  isAdmin: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {}
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch user's profile record from public.profiles
  const fetchProfile = async (userId, userEmail = '', userMeta = {}) => {
    if (!userId) {
      setProfile(null);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[AuthContext] Error retrieving profile:', error.message);
      }

      if (data) {
        setProfile(data);
        return data;
      }

      // Fallback: If DB trigger hasn't fired yet, create or use metadata
      const fallbackProfile = {
        id: userId,
        email: userEmail,
        full_name: userMeta?.full_name || 'Student Candidate',
        role: userMeta?.role || 'student',
        avatar_url: userMeta?.avatar_url || null
      };

      // Try inserting into profiles table if missing
      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .upsert(fallbackProfile)
        .select()
        .maybeSingle();

      if (!insertError && inserted) {
        setProfile(inserted);
        return inserted;
      }

      setProfile(fallbackProfile);
      return fallbackProfile;
    } catch (err) {
      console.error('[AuthContext] Unexpected profile error:', err);
      return null;
    }
  };

  // 2. Initialize and monitor Supabase Auth state changes
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);

          if (initialSession?.user) {
            await fetchProfile(
              initialSession.user.id,
              initialSession.user.email,
              initialSession.user.user_metadata
            );
          }
        }
      } catch (err) {
        console.error('[AuthContext] Session init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // Listen for Auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchProfile(
          newSession.user.id,
          newSession.user.email,
          newSession.user.user_metadata
        );
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // 3. Auth Actions
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error) throw error;

      if (data?.user) {
        await fetchProfile(data.user.id, data.user.email, data.user.user_metadata);
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, fullName, role = 'student') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: role
          }
        }
      });
      if (error) throw error;

      if (data?.user) {
        await fetchProfile(data.user.id, data.user.email, { full_name: fullName, role });
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (error) {
      console.error('[AuthContext] SignOut error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      return await fetchProfile(user.id, user.email, user.user_metadata);
    }
  };

  const isAdmin = useMemo(() => profile?.role === 'admin', [profile]);

  const value = {
    user,
    session,
    profile,
    isAdmin,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
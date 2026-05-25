import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// 1. Update tipe data kembalian agar bisa mengirim pesan sukses
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null; success?: boolean; message?: string }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null; success?: boolean }>;
  signInWithGoogle: () => Promise<{ error: string | null }>; 
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Modifikasi signUp dengan emailRedirectTo
  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        // Arahkan kembali ke halaman auth setelah klik link di email
        emailRedirectTo: `${window.location.origin}/auth`,
      }
    });
    
    if (error) return { error: error.message };
    
    return { 
      error: null, 
      success: true, 
      message: "Berhasil! Silakan cek kotak masuk email Anda untuk melakukan verifikasi sebelum login." 
    };
  };

  // 3. Modifikasi signIn untuk menangkap error belum verifikasi
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      // Tangkap error khusus dari Supabase jika user belum klik link di email
      if (error.message.includes("Email not confirmed")) {
        return { error: "Email belum diverifikasi. Silakan cek kotak masuk atau folder spam email Anda." };
      }
      return { error: error.message };
    }
    
    return { error: null, success: true };
  };

  // Fungsi khusus untuk Google Login
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Otomatis deteksi localhost atau domain saat produksi
        redirectTo: `${window.location.origin}/dashboard`, 
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
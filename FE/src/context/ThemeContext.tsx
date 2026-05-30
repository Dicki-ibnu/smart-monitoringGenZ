import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeType = 'default' | 'hellokitty' | 'sunset' | 'galaxy' | 'sultan' | 'diamond';

export interface ThemeStyles {
  text: string;
  bg: string;
  border: string;
  solidBg: string;
  solidText: string;
  glow: string;
  activeBorder: string;
  logoGlow: string;
  // TAMBAHAN CAT TEMBOK BACKGROUND 🎨
  mainBg: string;
  sidebarBg: string;
  headerBg: string;
}

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  activeStyle: ThemeStyles;
  isLight: boolean;
}

const THEME_STYLES: Record<ThemeType, ThemeStyles> = {
  hellokitty: { text: 'text-pink-500', bg: 'bg-pink-100', border: 'border-pink-200', solidBg: 'bg-pink-500', solidText: 'text-white', glow: 'shadow-[0_0_15px_rgba(244,114,182,0.3)]', activeBorder: 'border-pink-400', logoGlow: 'shadow-pink-500/20', 
    mainBg: 'bg-[#FFF0F5]', sidebarBg: 'bg-white', headerBg: 'bg-[#FFF0F5]/80' },
  sunset: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', solidBg: 'bg-orange-500', solidText: 'text-white', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.3)]', activeBorder: 'border-orange-500/50', logoGlow: 'shadow-orange-500/20', 
    mainBg: 'bg-[#1c1210]', sidebarBg: 'bg-[#291b17]', headerBg: 'bg-[#1c1210]/90' }, // Coklat gelap eksotis
  galaxy: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', solidBg: 'bg-indigo-500', solidText: 'text-white', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.3)]', activeBorder: 'border-indigo-500/50', logoGlow: 'shadow-indigo-500/20', 
    mainBg: 'bg-[#0b1021]', sidebarBg: 'bg-[#121936]', headerBg: 'bg-[#0b1021]/90' }, // Biru dongker pekat
  sultan: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', solidBg: 'bg-amber-500', solidText: 'text-slate-900', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]', activeBorder: 'border-amber-500/50', logoGlow: 'shadow-amber-500/20', 
    mainBg: 'bg-[#14120c]', sidebarBg: 'bg-[#1f1b11]', headerBg: 'bg-[#14120c]/90' }, // Hitam keemasan
  diamond: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', solidBg: 'bg-cyan-400', solidText: 'text-slate-900', glow: 'shadow-[0_0_15px_rgba(34,211,238,0.3)]', activeBorder: 'border-cyan-400/50', logoGlow: 'shadow-cyan-500/20', 
    mainBg: 'bg-[#08131a]', sidebarBg: 'bg-[#0d1e29]', headerBg: 'bg-[#08131a]/90' }, // Biru es gelap
  default: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', solidBg: 'bg-emerald-500', solidText: 'text-slate-900', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]', activeBorder: 'border-emerald-500/50', logoGlow: 'shadow-emerald-500/20', 
    mainBg: 'bg-slate-950', sidebarBg: 'bg-slate-900', headerBg: 'bg-slate-950/80' }
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    return (localStorage.getItem('app-theme') as ThemeType) || 'default';
  });

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
  };

  useEffect(() => {
    const body = document.body;
    body.className = body.className.replace(/\btheme-\S+/g, '');
    body.classList.add(`theme-${theme}`);
    
    // Sinkronkan background bawaan HTML dengan tema biar ga ada garis putih pas di-scroll
    const style = THEME_STYLES[theme] || THEME_STYLES.default;
    // Mengambil kode hex asli dari string class jika memungkinkan
    const bgMatch = style.mainBg.match(/bg-\[(#[a-fA-F0-9]+)\]/);
    if (bgMatch) body.style.backgroundColor = bgMatch[1];
    else if (theme === 'hellokitty') body.style.backgroundColor = '#FFF0F5';
    else body.style.backgroundColor = '#020617'; 
  }, [theme]);

  const isLight = theme === 'hellokitty';
  const activeStyle = THEME_STYLES[theme] || THEME_STYLES.default;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, activeStyle, isLight }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
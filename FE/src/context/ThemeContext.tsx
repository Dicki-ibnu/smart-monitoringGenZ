import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeType = 'default' | 'hellokitty' | 'ocean' | 'anime';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Ambil tema yang terakhir disimpan, jika tidak ada pakai 'default'
  const [theme, setThemeState] = useState<ThemeType>(() => {
    return (localStorage.getItem('app-theme') as ThemeType) || 'default';
  });

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
  };

  useEffect(() => {
    // Menghapus semua class tema lama dan memasang yang baru di body
    const body = document.body;
    body.classList.remove('theme-default', 'theme-hellokitty', 'theme-ocean', 'theme-anime');
    body.classList.add(`theme-${theme}`);
    
    // Pastikan warna latar belakang body juga mengikuti tema
    if (theme === 'hellokitty') body.style.backgroundColor = '#FFF0F5';
    else if (theme === 'ocean') body.style.backgroundColor = '#0B132B';
    else if (theme === 'anime') body.style.backgroundColor = '#1a0033';
    else body.style.backgroundColor = '#020617'; // slate-950
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
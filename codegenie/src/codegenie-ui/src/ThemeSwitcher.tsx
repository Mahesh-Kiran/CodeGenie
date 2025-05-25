import React, { useEffect, useState } from 'react';
import { MdOutlineDarkMode } from "react-icons/md";
import { FaRegLightbulb } from "react-icons/fa";

type Theme = 'dark' | 'light';

const ThemeSwitcher: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    return saved || 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-btn"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? <FaRegLightbulb size={22} /> : <MdOutlineDarkMode size={22} />}
    </button>
  );
};

export default ThemeSwitcher;

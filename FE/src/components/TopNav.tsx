import React from 'react';
import { Bell, Search, Moon, Sun, LogOut, ShieldCheck } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import keycloak from '../keycloak';

export function TopNav() {
  const { theme, setTheme } = useTheme();

  const username = keycloak.tokenParsed?.name || keycloak.tokenParsed?.preferred_username || 'Test User';
  const email = keycloak.tokenParsed?.email || 'testuser@carsales.com';
  const initials = username.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'TU';

  const handleLogout = () => {
    keycloak.logout({ redirectUri: window.location.origin });
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shadow-sm z-10">
      <div className="flex items-center flex-1">
        <div className="relative w-64 md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search vehicles, sales, suppliers..."
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        
        <button className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="Notifications">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Keycloak User Profile & Logout */}
        <div className="flex items-center space-x-3 pl-3 border-l border-border">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {initials}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">{username}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5 text-blue-500" /> Keycloak User
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors ml-1"
            title="Sign Out via Keycloak"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}


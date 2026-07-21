import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, Moon, Sun, LogOut, ShieldCheck, ChevronDown, ExternalLink, Globe, User, Settings } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import keycloak from '../keycloak';

export function TopNav() {
  const { theme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const username = keycloak.tokenParsed?.name || keycloak.tokenParsed?.preferred_username || 'Test User';
  const email = keycloak.tokenParsed?.email || 'testuser@carsales.com';
  const initials = username.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'TU';

  const handleLogout = () => {
    keycloak.logout({ redirectUri: window.location.origin });
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shadow-sm z-20 relative">
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

        {/* Keycloak User Profile Dropdown */}
        <div className="relative pl-3 border-l border-border" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {initials}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">{username}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5 text-blue-500" /> Keycloak User
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-card border border-border shadow-xl py-2 z-50 animate-in fade-in-50 zoom-in-95">
              {/* Profile Header */}
              <div className="px-4 py-3 border-b border-border space-y-1">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{username}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{email}</p>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-mono font-medium">
                  Realm: carsales-realm
                </div>
              </div>

              {/* Menu Links */}
              <div className="py-1 text-xs">
                <a
                  href="/keycloak-portal.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" /> Custom Keycloak HTML Portal
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>

                <a
                  href="http://localhost:8080/realms/carsales-realm/account/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-500" /> Keycloak Account Console
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>

                <a
                  href="http://localhost:8080"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-emerald-500" /> Keycloak Admin Console
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>

              {/* Logout Section */}
              <div className="pt-1 border-t border-border">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors font-medium text-left"
                >
                  <LogOut className="w-4 h-4" /> Sign Out via Keycloak
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}



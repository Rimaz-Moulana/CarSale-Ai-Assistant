import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Car, 
  FileText, 
  Users, 
  Truck, 
  PackageSearch, 
  ClipboardList, 
  PieChart, 
  LineChart, 
  Image,
  Bot, 
  Settings,
  LogOut
} from 'lucide-react';
import { cn } from './ui/Card';
import keycloak from '../keycloak';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Cars', path: '/cars', icon: Car },
  { name: 'Sales', path: '/sales', icon: FileText },
  { name: 'Customers', path: '/customers', icon: Users },
  { name: 'Suppliers', path: '/suppliers', icon: Truck },
  { name: 'Procurement', path: '/procurement', icon: PackageSearch },
  { name: 'Inventory', path: '/inventory', icon: ClipboardList },
  { name: 'Finance', path: '/finance', icon: PieChart },
  { name: 'Reports', path: '/reports', icon: LineChart },
  { name: 'Image Verification', path: '/verification', icon: Image },
  { name: 'CEO AI Assistant', path: '/ai-assistant', icon: Bot },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-border hidden md:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-border bg-slate-900 text-white">
        <Car className="w-6 h-6 mr-3 text-blue-500" />
        <h1 className="text-xl font-bold tracking-tight">AutoAdmin</h1>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-sidebar-foreground hover:bg-slate-800 hover:text-white"
                  )
                }
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-border/50">
        <button
          onClick={() => keycloak.logout()}
          className="flex items-center w-full px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
      <div className="p-4 border-t border-border/50 text-xs text-center text-slate-500">
        &copy; 2026 AutoAdmin Inc.
      </div>
    </aside>
  );
}

import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeNames: Record<string, string> = {
  '': 'Dashboard',
  'cars': 'Cars',
  'sales': 'Sales',
  'procurement': 'Procurement',
  'inventory': 'Inventory',
  'finance': 'Finance',
  'reports': 'Reports',
  'ai-assistant': 'CEO AI Assistant'
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav className="flex items-center space-x-1 text-sm text-slate-500 mb-4" aria-label="Breadcrumb">
      <Link to="/" className="flex items-center hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
        <Home className="w-4 h-4" />
        <span className="sr-only">Home</span>
      </Link>
      
      {pathnames.length > 0 && (
        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
      )}

      {pathnames.map((value, index) => {
        const isLast = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const name = routeNames[value] || value;

        return (
          <React.Fragment key={to}>
            {isLast ? (
              <span className="font-medium text-slate-900 dark:text-slate-100" aria-current="page">
                {name}
              </span>
            ) : (
              <>
                <Link to={to} className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {name}
                </Link>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

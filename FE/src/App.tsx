import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Cars } from '@/pages/Cars';
import { Sales } from '@/pages/Sales';
import { Procurement } from '@/pages/Procurement';
import { Inventory } from '@/pages/Inventory';
import { Finance } from '@/pages/Finance';
import { Assistant } from '@/pages/Assistant';
import { Reports } from '@/pages/Reports';
import { NotFound } from '@/pages/NotFound';
import { Login } from '@/pages/Login';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from 'sonner';

interface AppProps {
  authenticated: boolean;
  keycloakError?: boolean;
}

function App({ authenticated }: AppProps) {
  if (!authenticated) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <Login />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="cars" element={<Cars />} />
                <Route path="sales" element={<Sales />} />
                <Route path="procurement" element={<Procurement />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="finance" element={<Finance />} />
                <Route path="reports" element={<Reports />} />
                <Route path="ai-assistant" element={<Assistant />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
        <Toaster position="top-right" richColors theme="system" />
    </ThemeProvider>
  );
}

export default App;


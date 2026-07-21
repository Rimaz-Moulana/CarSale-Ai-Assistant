import React, { useState } from 'react';
import { 
  Car, 
  ShieldCheck, 
  Bot, 
  BarChart3, 
  ArrowRight, 
  Lock, 
  CheckCircle2, 
  ExternalLink,
  Sparkles,
  Database,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import keycloak from '@/keycloak';
import { motion } from 'framer-motion';

export function Login() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleLogin = () => {
    setIsRedirecting(true);
    keycloak.login({ redirectUri: window.location.origin });
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-950 text-slate-100 relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="w-full border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Car className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
              CarSale AI <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">Enterprise</span>
            </h1>
            <p className="text-xs text-slate-400">Intelligent Dealership OS</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Keycloak SSO Active
          </span>
          <a
            href="http://localhost:8080"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors px-3 py-1 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/50"
          >
            Keycloak Admin <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 flex flex-col lg:flex-row items-center justify-between gap-12 z-10">
        {/* Left Column - Showcase & Value Prop */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 space-y-8 text-left max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-blue-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" /> Next-Generation Dealership Management
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
            Unified Car Sales Management & <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">AI Intelligence</span>
          </h1>

          <p className="text-slate-400 text-base leading-relaxed">
            Manage inventory, track sales pipelines, automate purchase orders, analyze financials, and chat with an AI copilot—all secured by enterprise Keycloak Single Sign-On.
          </p>

          {/* Key Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-slate-200">Smart Vehicle Inventory</h3>
              <p className="text-xs text-slate-400">Real-time stock levels, pricing, VIN lookup, and status tracking.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-slate-200">AI Sales Copilot</h3>
              <p className="text-xs text-slate-400">Natural language querying powered by local Ollama AI models.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-slate-200">Financial Insights</h3>
              <p className="text-xs text-slate-400">Automated revenue vs. expense metrics and cash flow charts.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-slate-200">Keycloak Identity SSO</h3>
              <p className="text-xs text-slate-400">OAuth2 & OpenID Connect standard security for dealership staff.</p>
            </div>
          </div>
        </motion.div>

        {/* Right Column - Login Portal Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="relative p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-6">
            <div className="absolute top-0 right-0 left-0 h-1 rounded-t-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

            <div className="text-center space-y-2 pt-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Lock className="w-6 h-6 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Portal Authentication</h2>
              <p className="text-slate-400 text-sm">
                Sign in using your Keycloak dealership credentials to access CarSale AI.
              </p>
            </div>

            {/* Primary Action Button */}
            <div className="space-y-4 pt-2">
              <Button
                onClick={handleLogin}
                disabled={isRedirecting}
                className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 group transition-all duration-200"
              >
                {isRedirecting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting to Keycloak...
                  </span>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-blue-200" />
                    <span>Sign In via Keycloak Portal</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>

            {/* Realm & Test Credentials Box */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-2.5">
              <div className="flex items-center justify-between font-semibold text-slate-300 pb-1 border-b border-slate-800">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <Building2 className="w-3.5 h-3.5" /> Keycloak Environment Info
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Dev Mode</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-400 font-mono text-[11px]">
                <div><span className="text-slate-500">Realm:</span> carsales-realm</div>
                <div><span className="text-slate-500">Client:</span> cars-sale</div>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <p className="text-[11px] font-semibold text-slate-300">Quick Test Credentials:</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Username: <code className="text-blue-300 font-bold">testuser</code></span>
                  <span>Password: <code className="text-blue-300 font-bold">password</code></span>
                </div>
              </div>
            </div>

            {/* Features Check Bullet points */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Encrypted OAuth2 / OIDC Token Handshake</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Automatic JWT Bearer Token Propagation to ASP.NET Core</span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/60 bg-slate-950/80 backdrop-blur-md px-6 py-4 text-center text-xs text-slate-500 z-10">
        <p>© 2026 CarSale AI Assistant Systems • Secured by Keycloak Identity Server 24.0.1</p>
      </footer>
    </div>
  );
}

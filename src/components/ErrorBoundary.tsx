import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2, Home } from "lucide-react";
import { analytics } from "../lib/analytics";
import { storage } from "../lib/storage";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log crash to centralized analytics service
    analytics.logError(error, {
      componentStack: errorInfo.componentStack,
      location: window.location.href,
    });
  }

  private handleResetAndReload = () => {
    try {
      // Clear settings and cached times
      storage.clearAllCachedPrayerData();
      storage.removeItem("waktu-solat-settings");
      storage.removeItem("waktu-solat-zone");
      storage.removeItem("waktu-solat-recent-zones");
      
      // Reload page
      window.location.reload();
    } catch (e) {
      window.location.href = "/";
    }
  };

  private handleReloadOnly = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 font-sans selection:bg-teal-500/30">
          {/* Visual dynamic gradient circles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[20%] left-[30%] w-[350px] h-[350px] bg-teal-500/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-[20%] right-[30%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10 w-full max-w-xl p-8 rounded-[32px] bg-slate-900/60 border border-slate-800/40 backdrop-blur-2xl shadow-2xl flex flex-col items-center text-center">
            {/* Warning Icon Badge */}
            <div className="w-16 h-16 rounded-[24px] bg-rose-500/15 text-rose-400 flex items-center justify-center mb-6 ring-4 ring-rose-500/5 animate-pulse">
              <AlertTriangle size={32} className="stroke-[2]" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-100 mb-2">
              Sesuatu tidak kena
            </h1>
            <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
              Aplikasi mengalami ralat rendering tidak dijangka. Anda boleh memulihkan semula data cache atau memuat semula sistem di bawah.
            </p>

            {/* Error Message Collapse */}
            {this.state.error && (
              <div className="w-full text-left bg-slate-950/80 rounded-2xl p-4 mb-8 border border-slate-900 text-xs font-mono overflow-auto max-h-[140px] no-scrollbar select-text text-slate-500">
                <span className="text-rose-400 font-bold block mb-1">Ralat:</span>
                {this.state.error.message}
                {this.state.error.stack && (
                  <span className="block mt-2 opacity-50 text-[10px] leading-relaxed">
                    {this.state.error.stack.split("\n").slice(0, 3).join("\n")}
                  </span>
                )}
              </div>
            )}

            {/* Interactive Recover buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full shrink-0">
              <button
                onClick={this.handleReloadOnly}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-teal-500 text-slate-950 hover:bg-teal-400 font-bold text-sm shadow-lg hover:shadow-teal-500/20 active:scale-98 transition-all pointer-events-auto cursor-pointer"
              >
                <RefreshCw size={16} className="animate-spin-slow stroke-[2.5]" />
                Muat Semula
              </button>
              
              <button
                onClick={this.handleResetAndReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold text-sm border border-slate-700/50 hover:border-slate-600 active:scale-98 transition-all pointer-events-auto cursor-pointer"
              >
                <Trash2 size={16} className="stroke-[2.5]" />
                Padam Cache & Pulihkan
              </button>
            </div>

            <button
              onClick={() => { window.location.href = "/"; }}
              className="mt-6 text-xs font-medium text-slate-500 hover:text-slate-350 inline-flex items-center gap-1 transition-colors"
            >
              <Home size={12} />
              Kembali ke Laman Utama
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

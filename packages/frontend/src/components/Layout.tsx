import '@/styles/globals.css';
import { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="border-b border-quack-dark border-opacity-10 bg-white shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/quack_icon.svg" alt="Quack" className="w-10 h-10" />
              <div>
                <h1 className="text-xl font-bold text-quack-dark uppercase tracking-widest">
                  Quack
                </h1>
              </div>
            </div>
            <nav className="flex gap-4">
              <Link
                to="/"
                className="text-sm text-quack-dark text-opacity-70 hover:text-opacity-100"
                activeProps={{ className: 'text-quack-orange font-semibold' }}
              >
                Home
              </Link>
              <Link
                to="/explorer"
                className="text-sm text-quack-dark text-opacity-70 hover:text-opacity-100"
                activeProps={{ className: 'text-quack-orange font-semibold' }}
              >
                Explorer
              </Link>
              <Link
                to="/workspace"
                className="text-sm text-quack-dark text-opacity-70 hover:text-opacity-100"
                activeProps={{ className: 'text-quack-orange font-semibold' }}
              >
                Workspace
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

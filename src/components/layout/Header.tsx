import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { logout } from '@/services/auth';
import { 
  Home, 
  Users, 
  Trophy, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const Header: React.FC = () => {
  const { user, hasRole } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Tableau de bord', href: '/', icon: Home },
    { name: 'Joueurs', href: '/players', icon: Users },
    { name: 'Nouveau Match', href: '/new-match', icon: Trophy, roles: ['admin', 'scorer'] },
    { name: 'Classements', href: '/leaderboards', icon: BarChart3 },
    { name: 'Paramètres', href: '/settings', icon: Settings, roles: ['admin'] },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const canAccess = (roles?: string[]) => {
    if (!roles) return true;
    return roles.some(role => hasRole(role as any));
  };

  return (
    <header className="bg-slate-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-green-500 rounded-full flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Snooker Pro</span>
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex space-x-1">
            {navigation
              .filter(item => canAccess(item.roles))
              .map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user && (
              <div className="hidden md:flex items-center space-x-2 text-sm">
                <span className="text-slate-300">Bonjour,</span>
                <span className="font-medium">{user.displayName}</span>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hidden md:flex items-center space-x-1 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4" />
              <span>Déconnexion</span>
            </Button>

            {/* Menu Mobile Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Navigation Mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800">
            <nav className="flex flex-col space-y-2">
              {navigation
                .filter(item => canAccess(item.roles))
                .map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-slate-800 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              
              {user && (
                <div className="px-3 py-2 border-t border-slate-800 mt-2">
                  <div className="text-sm text-slate-300 mb-2">
                    Bonjour, {user.displayName}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-slate-300 hover:text-white hover:bg-slate-800 w-full justify-start"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Déconnexion</span>
                  </Button>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
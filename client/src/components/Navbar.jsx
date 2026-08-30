import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, User, LayoutDashboard, Activity } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : { name: 'Developer', email: '' };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-md-background/85 backdrop-blur-md border-b border-md-surface-container-low/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-6">
            <Link 
              to="/" 
              className="flex items-center space-x-2 md-transition md-active-press text-md-primary hover:opacity-90"
            >
              <Activity className="h-6 w-6 stroke-[2.5]" />
              <span className="font-bold text-lg tracking-tight text-md-on-surface">API Observability</span>
            </Link>
            
            <Link 
              to="/" 
              className="px-4 py-2 text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-primary/10 rounded-full md-transition md-active-press flex items-center space-x-1.5 text-sm font-medium"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-md-surface-container px-3 py-1.5 rounded-full border border-md-outline/10">
              <div className="bg-md-secondary-container text-md-on-secondary-container p-1 rounded-full">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="text-left text-xs pr-1">
                <p className="font-semibold text-md-on-surface leading-none">{user.name}</p>
                <p className="text-[10px] text-md-on-surface-variant leading-none mt-0.5">{user.email}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="text-md-on-surface-variant hover:text-md-primary p-2 rounded-full hover:bg-md-primary/10 md-transition md-active-press flex items-center space-x-1.5 text-sm font-medium border border-transparent"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

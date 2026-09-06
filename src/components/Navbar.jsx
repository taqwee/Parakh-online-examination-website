/**
 * src/components/Navbar.jsx
 * PARAKH - Clean Header & Navigation
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Award, LogOut, Shield, ChevronDown, User, LayoutDashboard, Settings } from 'lucide-react';

export const Navbar = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isAdmin = profile?.role === 'admin';
  const isInAdminPanel = location.pathname.startsWith('/admin');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 bg-slate-900 group-hover:bg-indigo-600 transition text-white rounded-xl flex items-center justify-center shadow-sm">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-base leading-tight block tracking-tight">PARAKH</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Online Assessment Portal</span>
          </div>
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              to={isInAdminPanel ? '/dashboard' : '/admin'}
              className={`hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                isInAdminPanel
                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              {isInAdminPanel ? (
                <>
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Student View
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  Admin Studio
                </>
              )}
            </Link>
          )}

          {/* User Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition border border-slate-200"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div className="text-left hidden md:block leading-tight">
                <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{profile?.full_name || 'Account'}</p>
                <p className="text-[10px] text-slate-400 font-medium capitalize">{profile?.role || 'Student'}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 text-xs z-50">
                <div className="px-3.5 py-2.5 border-b border-slate-100">
                  <p className="font-bold text-slate-800">{profile?.full_name || 'Candidate'}</p>
                  <p className="text-[11px] text-slate-400 truncate">{profile?.email}</p>
                  <span className={`inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    isAdmin ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isAdmin ? 'System Administrator' : 'Candidate'}
                  </span>
                </div>

                <div className="py-1">
                  {isAdmin && (
                    <Link
                      to={isInAdminPanel ? '/dashboard' : '/admin'}
                      onClick={() => setDropdownOpen(false)}
                      className="w-full px-3.5 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition font-medium"
                    >
                      {isInAdminPanel ? (
                        <>
                          <LayoutDashboard className="w-4 h-4 text-slate-400" />
                          <span>Switch to Student Dashboard</span>
                        </>
                      ) : (
                        <>
                          <Settings className="w-4 h-4 text-indigo-600" />
                          <span>Open Admin Studio</span>
                        </>
                      )}
                    </Link>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-3.5 py-2 flex items-center gap-2 text-red-600 hover:bg-red-50 transition font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

export default Navbar;
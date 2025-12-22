"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";

export default function UserNav() {
  const { data: session, status } = useSession();
  const { hasAccess, isAdmin, isHR, loading: permLoading } = usePermissions();
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 288;
      const viewportWidth = window.innerWidth;
      const padding = 12;
      let rightPos = viewportWidth - rect.right;
      if (viewportWidth - rightPos - dropdownWidth < padding) {
        rightPos = viewportWidth - dropdownWidth - padding;
      }
      setDropdownPosition({ top: rect.bottom + 8, right: Math.max(padding, rightPos) });
    }
  }, [showDropdown]);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return;
      setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  useEffect(() => {
    if (!showDropdown) return;
    const handleScroll = (e) => {
      if (dropdownRef.current?.contains(e.target)) return;
      setShowDropdown(false);
    };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", () => setShowDropdown(false));
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", () => setShowDropdown(false));
    };
  }, [showDropdown]);

  if (status === "loading") {
    return <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>;
  }
  if (!session) return null;

  const user = session.user;
  const initials = user.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??";

  const gradients = ["from-blue-500 to-indigo-600", "from-emerald-500 to-teal-600", "from-orange-500 to-red-600", "from-purple-500 to-pink-600", "from-cyan-500 to-blue-600"];
  const avatarGradient = gradients[user.name?.charCodeAt(0) % gradients.length || 0];

  const roleColors = {
    admin: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30",
    hr: "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30",
    manager: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
    employee: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
  };

  // Menu items with module mapping
  const menuItems = [
    { href: "/profile", label: "My Profile", desc: "View and edit profile", icon: "👤", bg: "bg-blue-100 dark:bg-blue-500/20", alwaysShow: true },
    { href: "/timesheet", label: "Time Sheet", desc: "Punch-IN/OUT", icon: "⏱️", bg: "bg-orange-100 dark:bg-orange-500/20", module: "timesheet" },
    { href: "/leave", label: "Leave", desc: "Apply & manage leaves", icon: "🏖️", bg: "bg-cyan-100 dark:bg-cyan-500/20", module: "leave" },
    { href: "/shifts", label: "Shifts", desc: "View shift schedules", icon: "🕐", bg: "bg-indigo-100 dark:bg-indigo-500/20", module: "shifts" },
    { href: "/notifications", label: "Notifications", desc: "View notifications", icon: "🔔", bg: "bg-yellow-100 dark:bg-yellow-500/20", module: "notifications" },
    { href: "/team", label: "Team Dashboard", desc: "Manage your team", icon: "👥", bg: "bg-amber-100 dark:bg-amber-500/20", module: "team" },
    { href: "/analytics", label: "Analytics", desc: "Reports & analytics", icon: "📊", bg: "bg-purple-100 dark:bg-purple-500/20", module: "analytics" },
    { href: "/payroll", label: "Payroll", desc: "View payroll details", icon: "💰", bg: "bg-emerald-100 dark:bg-emerald-500/20", module: "payroll" },
    { href: "/admin", label: "Admin Dashboard", desc: "Manage users & settings", icon: "⚙️", bg: "bg-red-100 dark:bg-red-500/20", module: "admin" },
  ];

  // Filter visible items based on permissions
  const visibleItems = menuItems.filter(item => {
    if (item.alwaysShow) return true;
    if (isAdmin || isHR) return true;
    return item.module && hasAccess(item.module);
  });

  const Dropdown = () => (
    <div ref={dropdownRef} className="fixed w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col" style={{ top: dropdownPosition.top, right: dropdownPosition.right, zIndex: 99999, maxHeight: "calc(100vh - 100px)" }}>
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-750 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 bg-gradient-to-br ${avatarGradient} rounded-xl flex items-center justify-center text-white font-bold shadow-lg`}>{initials}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
        <div className="mt-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${roleColors[user.role] || roleColors.employee}`}>
            {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
          </span>
        </div>
      </div>

      {/* Menu */}
      <div className="flex-1 overflow-y-auto p-2">
        {permLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          visibleItems.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setShowDropdown(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors">
              <div className={`w-8 h-8 ${item.bg} rounded-lg flex items-center justify-center text-lg`}>{item.icon}</div>
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
            </Link>
          ))
        )}
        {visibleItems.length <= 1 && !permLoading && (
          <div className="text-center py-4 px-3">
            <p className="text-sm text-slate-500">No pages assigned.</p>
            <p className="text-xs text-slate-400 mt-1">Contact admin for access.</p>
          </div>
        )}
      </div>

      {/* Sign Out */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <button onClick={() => { setShowDropdown(false); signOut({ callbackUrl: "/login" }); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </div>
          <div className="text-left">
            <p className="font-medium">Sign Out</p>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button ref={buttonRef} onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br ${avatarGradient} rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-lg`}>{initials}</div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[120px]">{user.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{user.email}</p>
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {mounted && showDropdown && createPortal(<><div className="fixed inset-0" style={{ zIndex: 99998 }} onClick={() => setShowDropdown(false)} /><Dropdown /></>, document.body)}
    </>
  );
}
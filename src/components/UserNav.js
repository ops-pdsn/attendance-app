"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

export default function UserNav() {
  const { data: session, status } = useSession();
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    right: 0,
  });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate dropdown position when opening (mobile-safe)
  useEffect(() => {
    if (showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 288; // w-72 = 18rem = 288px
      const viewportWidth = window.innerWidth;
      const padding = 12; // Minimum padding from screen edge

      // Calculate right position
      let rightPos = viewportWidth - rect.right;

      // Check if dropdown would go off-screen on the left
      const leftEdge = viewportWidth - rightPos - dropdownWidth;

      if (leftEdge < padding) {
        // Dropdown would go off-screen, use left positioning instead
        rightPos = viewportWidth - dropdownWidth - padding;
      }

      setDropdownPosition({
        top: rect.bottom + 8,
        right: Math.max(padding, rightPos),
      });
    }
  }, [showDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  // FIX: Close dropdown on scroll OUTSIDE, but allow scroll INSIDE dropdown
  useEffect(() => {
    const handleScroll = (event) => {
      // If scrolling inside the dropdown, allow it
      if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
        return; // Don't close - user is scrolling inside dropdown
      }
      // Scrolling outside - close the dropdown
      setShowDropdown(false);
    };

    const handleResize = () => {
      setShowDropdown(false);
    };

    if (showDropdown) {
      // Use capture phase to catch all scroll events
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [showDropdown]);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
        <div className="hidden sm:block">
          <div className="w-20 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1"></div>
          <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const user = session.user;
  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  const getAvatarGradient = () => {
    const gradients = [
      "from-blue-500 to-indigo-600",
      "from-emerald-500 to-teal-600",
      "from-orange-500 to-red-600",
      "from-purple-500 to-pink-600",
      "from-cyan-500 to-blue-600",
    ];
    const index = user.name?.charCodeAt(0) % gradients.length || 0;
    return gradients[index];
  };

  const roleColors = {
    admin:
      "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30",
    hr: "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30",
    employee:
      "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
  };

  const handleSignOut = () => {
    setShowDropdown(false);
    signOut({ callbackUrl: "/login" });
  };

  const DropdownMenu = () => (
    <div
      ref={dropdownRef}
      className="fixed w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col"
      style={{
        top: dropdownPosition.top,
        right: dropdownPosition.right,
        zIndex: 99999,
        animation: "dropdownIn 0.2s ease-out",
        maxHeight: "calc(100vh - 100px)",
      }}
    >
      {/* User Header - Fixed at top */}
      <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-750 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 bg-gradient-to-br ${getAvatarGradient()} rounded-xl flex items-center justify-center text-white font-bold shadow-lg`}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white truncate">
              {user.name}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {user.email}
            </p>
          </div>
        </div>

        {/* Role & Department Badges */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${
              roleColors[user.role] || roleColors.employee
            }`}
          >
            {user.role === "admin" && (
              <svg
                className="w-3 h-3 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) ||
              "Employee"}
          </span>
          {user.department && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {user.department}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable Menu Items */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-2">
        {/* Profile Link */}
        <Link
          href="/profile"
          onClick={() => setShowDropdown(false)}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
        >
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
            <svg
              className="w-4 h-4 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium"> My Profile</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              View and edit your profile
            </p>
          </div>
        </Link>

        {/* Leave Management Link */}
        <Link
          href="/leave"
          onClick={() => setShowDropdown(false)}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
        >
          <div className="w-8 h-8 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
            <span className="text-lg">🏖️</span>
          </div>
          <div>
            <p className="font-medium"> Leave</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Apply & manage leaves
            </p>
          </div>
        </Link>

        <Link
          href="/timesheet"
          onClick={() => setShowDropdown(false)}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
        >
          <div className="w-8 h-8 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
            <span className="text-lg">⏱️</span>
          </div>
          <div>
            <p className="font-medium"> Time Sheet</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Check your Punch-IN/OUT Details
            </p>
          </div>
        </Link>

        <Link
          href="/team"
          onClick={() => setShowDropdown(false)}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
        >
          <div className="w-8 h-8 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
            <span className="text-lg">👥</span>
          </div>
          <div>
            <p className="font-medium"> Team Dashboard</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage Your Team
            </p>
          </div>
        </Link>

        <Link
          href="/analytics"
          onClick={() => setShowDropdown(false)}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
        >
          <div className="w-8 h-8 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
            <span className="text-lg">📊</span>
          </div>
          <div>
            <p className="font-medium"> Analytics</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              See the Analytics
            </p>
          </div>
        </Link>

        <Link
          href="/shifts"
          onClick={() => setShowDropdown(false)}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
        >
          <div className="w-8 h-8 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
            <span className="text-lg">🕐</span>
          </div>
          <div>
            <p className="font-medium"> Shifts</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              See the Analytics
            </p>
          </div>
        </Link>

        <Link
          href="/payroll"
          onClick={() => setShowDropdown(false)}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
        >
          <div className="w-8 h-8 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
            <span className="text-lg">💰</span>
          </div>
          <div>
            <p className="font-medium"> Payroll</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              See the Payroll
            </p>
          </div>
        </Link>

        {/* Admin Dashboard - Only for HR/Admin */}
        {(user.role === "hr" || user.role === "admin") && (
          <Link
            href="/admin"
            onClick={() => setShowDropdown(false)}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium">Admin Dashboard</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage users & settings
              </p>
            </div>
          </Link>
        )}
      </div>

      {/* Sign Out - Fixed at bottom */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
        >
          <div className="w-8 h-8 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-medium">Sign Out</p>
            <p className="text-xs text-red-500/70 dark:text-red-400/70">
              Log out of your account
            </p>
          </div>
        </button>
      </div>

      <style jsx>{`
        @keyframes dropdownIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all duration-200"
      >
        {/* Avatar */}
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br ${getAvatarGradient()} rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-lg`}
        >
          {initials}
        </div>

        {/* User Info - Hidden on mobile */}
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight truncate max-w-[120px]">
            {user.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight truncate max-w-[120px]">
            {user.email}
          </p>
        </div>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            showDropdown ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Portal for Dropdown - Renders at document body level */}
      {mounted &&
        showDropdown &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0"
              style={{ zIndex: 99998 }}
              onClick={() => setShowDropdown(false)}
            />
            <DropdownMenu />
          </>,
          document.body
        )}
    </>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function DarkModeToggle() {
  const [darkMode, setDarkMode] = useState(null);
  const [isSystemMode, setIsSystemMode] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    right: 0,
  });
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef(null);

  useEffect(() => {
    setMounted(true);

    // Check for saved preference first
    const savedMode = localStorage.getItem("darkMode");
    const savedIsSystem = localStorage.getItem("useSystemTheme");

    if (savedIsSystem === "false" && savedMode !== null) {
      setIsSystemMode(false);
      setDarkMode(savedMode === "true");
      applyTheme(savedMode === "true");
    } else {
      setIsSystemMode(true);
      const systemDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setDarkMode(systemDark);
      applyTheme(systemDark);
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      const useSystem = localStorage.getItem("useSystemTheme");
      if (useSystem !== "false") {
        setDarkMode(e.matches);
        applyTheme(e.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // FIX: Close dropdown on scroll and resize
  useEffect(() => {
    const closeDropdown = () => {
      setShowDropdown(false);
    };

    // Listen for scroll on window and any scrollable container (capture phase)
    window.addEventListener("scroll", closeDropdown, true);
    window.addEventListener("resize", closeDropdown);

    return () => {
      window.removeEventListener("scroll", closeDropdown, true);
      window.removeEventListener("resize", closeDropdown);
    };
  }, []);

  // Calculate dropdown position with mobile support
  useEffect(() => {
    if (showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 192; // w-48 = 12rem = 192px
      const viewportWidth = window.innerWidth;
      const padding = 8;

      // Calculate right position
      let rightPos = viewportWidth - rect.right;

      // Check if dropdown would go off-screen on the left
      const leftEdge = viewportWidth - rightPos - dropdownWidth;

      if (leftEdge < padding) {
        // Dropdown would go off-screen, adjust position
        rightPos = viewportWidth - dropdownWidth - padding;
      }

      setDropdownPosition({
        top: rect.bottom + 8,
        right: Math.max(padding, rightPos),
      });
    }
  }, [showDropdown]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        showDropdown &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        const dropdown = document.getElementById("theme-dropdown");
        if (dropdown && !dropdown.contains(e.target)) {
          setShowDropdown(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const applyTheme = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const setLightMode = () => {
    setDarkMode(false);
    setIsSystemMode(false);
    localStorage.setItem("darkMode", "false");
    localStorage.setItem("useSystemTheme", "false");
    applyTheme(false);
    setShowDropdown(false);
  };

  const setDarkModeOn = () => {
    setDarkMode(true);
    setIsSystemMode(false);
    localStorage.setItem("darkMode", "true");
    localStorage.setItem("useSystemTheme", "false");
    applyTheme(true);
    setShowDropdown(false);
  };

  const useSystemTheme = () => {
    setIsSystemMode(true);
    localStorage.setItem("useSystemTheme", "true");
    const systemDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setDarkMode(systemDark);
    applyTheme(systemDark);
    setShowDropdown(false);
  };

  if (darkMode === null) {
    return (
      <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
    );
  }

  // Dropdown Component
  const ThemeDropdown = () => (
    <div
      id="theme-dropdown"
      className="fixed bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-48 overflow-hidden"
      style={{
        top: dropdownPosition.top,
        right: dropdownPosition.right,
        zIndex: 99999,
        animation: "dropdownIn 0.2s ease-out",
      }}
    >
      <div className="p-2">
        <p className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Theme
        </p>

        {/* Light Mode */}
        <button
          onClick={setLightMode}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
            !darkMode && !isSystemMode
              ? "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              !darkMode && !isSystemMode
                ? "bg-blue-100 dark:bg-blue-500/30"
                : "bg-slate-100 dark:bg-slate-700"
            }`}
          >
            <svg
              className="w-4 h-4 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">Light</p>
          </div>
          {!darkMode && !isSystemMode && (
            <svg
              className="w-4 h-4 ml-auto text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* Dark Mode */}
        <button
          onClick={setDarkModeOn}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
            darkMode && !isSystemMode
              ? "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              darkMode && !isSystemMode
                ? "bg-blue-100 dark:bg-blue-500/30"
                : "bg-slate-100 dark:bg-slate-700"
            }`}
          >
            <svg
              className="w-4 h-4 text-indigo-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">Dark</p>
          </div>
          {darkMode && !isSystemMode && (
            <svg
              className="w-4 h-4 ml-auto text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* System Mode */}
        <button
          onClick={useSystemTheme}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
            isSystemMode
              ? "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isSystemMode
                ? "bg-blue-100 dark:bg-blue-500/30"
                : "bg-slate-100 dark:bg-slate-700"
            }`}
          >
            <svg
              className="w-4 h-4 text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">System</p>
          </div>
          {isSystemMode && (
            <svg
              className="w-4 h-4 ml-auto text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
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
        className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-300 overflow-hidden"
        aria-label="Toggle theme"
      >
        {/* Sun Icon */}
        <svg
          className={`w-5 h-5 text-amber-500 transition-all duration-500 ${
            darkMode
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>

        {/* Moon Icon */}
        <svg
          className={`w-5 h-5 text-indigo-400 absolute top-2.5 left-2.5 transition-all duration-500 ${
            darkMode
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>

        {/* System indicator dot */}
        {isSystemMode && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800"></span>
        )}

        {/* Dropdown indicator */}
        <svg
          className={`w-3 h-3 absolute bottom-1 right-1 text-slate-400 transition-transform ${
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

      {/* Portal Dropdown */}
      {mounted &&
        showDropdown &&
        createPortal(
          <>
            <div
              className="fixed inset-0"
              style={{ zIndex: 99998 }}
              onClick={() => setShowDropdown(false)}
            />
            <ThemeDropdown />
          </>,
          document.body
        )}
    </>
  );
}

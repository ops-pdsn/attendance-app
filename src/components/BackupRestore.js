"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";

export default function BackupRestore({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [backupOptions, setBackupOptions] = useState({
    tasks: true,
    attendance: true,
    holidays: true,
  });

  const toast = useToast();
  const { confirm } = useConfirm();

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (backupOptions.tasks) params.append("tasks", "true");
      if (backupOptions.attendance) params.append("attendance", "true");
      if (backupOptions.holidays) params.append("holidays", "true");

      const res = await fetch(`/api/backup?${params}`);
      if (!res.ok) throw new Error("Backup failed");

      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Backup downloaded!");
    } catch (error) {
      toast.error("Failed to create backup");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      toast.warning("Please select a backup file");
      return;
    }

    const confirmed = await confirm({
      title: "Restore Data",
      message:
        "This will merge the backup data with your existing data. Continue?",
      confirmText: "Restore",
      cancelText: "Cancel",
      type: "warning",
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      const fileContent = await restoreFile.text();
      const backupData = JSON.parse(fileContent);

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      toast.success(
        `Restored: ${result.tasks || 0} tasks, ${
          result.attendance || 0
        } attendance, ${result.holidays || 0} holidays`
      );
      setRestoreFile(null);
    } catch (error) {
      toast.error(error.message || "Failed to restore");
    } finally {
      setLoading(false);
    }
  };

  // Custom Checkbox Component
  const CustomCheckbox = ({ checked, onChange, label }) => (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded-md peer-checked:border-green-500 peer-checked:bg-green-500 transition-all flex items-center justify-center">
          <svg
            className={`w-3 h-3 text-white transition-opacity ${
              checked ? "opacity-100" : "opacity-0"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>
      <span className="text-sm text-slate-700 dark:text-slate-300 capitalize group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
        {label}
      </span>
    </label>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
        {/* Header - Fixed */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">
                Backup & Restore
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                Export or import data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <svg
              className="w-5 h-5 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Backup Section */}
          <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2 text-sm sm:text-base">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Create Backup
            </h3>

            {/* Backup Options with Custom Checkboxes */}
            <div className="space-y-3 mb-4">
              {[
                { key: "tasks", label: "Tasks", icon: "📋" },
                { key: "attendance", label: "Attendance", icon: "📅" },
                { key: "holidays", label: "Holidays", icon: "🎉" },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={backupOptions[item.key]}
                      onChange={(e) =>
                        setBackupOptions((prev) => ({
                          ...prev,
                          [item.key]: e.target.checked,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-500 rounded-md peer-checked:border-green-500 peer-checked:bg-green-500 transition-all flex items-center justify-center bg-white dark:bg-slate-700">
                      <svg
                        className={`w-3 h-3 text-white transition-opacity ${
                          backupOptions[item.key] ? "opacity-100" : "opacity-0"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex items-center gap-2">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                </label>
              ))}
            </div>

            <button
              onClick={handleBackup}
              disabled={
                loading || Object.values(backupOptions).every((v) => !v)
              }
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl disabled:opacity-50 font-medium text-sm sm:text-base flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/25"
            >
              {loading ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>Download Backup</span>
                </>
              )}
            </button>
          </div>

          {/* Restore Section */}
          <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2 text-sm sm:text-base">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Restore from Backup
            </h3>

            <label className="block mb-4">
              <div
                className={`border-2 border-dashed rounded-xl p-4 sm:p-6 text-center cursor-pointer transition-all ${
                  restoreFile
                    ? "border-blue-500 bg-blue-100 dark:bg-blue-900/30"
                    : "border-slate-300 dark:border-slate-600 hover:border-blue-400 bg-white dark:bg-slate-700/50"
                }`}
              >
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {restoreFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-blue-600 dark:text-blue-400 font-medium text-sm truncate max-w-[180px] sm:max-w-[250px]">
                        {restoreFile.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(restoreFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setRestoreFile(null);
                      }}
                      className="ml-2 p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg transition-colors"
                    >
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="text-slate-500">
                    <svg
                      className="w-8 h-8 mx-auto mb-2 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="font-medium text-sm sm:text-base">
                      Click to select backup file
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Accepts .json files only
                    </p>
                  </div>
                )}
              </div>
            </label>

            <button
              onClick={handleRestore}
              disabled={loading || !restoreFile}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl disabled:opacity-50 font-medium text-sm sm:text-base flex items-center justify-center gap-2 hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
            >
              {loading ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  <span>Restore Data</span>
                </>
              )}
            </button>
          </div>

          {/* Info Note */}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex gap-2">
              <svg
                className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium">Note:</p>
                <p className="text-amber-700 dark:text-amber-300">
                  Restoring will merge data with existing records. Duplicate
                  entries will be skipped.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="w-full px-4 sm:px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-sm sm:text-base hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

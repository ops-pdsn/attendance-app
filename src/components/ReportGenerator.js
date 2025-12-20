"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/Toast";

export default function ReportGenerator({ onClose }) {
  const { data: session } = useSession();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("attendance");
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [options, setOptions] = useState({
    includeCharts: true,
    includeSummary: true,
    orientation: "portrait",
  });

  // Get user details from session
  const user = session?.user || {};

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const reportTypes = [
    {
      id: "attendance",
      name: "Attendance Report",
      icon: "📅",
      description: "Daily attendance records",
      color: "from-blue-500 to-indigo-600",
    },
    {
      id: "tasks",
      name: "Task Report",
      icon: "📋",
      description: "Task completion status",
      color: "from-purple-500 to-pink-600",
    },
    {
      id: "leave",
      name: "Leave Report",
      icon: "🏖️",
      description: "Leave balance & history",
      color: "from-green-500 to-emerald-600",
    },
    {
      id: "summary",
      name: "Summary Report",
      icon: "📊",
      description: "Performance summary",
      color: "from-orange-500 to-red-600",
    },
  ];

  const fetchReportData = async () => {
    const params = new URLSearchParams({
      start: dateRange.start,
      end: dateRange.end,
    });

    const responses = await Promise.all([
      fetch(`/api/attendance?${params}`),
      fetch(`/api/tasks?${params}`),
      fetch("/api/leave-balance"),
      fetch("/api/leave-requests"),
    ]);

    const [attendance, tasks, leaveBalance, leaveRequests] = await Promise.all(
      responses.map((r) => (r.ok ? r.json() : []))
    );

    return { attendance, tasks, leaveBalance, leaveRequests };
  };

  const generatePDF = async () => {
    setLoading(true);

    try {
      const data = await fetchReportData();
      const doc = new jsPDF({
        orientation: options.orientation,
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      // Helper functions
      const addHeader = (title) => {
        // Header background - Gradient effect with two colors
        doc.setFillColor(59, 130, 246); // Blue
        doc.rect(0, 0, pageWidth, 45, "F");

        // Darker stripe at bottom of header
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 40, pageWidth, 5, "F");

        // Company name
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("Attendance Monitor", margin, 15);

        // Report title
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(title, margin, 25);

        // Date range
        doc.setFontSize(9);
        doc.text(
          `Report Period: ${formatDate(dateRange.start)} - ${formatDate(
            dateRange.end
          )}`,
          margin,
          32
        );

        // Generated date on right
        doc.text(
          `Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
          margin,
          38
        );

        // ========== USER DETAILS SECTION ==========
        const userBoxY = 50;
        const userBoxHeight = 28;

        // User details background box
        doc.setFillColor(248, 250, 252); // Light gray
        doc.roundedRect(
          margin,
          userBoxY,
          pageWidth - margin * 2,
          userBoxHeight,
          3,
          3,
          "F"
        );

        // Border for user box
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.roundedRect(
          margin,
          userBoxY,
          pageWidth - margin * 2,
          userBoxHeight,
          3,
          3,
          "S"
        );

        // User icon placeholder (circle with initials)
        const avatarX = margin + 5;
        const avatarY = userBoxY + userBoxHeight / 2;
        const avatarRadius = 8;

        doc.setFillColor(59, 130, 246); // Blue avatar background
        doc.circle(avatarX + avatarRadius, avatarY, avatarRadius, "F");

        // User initials in avatar
        const initials =
          user.name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "??";

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(initials, avatarX + avatarRadius, avatarY + 3.5, {
          align: "center",
        });

        // User details text
        const textStartX = avatarX + avatarRadius * 2 + 8;

        // Name
        doc.setTextColor(30, 41, 59); // Dark slate
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(user.name || "Unknown User", textStartX, userBoxY + 9);

        // Email
        doc.setTextColor(100, 116, 139); // Slate gray
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(user.email || "No email", textStartX, userBoxY + 15);

        // Department & Role row
        const detailsY = userBoxY + 22;

        // Department badge
        if (user.department) {
          doc.setFillColor(219, 234, 254); // Light blue
          const deptText = user.department;
          const deptWidth = doc.getTextWidth(deptText) + 6;
          doc.roundedRect(textStartX, detailsY - 4, deptWidth, 6, 1, 1, "F");
          doc.setTextColor(59, 130, 246);
          doc.setFontSize(7);
          doc.text(deptText, textStartX + 3, detailsY);
        }

        // Role badge
        const roleX = user.department
          ? textStartX + doc.getTextWidth(user.department) + 12
          : textStartX;
        const roleText =
          user.role?.charAt(0).toUpperCase() + user.role?.slice(1) ||
          "Employee";
        const roleColors = {
          admin: { bg: [254, 226, 226], text: [220, 38, 38] }, // Red
          hr: { bg: [243, 232, 255], text: [147, 51, 234] }, // Purple
          manager: { bg: [254, 243, 199], text: [217, 119, 6] }, // Amber
          employee: { bg: [220, 252, 231], text: [22, 163, 74] }, // Green
        };
        const roleColor = roleColors[user.role] || roleColors.employee;

        doc.setFillColor(...roleColor.bg);
        const roleWidth = doc.getTextWidth(roleText) + 6;
        doc.roundedRect(roleX, detailsY - 4, roleWidth, 6, 1, 1, "F");
        doc.setTextColor(...roleColor.text);
        doc.setFontSize(7);
        doc.text(roleText, roleX + 3, detailsY);

        // Employee ID on right side (if available)
        if (user.employeeId || user.id) {
          const empIdText = `ID: ${user.employeeId || user.id?.slice(0, 8)}`;
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(8);
          doc.text(empIdText, pageWidth - margin - 5, userBoxY + 15, {
            align: "right",
          });
        }

        // Phone number on right side (if available)
        if (user.phone) {
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(8);
          doc.text(
            `Tel: ${user.phone}`,
            pageWidth - margin - 5,
            userBoxY + 22,
            { align: "right" }
          );
        }

        return userBoxY + userBoxHeight + 10; // Return Y position after header + user box
      };

      const addFooter = (pageNum, totalPages) => {
        // Footer line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${pageNum} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: "center" }
        );
        doc.text(
          "Confidential - For Internal Use Only",
          margin,
          pageHeight - 8
        );

        // Employee name in footer for identification
        doc.text(
          `Employee: ${user.name || "Unknown"}`,
          pageWidth - margin,
          pageHeight - 8,
          { align: "right" }
        );
      };

      const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      };

      const addSectionTitle = (title, y) => {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text(title, margin, y);

        // Underline
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(0.8);
        doc.line(margin, y + 2, margin + doc.getTextWidth(title), y + 2);

        return y + 10;
      };

      // Generate report based on type
      switch (reportType) {
        case "attendance":
          generateAttendanceReport(doc, data, {
            addHeader,
            addFooter,
            addSectionTitle,
            formatDate,
            margin,
            pageWidth,
          });
          break;
        case "tasks":
          generateTaskReport(doc, data, {
            addHeader,
            addFooter,
            addSectionTitle,
            formatDate,
            margin,
            pageWidth,
          });
          break;
        case "leave":
          generateLeaveReport(doc, data, {
            addHeader,
            addFooter,
            addSectionTitle,
            formatDate,
            margin,
            pageWidth,
          });
          break;
        case "summary":
          generateSummaryReport(doc, data, {
            addHeader,
            addFooter,
            addSectionTitle,
            formatDate,
            margin,
            pageWidth,
          });
          break;
      }

      // Add footer to all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(i, totalPages);
      }

      // Save the PDF with user name in filename
      const sanitizedName = (user.name || "user")
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const fileName = `${reportType}-report-${sanitizedName}-${dateRange.start}-to-${dateRange.end}.pdf`;
      doc.save(fileName);

      toast.success(
        `${reportTypes.find((r) => r.id === reportType)?.name} downloaded!`
      );
      onClose?.();
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const generateAttendanceReport = (doc, data, helpers) => {
    const { addHeader, addSectionTitle, formatDate, margin, pageWidth } =
      helpers;
    let y = addHeader("Attendance Report");

    // Summary stats
    if (options.includeSummary) {
      y = addSectionTitle("Summary", y);

      const totalDays = data.attendance.length;
      const officeDays = data.attendance.filter(
        (a) => a.status === "office"
      ).length;
      const fieldDays = data.attendance.filter(
        (a) => a.status === "field"
      ).length;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);

      const summaryData = [
        ["Total Working Days", totalDays.toString()],
        [
          "Office Days",
          `${officeDays} (${
            totalDays > 0 ? Math.round((officeDays / totalDays) * 100) : 0
          }%)`,
        ],
        [
          "Field Days",
          `${fieldDays} (${
            totalDays > 0 ? Math.round((fieldDays / totalDays) * 100) : 0
          }%)`,
        ],
      ];

      autoTable(doc, {
        startY: y,
        head: [["Metric", "Value"]],
        body: summaryData,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: "bold" } },
        margin: { left: margin, right: margin },
      });

      y = doc.lastAutoTable.finalY + 15;
    }

    // Attendance table
    y = addSectionTitle("Attendance Records", y);

    const tableData = data.attendance.map((record) => [
      formatDate(record.date),
      record.status === "office" ? "Office" : "Field",
      record.session || "Full Day",
      record.punchIn ? new Date(record.punchIn).toLocaleTimeString() : "-",
      record.punchOut ? new Date(record.punchOut).toLocaleTimeString() : "-",
      record.notes || "-",
    ]);

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Date", "Status", "Session", "Punch In", "Punch Out", "Notes"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text("No attendance records found for this period.", margin, y + 5);
    }
  };

  const generateTaskReport = (doc, data, helpers) => {
    const { addHeader, addSectionTitle, formatDate, margin } = helpers;
    let y = addHeader("Task Report");

    // Summary stats
    if (options.includeSummary) {
      y = addSectionTitle("Summary", y);

      const totalTasks = data.tasks.length;
      const completedTasks = data.tasks.filter((t) => t.completed).length;
      const pendingTasks = totalTasks - completedTasks;
      const completionRate =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const highPriority = data.tasks.filter(
        (t) => t.priority === "high"
      ).length;
      const mediumPriority = data.tasks.filter(
        (t) => t.priority === "medium"
      ).length;
      const lowPriority = data.tasks.filter((t) => t.priority === "low").length;

      const summaryData = [
        ["Total Tasks", totalTasks.toString()],
        ["Completed", `${completedTasks} (${completionRate}%)`],
        ["Pending", pendingTasks.toString()],
        ["High Priority", highPriority.toString()],
        ["Medium Priority", mediumPriority.toString()],
        ["Low Priority", lowPriority.toString()],
      ];

      autoTable(doc, {
        startY: y,
        head: [["Metric", "Value"]],
        body: summaryData,
        theme: "grid",
        headStyles: { fillColor: [147, 51, 234], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: "bold" } },
        margin: { left: margin, right: margin },
      });

      y = doc.lastAutoTable.finalY + 15;
    }

    // Tasks table
    y = addSectionTitle("Task List", y);

    const tableData = data.tasks.map((task) => [
      formatDate(task.date),
      task.title,
      task.type || "daily",
      task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1) ||
        "Medium",
      task.completed ? "Done" : "Pending",
    ]);

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Date", "Task", "Type", "Priority", "Status"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [147, 51, 234], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
        columnStyles: {
          1: { cellWidth: "auto" },
          4: { halign: "center" },
        },
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text("No tasks found for this period.", margin, y + 5);
    }
  };

  const generateLeaveReport = (doc, data, helpers) => {
    const { addHeader, addSectionTitle, formatDate, margin } = helpers;
    let y = addHeader("Leave Report");

    // Leave Balance
    y = addSectionTitle("Leave Balance", y);

    const balanceData = data.leaveBalance.map((b) => [
      b.leaveType.name,
      b.leaveType.code,
      b.total.toString(),
      b.used.toString(),
      b.pending.toString(),
      b.available.toString(),
    ]);

    if (balanceData.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Leave Type", "Code", "Total", "Used", "Pending", "Available"]],
        body: balanceData,
        theme: "grid",
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        margin: { left: margin, right: margin },
      });

      y = doc.lastAutoTable.finalY + 15;
    }

    // Leave Requests
    y = addSectionTitle("Leave History", y);

    const requestData = data.leaveRequests.map((r) => [
      formatDate(r.startDate),
      formatDate(r.endDate),
      r.leaveType?.name || "-",
      r.days.toString(),
      r.status.charAt(0).toUpperCase() + r.status.slice(1),
      r.reason || "-",
    ]);

    if (requestData.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["From", "To", "Type", "Days", "Status", "Reason"]],
        body: requestData,
        theme: "striped",
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text("No leave requests found.", margin, y + 5);
    }
  };

  const generateSummaryReport = (doc, data, helpers) => {
    const { addHeader, addSectionTitle, formatDate, margin, pageWidth } =
      helpers;
    let y = addHeader("Performance Summary Report");

    // Overall Stats
    y = addSectionTitle("Overview", y);

    const totalAttendance = data.attendance.length;
    const totalTasks = data.tasks.length;
    const completedTasks = data.tasks.filter((t) => t.completed).length;
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const officeDays = data.attendance.filter(
      (a) => a.status === "office"
    ).length;
    const fieldDays = data.attendance.filter(
      (a) => a.status === "field"
    ).length;

    // Stats boxes
    const boxWidth = (pageWidth - margin * 2 - 10) / 3;

    // Box 1 - Working Days
    doc.setFillColor(239, 246, 255); // Blue tint
    doc.roundedRect(margin, y, boxWidth, 28, 3, 3, "F");
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246);
    doc.text(totalAttendance.toString(), margin + boxWidth / 2, y + 15, {
      align: "center",
    });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Working Days", margin + boxWidth / 2, y + 24, {
      align: "center",
    });

    // Box 2 - Tasks Completed
    doc.setFillColor(243, 232, 255); // Purple tint
    doc.roundedRect(margin + boxWidth + 5, y, boxWidth, 28, 3, 3, "F");
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(147, 51, 234);
    doc.text(
      completedTasks.toString(),
      margin + boxWidth + 5 + boxWidth / 2,
      y + 15,
      { align: "center" }
    );
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Tasks Completed", margin + boxWidth + 5 + boxWidth / 2, y + 24, {
      align: "center",
    });

    // Box 3 - Completion Rate
    doc.setFillColor(220, 252, 231); // Green tint
    doc.roundedRect(margin + (boxWidth + 5) * 2, y, boxWidth, 28, 3, 3, "F");
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74);
    doc.text(
      `${completionRate}%`,
      margin + (boxWidth + 5) * 2 + boxWidth / 2,
      y + 15,
      { align: "center" }
    );
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Completion Rate",
      margin + (boxWidth + 5) * 2 + boxWidth / 2,
      y + 24,
      { align: "center" }
    );

    y += 38;

    // Attendance breakdown
    y = addSectionTitle("Attendance Breakdown", y);

    const attendanceBreakdown = [
      [
        "Office Days",
        officeDays.toString(),
        `${
          totalAttendance > 0
            ? Math.round((officeDays / totalAttendance) * 100)
            : 0
        }%`,
      ],
      [
        "Field Days",
        fieldDays.toString(),
        `${
          totalAttendance > 0
            ? Math.round((fieldDays / totalAttendance) * 100)
            : 0
        }%`,
      ],
      ["Total", totalAttendance.toString(), "100%"],
    ];

    autoTable(doc, {
      startY: y,
      head: [["Type", "Days", "Percentage"]],
      body: attendanceBreakdown,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 4 },
      margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable.finalY + 15;

    // Task breakdown by priority
    y = addSectionTitle("Tasks by Priority", y);

    const highPriority = data.tasks.filter((t) => t.priority === "high");
    const mediumPriority = data.tasks.filter((t) => t.priority === "medium");
    const lowPriority = data.tasks.filter((t) => t.priority === "low");

    const taskBreakdown = [
      [
        "High Priority",
        highPriority.length.toString(),
        highPriority.filter((t) => t.completed).length.toString(),
      ],
      [
        "Medium Priority",
        mediumPriority.length.toString(),
        mediumPriority.filter((t) => t.completed).length.toString(),
      ],
      [
        "Low Priority",
        lowPriority.length.toString(),
        lowPriority.filter((t) => t.completed).length.toString(),
      ],
      ["Total", totalTasks.toString(), completedTasks.toString()],
    ];

    autoTable(doc, {
      startY: y,
      head: [["Priority", "Total", "Completed"]],
      body: taskBreakdown,
      theme: "grid",
      headStyles: { fillColor: [147, 51, 234], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 4 },
      margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable.finalY + 15;

    // Leave summary
    y = addSectionTitle("Leave Summary", y);

    const totalLeaveUsed = data.leaveBalance.reduce(
      (sum, b) => sum + b.used,
      0
    );
    const totalLeaveAvailable = data.leaveBalance.reduce(
      (sum, b) => sum + b.available,
      0
    );
    const pendingRequests = data.leaveRequests.filter(
      (r) => r.status === "pending"
    ).length;
    const approvedRequests = data.leaveRequests.filter(
      (r) => r.status === "approved"
    ).length;

    const leaveSummary = [
      ["Total Leave Used", `${totalLeaveUsed} days`],
      ["Total Leave Available", `${totalLeaveAvailable} days`],
      ["Pending Requests", pendingRequests.toString()],
      ["Approved Requests", approvedRequests.toString()],
    ];

    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: leaveSummary,
      theme: "grid",
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: "bold" } },
      margin: { left: margin, right: margin },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
        {/* Header - Fixed */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-orange-50 to-red-50 dark:from-slate-800 dark:to-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-base sm:text-xl">📄</span>
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">
                Generate Report
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                Download PDF reports
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

        {/* User Info Preview */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
              {user.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "??"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                {user.name || "Unknown User"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user.email || "No email"}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {user.department && (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-medium rounded-md">
                  {user.department}
                </span>
              )}
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-[10px] font-medium rounded-md">
                {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) ||
                  "Employee"}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            👆 This information will appear on your PDF report header
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 sm:mb-3">
              Report Type
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {reportTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`p-3 sm:p-4 rounded-xl border-2 transition-all text-left ${
                    reportType === type.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${type.color} rounded-lg flex items-center justify-center text-white flex-shrink-0`}
                    >
                      <span className="text-base sm:text-xl">{type.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`font-semibold text-xs sm:text-sm truncate ${
                          reportType === type.id
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {type.name}
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                        {type.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 sm:mb-3">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, start: e.target.value }))
                  }
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">To</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, end: e.target.value }))
                  }
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Quick Date Presets */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
              {[
                {
                  label: "This Week",
                  getValue: () => {
                    const now = new Date();
                    const start = new Date(
                      now.setDate(now.getDate() - now.getDay())
                    );
                    return {
                      start: start.toISOString().split("T")[0],
                      end: new Date().toISOString().split("T")[0],
                    };
                  },
                },
                {
                  label: "This Month",
                  getValue: () => {
                    const now = new Date();
                    return {
                      start: new Date(now.getFullYear(), now.getMonth(), 1)
                        .toISOString()
                        .split("T")[0],
                      end: new Date().toISOString().split("T")[0],
                    };
                  },
                },
                {
                  label: "Last Month",
                  getValue: () => {
                    const now = new Date();
                    return {
                      start: new Date(now.getFullYear(), now.getMonth() - 1, 1)
                        .toISOString()
                        .split("T")[0],
                      end: new Date(now.getFullYear(), now.getMonth(), 0)
                        .toISOString()
                        .split("T")[0],
                    };
                  },
                },
                {
                  label: "This Year",
                  getValue: () => {
                    const now = new Date();
                    return {
                      start: new Date(now.getFullYear(), 0, 1)
                        .toISOString()
                        .split("T")[0],
                      end: new Date().toISOString().split("T")[0],
                    };
                  },
                },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setDateRange(preset.getValue())}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 sm:mb-3">
              Options
            </label>
            <div className="space-y-3 sm:space-y-4">
              {/* Custom Checkbox - Include Summary */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={options.includeSummary}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        includeSummary: e.target.checked,
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 sm:w-5 sm:h-5 border-2 border-slate-300 dark:border-slate-600 rounded-md peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-all flex items-center justify-center">
                    <svg
                      className={`w-3 h-3 text-white transition-opacity ${
                        options.includeSummary ? "opacity-100" : "opacity-0"
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
                <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  Include summary statistics
                </span>
              </label>

              {/* Orientation Selection */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Orientation:
                </span>
                <div className="flex gap-2">
                  {[
                    { value: "portrait", label: "Portrait", icon: "📄" },
                    { value: "landscape", label: "Landscape", icon: "🖼️" },
                  ].map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() =>
                        setOptions((prev) => ({
                          ...prev,
                          orientation: o.value,
                        }))
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                        options.orientation === o.value
                          ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      <span>{o.icon}</span>
                      <span>{o.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 flex gap-2 sm:gap-3 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={generatePDF}
            disabled={loading}
            className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-medium text-sm hover:from-orange-600 hover:to-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="hidden sm:inline">Generating...</span>
                <span className="sm:hidden">Wait...</span>
              </>
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
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

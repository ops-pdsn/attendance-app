import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

// GET /api/payroll - Get payroll data for users
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/hr can view payroll
    if (!['admin', 'hr'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const month = parseInt(searchParams.get('month')) || new Date().getMonth() + 1
    const year = parseInt(searchParams.get('year')) || new Date().getFullYear()

    // Build where clause
    let where = { isActive: true }
    if (userId) where.id = userId

    // Get users with payroll data
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        department: true,
        role: true,
        dateOfJoining: true,
        employmentType: true,
        // Salary components
        basicSalary: true,
        hra: true,
        da: true,
        conveyance: true,
        medicalAllowance: true,
        specialAllowance: true,
        otherAllowances: true,
        // Deductions
        pf: true,
        esi: true,
        professionalTax: true,
        tds: true,
        otherDeductions: true,
        // Bank details
        bankAccountNumber: true,
        bankName: true,
        ifscCode: true,
        bankBranch: true,
        // Tax details
        panNumber: true,
        uanNumber: true,
      }
    })

    // Calculate payroll for each user
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const payrollData = await Promise.all(users.map(async (user) => {
      // Get attendance for the month
      const attendance = await prisma.attendance.findMany({
        where: {
          userId: user.id,
          date: { gte: startDate, lte: endDate }
        }
      })

      // Calculate working days
      const presentDays = attendance.filter(a => a.status === 'present' || a.status === 'office' || a.status === 'field').length
      const halfDays = attendance.filter(a => a.session === 'morning' || a.session === 'afternoon').length
      const absentDays = attendance.filter(a => a.status === 'absent').length

      // Get approved leaves for the month
      const leaves = await prisma.leaveRequest.findMany({
        where: {
          userId: user.id,
          status: 'approved',
          startDate: { lte: endDate },
          endDate: { gte: startDate }
        },
        include: { leaveType: true }
      })

      const paidLeaveDays = leaves
        .filter(l => l.leaveType.isPaid)
        .reduce((sum, l) => sum + l.days, 0)

      const unpaidLeaveDays = leaves
        .filter(l => !l.leaveType.isPaid)
        .reduce((sum, l) => sum + l.days, 0)

      // Calculate salary
      const totalWorkingDays = new Date(year, month, 0).getDate() // Days in month
      const effectiveWorkingDays = presentDays + (halfDays * 0.5) + paidLeaveDays

      // Earnings
      const basic = user.basicSalary || 0
      const hra = user.hra || 0
      const da = user.da || 0
      const conveyance = user.conveyance || 0
      const medical = user.medicalAllowance || 0
      const special = user.specialAllowance || 0
      const other = user.otherAllowances || 0

      const grossSalary = basic + hra + da + conveyance + medical + special + other

      // Pro-rata calculation based on working days
      const proRataFactor = effectiveWorkingDays / totalWorkingDays
      const earnedGross = grossSalary * proRataFactor

      // Deductions
      const pfDeduction = user.pf || (basic * 0.12) // 12% of basic if not set
      const esiDeduction = user.esi || 0
      const ptDeduction = user.professionalTax || 0
      const tdsDeduction = user.tds || 0
      const otherDeductions = user.otherDeductions || 0

      const totalDeductions = pfDeduction + esiDeduction + ptDeduction + tdsDeduction + otherDeductions

      // LOP deduction (Loss of Pay)
      const lopDeduction = (grossSalary / totalWorkingDays) * unpaidLeaveDays

      const netSalary = earnedGross - totalDeductions - lopDeduction

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          employeeId: user.employeeId,
          department: user.department,
          role: user.role,
          dateOfJoining: user.dateOfJoining,
          employmentType: user.employmentType,
          bankAccountNumber: user.bankAccountNumber ? `****${user.bankAccountNumber.slice(-4)}` : null,
          bankName: user.bankName,
          ifscCode: user.ifscCode,
          panNumber: user.panNumber ? `****${user.panNumber.slice(-4)}` : null,
        },
        month,
        year,
        attendance: {
          totalWorkingDays,
          presentDays,
          halfDays,
          absentDays,
          paidLeaveDays,
          unpaidLeaveDays,
          effectiveWorkingDays: Math.round(effectiveWorkingDays * 100) / 100
        },
        earnings: {
          basic: Math.round(basic * proRataFactor),
          hra: Math.round(hra * proRataFactor),
          da: Math.round(da * proRataFactor),
          conveyance: Math.round(conveyance * proRataFactor),
          medical: Math.round(medical * proRataFactor),
          special: Math.round(special * proRataFactor),
          other: Math.round(other * proRataFactor),
          grossSalary: Math.round(grossSalary),
          earnedGross: Math.round(earnedGross)
        },
        deductions: {
          pf: Math.round(pfDeduction),
          esi: Math.round(esiDeduction),
          professionalTax: Math.round(ptDeduction),
          tds: Math.round(tdsDeduction),
          otherDeductions: Math.round(otherDeductions),
          lopDeduction: Math.round(lopDeduction),
          totalDeductions: Math.round(totalDeductions + lopDeduction)
        },
        netSalary: Math.round(netSalary)
      }
    }))

    return NextResponse.json(payrollData)
  } catch (error) {
    console.error('GET /api/payroll error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/payroll - Update user's payroll/salary details
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/hr can update payroll
    if (!['admin', 'hr'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, ...payrollData } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get user's current data
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { basicSalary: true, name: true }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user payroll fields
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        basicSalary: payrollData.basicSalary,
        hra: payrollData.hra,
        da: payrollData.da,
        conveyance: payrollData.conveyance,
        medicalAllowance: payrollData.medicalAllowance,
        specialAllowance: payrollData.specialAllowance,
        otherAllowances: payrollData.otherAllowances,
        pf: payrollData.pf,
        esi: payrollData.esi,
        professionalTax: payrollData.professionalTax,
        tds: payrollData.tds,
        otherDeductions: payrollData.otherDeductions,
        bankAccountNumber: payrollData.bankAccountNumber,
        bankName: payrollData.bankName,
        ifscCode: payrollData.ifscCode,
        bankBranch: payrollData.bankBranch,
        panNumber: payrollData.panNumber,
        uanNumber: payrollData.uanNumber,
        esiNumber: payrollData.esiNumber,
        dateOfJoining: payrollData.dateOfJoining ? new Date(payrollData.dateOfJoining) : undefined,
        employmentType: payrollData.employmentType
      },
      select: {
        id: true,
        name: true,
        basicSalary: true,
        hra: true,
        da: true
      }
    })

    // ✅ NOTIFICATION: If salary was updated, notify the employee
    if (payrollData.basicSalary && existingUser.basicSalary !== payrollData.basicSalary) {
      await prisma.notification.create({
        data: {
          userId: userId,
          title: '💰 Salary Updated',
          message: 'Your salary details have been updated. Please check your payroll information.',
          type: 'info',
          link: '/profile'
        }
      })
    }

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('PATCH /api/payroll error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
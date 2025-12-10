import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// POST /api/auth/forgot-password - Request password reset
export async function POST(request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: 'If an account exists with this email, a reset link has been generated.',
        // In production, don't include this:
        debug: 'User not found'
      })
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: user.email }
    })

    // Create new token
    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expiresAt
      }
    })

    // In production, you would send an email here
    // For development, we'll return the reset link
    const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`

    return NextResponse.json({
      message: 'If an account exists with this email, a reset link has been generated.',
      // Remove this in production - only for development
      resetLink,
      expiresAt
    })
  } catch (error) {
    console.error('POST /api/auth/forgot-password error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
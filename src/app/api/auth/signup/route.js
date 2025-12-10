import { NextResponse } from 'next/server'
import { createUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password, name, department, employeeId, phone } = body
    
    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }
    
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }
    
    // Create user
    const user = await createUser({
      email,
      password,
      name,
      role: 'employee', // Default role
      department,
      employeeId,
      phone
    })
    
    return NextResponse.json(
      { 
        message: 'User created successfully',
        user 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}
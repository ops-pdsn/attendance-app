export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// POST /api/holidays/bulk - Import multiple holidays
export async function POST(request) {
  try {
    const body = await request.json()
    const { holidays } = body
    
    console.log('📥 Bulk import request received:', holidays?.length, 'holidays')
    
    if (!Array.isArray(holidays) || holidays.length === 0) {
      console.error('❌ Invalid holidays array')
      return NextResponse.json(
        { error: 'Holidays array is required' },
        { status: 400 }
      )
    }
    
    // Delete existing holidays for the same dates to avoid conflicts
    const dates = holidays.map(h => new Date(h.date))
    console.log('🗑️ Deleting existing holidays for dates:', dates.length)
    
    // Delete one by one for SQLite compatibility
    for (const date of dates) {
      await prisma.holiday.deleteMany({
        where: { date }
      })
    }
    
    console.log('✅ Deleted existing holidays')
    
    // Create holidays one by one (SQLite doesn't support createMany)
    console.log('➕ Creating new holidays...')
    let createdCount = 0
    
    for (const h of holidays) {
      try {
        await prisma.holiday.create({
          data: {
            name: h.name,
            date: new Date(h.date),
            type: h.type || 'public',
            description: h.description || ''
          }
        })
        createdCount++
      } catch (error) {
        // Skip if already exists (shouldn't happen after delete, but just in case)
        console.log('⚠️ Skipping duplicate:', h.name)
      }
    }
    
    console.log('✅ Successfully created:', createdCount, 'holidays')
    
    return NextResponse.json({ 
      message: `${createdCount} holidays imported successfully`,
      count: createdCount 
    })
  } catch (error) {
    console.error('❌ Bulk import error:', error)
    return NextResponse.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 })
  }
}

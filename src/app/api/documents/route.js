import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const isAdmin = ['admin', 'hr'].includes(session.user.role)

    const targetUserId = isAdmin && userId ? userId : session.user.id

    const documents = await prisma.document.findMany({
      where: { userId: targetUserId },
      include: {
        uploader: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('GET /api/documents error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST expects a JSON body with { name, type, url, size, mimeType, userId }
// In a full implementation, the file upload would be handled by a storage service (e.g. Supabase Storage)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, type, url, size, mimeType, userId } = await request.json()
    if (!name || !type || !url) {
      return NextResponse.json({ error: 'Name, type, and URL are required' }, { status: 400 })
    }

    const isAdmin = ['admin', 'hr'].includes(session.user.role)
    const targetUserId = isAdmin && userId ? userId : session.user.id

    const document = await prisma.document.create({
      data: {
        name,
        type,
        url,
        size: size || null,
        mimeType: mimeType || null,
        userId: targetUserId,
        uploadedBy: session.user.id
      },
      include: { uploader: { select: { id: true, name: true } } }
    })

    // Notify the employee if HR uploaded a document for them
    if (session.user.id !== targetUserId) {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: 'Document Added',
          message: `A new document "${name}" has been added to your profile.`,
          type: 'info',
          link: '/documents'
        }
      })
    }

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('POST /api/documents error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

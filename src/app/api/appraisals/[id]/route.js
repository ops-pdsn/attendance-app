import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const appraisal = await prisma.appraisal.findUnique({
      where: { id: params.id },
      include: {
        user:     { select: { id: true, name: true, employeeId: true, department: true } },
        reviewer: { select: { id: true, name: true } },
      },
    })
    if (!appraisal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner      = appraisal.userId === session.user.id
    const isReviewer   = appraisal.reviewerId === session.user.id
    const isPrivileged = ['admin', 'hr'].includes(session.user.role)
    if (!isOwner && !isReviewer && !isPrivileged)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json(appraisal)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { action, selfScore, selfComments, goals, managerScore, managerComments } = body

    const appraisal = await prisma.appraisal.findUnique({ where: { id: params.id } })
    if (!appraisal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner      = appraisal.userId === session.user.id
    const isReviewer   = appraisal.reviewerId === session.user.id
    const isPrivileged = ['admin', 'hr'].includes(session.user.role)

    let data = {}

    if (action === 'submit-self' && isOwner) {
      data = {
        selfScore:    selfScore    !== undefined ? selfScore    : appraisal.selfScore,
        selfComments: selfComments !== undefined ? selfComments : appraisal.selfComments,
        goals:        goals        !== undefined ? (typeof goals === 'string' ? goals : JSON.stringify(goals)) : appraisal.goals,
        status:       'submitted',
        submittedAt:  new Date(),
      }
    } else if (action === 'review' && (isReviewer || isPrivileged)) {
      data = {
        managerScore:    managerScore    !== undefined ? managerScore    : appraisal.managerScore,
        managerComments: managerComments !== undefined ? managerComments : appraisal.managerComments,
        status:          'reviewed',
        reviewedAt:      new Date(),
        reviewerId:      session.user.id,
      }
    } else if (action === 'finalize' && isPrivileged) {
      data = { status: 'finalized' }
    } else if (isPrivileged) {
      // Admin generic edit
      if (selfScore    !== undefined) data.selfScore    = selfScore
      if (selfComments !== undefined) data.selfComments = selfComments
      if (managerScore    !== undefined) data.managerScore    = managerScore
      if (managerComments !== undefined) data.managerComments = managerComments
      if (goals !== undefined) data.goals = typeof goals === 'string' ? goals : JSON.stringify(goals)
      if (body.status) data.status = body.status
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.appraisal.update({ where: { id: params.id }, data })
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.appraisal.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

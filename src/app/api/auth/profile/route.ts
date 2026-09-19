import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const me = await requireUser()
    if (!me) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: me.id },
      select: { id: true, name: true, email: true, bio: true, timezone: true, role: true, apiKey: true, createdAt: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const me = await requireUser()
    if (!me) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, bio, timezone } = body

    const user = await db.user.update({
      where: { id: me.id },
      data: {
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
        ...(timezone !== undefined && { timezone }),
      },
      select: { id: true, name: true, email: true, bio: true, timezone: true },
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

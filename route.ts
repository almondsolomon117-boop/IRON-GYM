import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, sanitize } from '@/lib/api-utils';

// GET /api/trainers
export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [trainers, total] = await Promise.all([
      db.trainer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.trainer.count({ where }),
    ]);

    const safeTrainers = trainers.map((t) => ({
      id: t.id,
      name: t.name,
      phone: t.phone,
      specialty: t.specialty,
      salary: t.salary,
      createdAt: t.createdAt.toISOString().split('T')[0],
    }));

    return NextResponse.json({ trainers: safeTrainers, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch trainers', details: String(error) }, { status: 500 });
  }
}

// POST /api/trainers
export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, phone, specialty, salary } = body;

    if (!name || !phone || !specialty || salary === undefined) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const trainer = await db.trainer.create({
      data: {
        name: sanitize(String(name)),
        phone: sanitize(String(phone)),
        specialty: sanitize(String(specialty)),
        salary: parseFloat(String(salary)),
      },
    });

    return NextResponse.json({ trainer: { id: trainer.id, name: trainer.name }, message: 'Trainer added successfully' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add trainer', details: String(error) }, { status: 500 });
  }
}

// PUT /api/trainers
export async function PUT(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, name, phone, specialty, salary } = body;

    if (!id) {
      return NextResponse.json({ error: 'Trainer ID is required' }, { status: 400 });
    }

    const existing = await db.trainer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = sanitize(String(name));
    if (phone) updateData.phone = sanitize(String(phone));
    if (specialty) updateData.specialty = sanitize(String(specialty));
    if (salary !== undefined) updateData.salary = parseFloat(String(salary));

    const trainer = await db.trainer.update({ where: { id }, data: updateData });

    return NextResponse.json({ trainer: { id: trainer.id, name: trainer.name }, message: 'Trainer updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update trainer', details: String(error) }, { status: 500 });
  }
}

// DELETE /api/trainers
export async function DELETE(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Trainer ID is required' }, { status: 400 });
    }

    const existing = await db.trainer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }

    await db.auditLog.create({
      data: {
        action: 'DELETE_TRAINER',
        itemType: 'TRAINER',
        details: `Deleted trainer: ${existing.name} (${existing.specialty})`,
        performedBy: auth.username,
      },
    });

    await db.trainer.delete({ where: { id } });

    return NextResponse.json({ message: 'Trainer deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete trainer', details: String(error) }, { status: 500 });
  }
}

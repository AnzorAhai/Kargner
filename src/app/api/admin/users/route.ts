import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role, RoleType } from '@/types/order';

// Получить всех пользователей (только для ADMIN)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role as RoleType) !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(users);
}

// Удалить пользователя по id (только для ADMIN)
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role as RoleType) !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'User id required' }, { status: 400 });
  }
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// Изменить роль пользователя (ВОЗВРАЩАЕМ ПРОВЕРКУ НА АДМИНА)
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role as RoleType) !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'User ID and role are required' }, { status: 400 });
    }

    if (!Object.values(Role).includes(role as RoleType)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId as string },
      data: { role: role as RoleType },
      select: { 
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
} 
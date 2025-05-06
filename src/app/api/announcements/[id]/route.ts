import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        bids: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!announcement) {
      const res = NextResponse.json(
        { error: 'Объявление не найдено' },
        { status: 404 }
      );
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const res = NextResponse.json(announcement);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('Error fetching announcement:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении объявления' },
      { status: 500 }
    );
  }
} 
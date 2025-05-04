import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Получение списка объявлений
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const announcements = await prisma.announcement.findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, rating: true, ratingCount: true }
        },
        bids: userId
          ? { where: { userId }, select: { id: true, price: true } }
          : false,
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('Found announcements:', announcements);
    return NextResponse.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении объявлений' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Создание нового объявления
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('Received request body:', body);

    const { title, description, address, imageUrl } = body;

    if (!title || !description || !address || !imageUrl) {
      return NextResponse.json(
        { error: 'Все поля обязательны для заполнения' },
        { status: 400 }
      );
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        description,
        address,
        price: 0, // default price for intermediaries
        status: 'ACTIVE',
        imageUrl,
        userId: session.user.id,
      },
    });

    return NextResponse.json(announcement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании объявления' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 
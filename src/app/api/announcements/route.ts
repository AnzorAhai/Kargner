import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Announcement, Bid, User } from '@prisma/client-generated';

// Определим более точный тип для объявления с загруженными связями
type AnnouncementWithDetails = Announcement & {
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'rating' | 'ratingCount'>;
  bids: Pick<Bid, 'userId' | 'price'>[];
};

// Получение списка объявлений
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    const announcementsFromDb = await prisma.announcement.findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, rating: true, ratingCount: true }
        },
        bids: { // Fetch all bids for each announcement
          select: { userId: true, price: true }
        },
      },
      orderBy: { createdAt: 'desc' }
    });

    const announcements = announcementsFromDb.map((announcement: AnnouncementWithDetails) => {
      let minBidPrice: number | null = null;
      let currentUserBidPrice: number | null = null;

      if (announcement.bids && announcement.bids.length > 0) {
        minBidPrice = Math.min(...announcement.bids.map((b: Pick<Bid, 'userId' | 'price'>) => b.price));
        
        if (currentUserId && session?.user?.role === 'MASTER') {
          const userBid = announcement.bids.find((b: Pick<Bid, 'userId' | 'price'>) => b.userId === currentUserId);
          if (userBid) {
            currentUserBidPrice = userBid.price;
          }
        }
      }
      
      // Remove the full bids array from the final announcement object sent to the client for the main list,
      // as it might be large and is not directly used by the card after calculating min and current user's bid.
      // Keep other properties of the announcement.
      const { bids, ...announcementData } = announcement;

      return {
        ...announcementData,
        minBidPrice,
        currentUserBidPrice,
      };
    });

    // console.log('Processed announcements for list:', announcements); // Оставим для отладки, если понадобится
    return NextResponse.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении объявлений' },
      { status: 500 }
    );
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

    const { title, description, address, imageUrl, clientName, clientPhone, category } = body;

    if (!title || !description || !address || !imageUrl || !clientName || !clientPhone || !category) {
      return NextResponse.json(
        { error: 'Все поля обязательны для заполнения' },
        { status: 400 }
      );
    }

    const newAnnouncement = await prisma.announcement.create({
      data: {
        title,
        description,
        category,
        address,
        price: 0, // default price for intermediaries
        status: 'ACTIVE',
        imageUrl,
        userId: session.user.id,
        clientName,
        clientPhone,
      },
    });

    return NextResponse.json(newAnnouncement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании объявления' },
      { status: 500 }
    );
  }
} 
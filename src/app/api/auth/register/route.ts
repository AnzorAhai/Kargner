import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { firstName, lastName, phone, password, role } = await request.json();

    // Проверяем, существует ли пользователь с таким телефоном
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Пользователь с таким номером телефона уже существует' },
        { status: 400 }
      );
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем нового пользователя
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        phone,
        password: hashedPassword,
        role: role === 'INTERMEDIARY' ? 'INTERMEDIARY' : 'MASTER',
      },
    });

    return NextResponse.json(
      { 
        message: 'Пользователь успешно зарегистрирован',
        user: {
          id: user.id,
          role: user.role
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Произошла ошибка при регистрации' },
      { status: 500 }
    );
  }
} 
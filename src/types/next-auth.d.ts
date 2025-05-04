import 'next-auth';
import { Role } from '@prisma/client';
import { DefaultSession } from "next-auth";

declare module 'next-auth' {
  interface User {
    id: string;
    role: Role;
    phone: string;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      phone: string;
    } & DefaultSession["user"];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    phone: string;
  }
} 
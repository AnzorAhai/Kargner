'use client';

import { useSession } from 'next-auth/react';
import Navigation from './Navigation';

export default function BottomNav() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const navigationRole = userRole || null;
  return <Navigation role={navigationRole} />;
} 
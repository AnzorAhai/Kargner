'use client';

import { useSession } from 'next-auth/react';
import Navigation from './Navigation';

export default function BottomNav() {
  const { data: session } = useSession();
  const role = session?.user?.role || null;
  return <Navigation role={role} />;
} 
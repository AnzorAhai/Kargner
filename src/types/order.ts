import { Order, Announcement, Bid, User as PrismaUser, OrderStatus as PrismaOrderStatus, Role as PrismaRole } from '@prisma/client-generated';

// Re-export Prisma enums under potentially simpler names if needed, or use them directly.
// For clarity, let's use their Prisma names directly in this file and export them.
export type OrderStatus = PrismaOrderStatus;
export type Role = PrismaRole;

// Define a simpler User type for relations to avoid deep nesting or circular dependencies if not needed
interface RelatedUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}

interface RelatedAnnouncement {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  imageUrl: string | null;
  clientName: string | null;
  clientPhone: string | null;
  user: RelatedUser; // Intermediary who created the announcement
}

interface RelatedBid {
  price: number;
}

// This is the main type we'll use on the frontend for orders with their relations
export interface OrderWithRelations extends Order {
  announcement: RelatedAnnouncement;
  bid: RelatedBid | null; // Bid can be null if not applicable in some contexts, though usually present for an order
  master: RelatedUser; // Master assigned to the order
  // Add other relations if they are included in API responses and needed by the frontend
  // Ensure all fields expected by OrderCard are present or compatible.
  // For instance, OrderCard uses order.commission, order.masterId, order.mediatorId.
  // These are part of the base 'Order' type from Prisma, so they should be inherited.
} 
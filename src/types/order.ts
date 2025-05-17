import {
    Order as PrismaOrder, // Rename to avoid conflict if Order is defined below
    OrderStatus as PrismaOrderStatusEnum, // Rename enum import
    Role as PrismaRoleEnum, // Rename enum import
    // Import other Prisma types if needed by OrderWithRelations, e.g., Announcement, Bid, User
    User as PrismaUser,
    Announcement as PrismaAnnouncement,
    Bid as PrismaBid
} from '@prisma/client-generated';

// Export the enums directly
export const OrderStatus = PrismaOrderStatusEnum;
export const Role = PrismaRoleEnum;

// Export types for type annotations
export type OrderStatusType = PrismaOrderStatusEnum;
export type RoleType = PrismaRoleEnum;

// Define simpler related types if the full Prisma types are too complex or cause circular dependencies
interface RelatedUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  // Add other fields if needed by OrderCard or other components
}

interface RelatedAnnouncement {
  id: string;
  title: string;
  description: string;
  address: string;
  imageUrl: string;
  clientName: string;
  clientPhone: string;
  user: RelatedUser; // Intermediary who created the announcement
}

interface RelatedBid {
  id: string; // Assuming Bid has an id
  price: number;
  // Add other fields if needed
}

// Define the main Order type used on the frontend, extending Prisma's Order type
// Make sure this OrderWithRelations is compatible with what OrderCard expects
export interface OrderWithRelations extends PrismaOrder {
  announcement: RelatedAnnouncement;
  bid: RelatedBid | null; 
  master: RelatedUser;     // Master user assigned to the order
  status: OrderStatusType; // Use the exported type
  // Ensure all fields expected by OrderCard are present here or in PrismaOrder
  // e.g., OrderCard uses order.commission, order.masterId, order.mediatorId
  // These should be part of PrismaOrder if correctly defined in schema.prisma
}

// Example of a more specific User type if needed elsewhere, not directly for OrderWithRelations
export interface UserProfile extends PrismaUser {
    role: RoleType; // Use the exported type
    // additional fields or relations for a user profile page
} 
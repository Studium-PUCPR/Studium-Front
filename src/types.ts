export type UserRole = 'Student' | 'Professor' | 'Administrator';

export interface AuthUser {
  email: string;
  name: string;
  role: UserRole;
  sub: string;
  registrationNumber?: string;
  idToken: string;
  accessToken: string;
  expiresAt: number;
}

export interface Building {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface Room {
  id: string;
  buildingId: string;
  name: string;
  code: string;
  floor: number;
  capacity: number;
  type: string;
  isActive: boolean;
  mapPositionX?: number;
  mapPositionY?: number;
}

export interface RoomTimelineSlot {
  startsAtUtc: string;
  endsAtUtc: string;
  status: string;
  bookingId?: string;
  maintenanceBlockId?: string;
}

export interface Booking {
  id: string;
  roomId: string;
  userId: string;
  startsAtUtc: string;
  endsAtUtc: string;
  status: string;
  purpose?: string;
  checkInCode?: string;
  checkedInAtUtc?: string;
  cancelledAtUtc?: string;
  cancelledReason?: string;
  createdAtUtc: string;
}

export interface WaitlistEntry {
  id: string;
  roomId: string;
  userId: string;
  startsAtUtc: string;
  endsAtUtc: string;
  status: string;
  createdAtUtc: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  registrationNumber: string;
  role: number | string;
  phoneNumber?: string;
  notifyReminders: boolean;
  notifyConfirmations: boolean;
  isBlocked: boolean;
  blockReason?: string;
  noShowCount30Days: number;
  totalReservations30Days: number;
  completedReservations30Days: number;
  cancelledReservations30Days: number;
}

export interface NotificationItem {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status?: number;
  requestBody?: any;
  responseBody?: any;
  isError?: boolean;
}

import type { CurrentUser, UserRole } from '../lib/api';

export type { UserRole };
export type AppUser = CurrentUser;

export const mockCurrentUser: AppUser = {
  id: null,
  name: 'Ospite',
  email: null,
  role: 'anonymous',
  avatar: '◯',
};

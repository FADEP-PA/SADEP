import type { UserRole } from '@aep-pa/contracts';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
}

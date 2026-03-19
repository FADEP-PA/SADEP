import type { IncomingHttpHeaders } from 'node:http';

import type { AuthenticatedUser } from './authenticated-user.interface';

export interface AuthenticatedRequest {
  headers: IncomingHttpHeaders;
  user?: AuthenticatedUser;
}

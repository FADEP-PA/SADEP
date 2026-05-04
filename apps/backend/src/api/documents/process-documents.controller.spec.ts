import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@sadep/contracts';

import { ProcessDocumentsController } from './process-documents.controller';
import { ProcessDocumentsService } from '../../application/documents/process-documents.service';

describe('ProcessDocumentsController', () => {
  let controller: ProcessDocumentsController;
  let service: jest.Mocked<Pick<ProcessDocumentsService, 'signSupervisorEvaluationDocument'>>;

  const mockUser = {
    sub: 'user-123',
    email: 'intern@test.local',
    name: 'Servidor Interno',
    role: UserRole.INTERN_SERVER,
  };

  beforeEach(() => {
    service = {
      signSupervisorEvaluationDocument: jest.fn(),
    };

    controller = new ProcessDocumentsController(service as unknown as ProcessDocumentsService);
  });

  describe('signDocument', () => {
    it('should sign document successfully', async () => {
      const processId = 'process-123';

      service.signSupervisorEvaluationDocument.mockResolvedValue();

      const result = await controller.signDocument(processId, mockUser);

      expect(service.signSupervisorEvaluationDocument).toHaveBeenCalledWith(processId, mockUser);
      expect(result).toEqual({ success: true });
    });

    it('should throw UnauthorizedException when user not authenticated', async () => {
      const processId = 'process-123';

      await expect(controller.signDocument(processId, undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

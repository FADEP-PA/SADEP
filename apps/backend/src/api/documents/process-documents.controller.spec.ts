import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@aep-pa/contracts';

import { ProcessDocumentsController } from './process-documents.controller';
import { ProcessDocumentsService } from '../../application/documents/process-documents.service';

describe('ProcessDocumentsController', () => {
  let controller: ProcessDocumentsController;
  let service: jest.Mocked<ProcessDocumentsService>;

  const mockUser = {
    sub: 'user-123',
    role: UserRole.INTERN_SERVER,
  };

  beforeEach(async () => {
    const mockService = {
      signSupervisorEvaluationDocument: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessDocumentsController],
      providers: [
        {
          provide: ProcessDocumentsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ProcessDocumentsController>(ProcessDocumentsController);
    service = module.get(ProcessDocumentsService);
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

      await expect(controller.signDocument(processId, undefined)).rejects.toThrow(UnauthorizedException);
    });
  });
});
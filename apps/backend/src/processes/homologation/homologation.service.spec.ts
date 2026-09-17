import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProcessStatus, UserRole } from '@sadep/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ProcessStageService } from '../process-stage.service';
import { HomologationService } from './homologation.service';

const PROCESS_ID = 'proc-1';
const AUTHORITY_USER = {
  sub: 'auth-1',
  email: 'authority@test.local',
  name: 'Autoridade',
  role: UserRole.HOMOLOGATION_AUTHORITY,
};
const INTERN_USER = {
  sub: 'intern-1',
  email: 'intern@test.local',
  name: 'Servidor',
  role: UserRole.INTERN_SERVER,
};
const CESAD_USER = {
  sub: 'cesad-1',
  email: 'cesad@test.local',
  name: 'CESAD',
  role: UserRole.CESAD_MEMBER,
};

function makeProcess(status: string, evaluatedUserId = INTERN_USER.sub) {
  return { id: PROCESS_ID, status, evaluatedUserId };
}

function makeTx(overrides: Record<string, unknown> = {}) {
  return {
    evaluationProcess: { findUnique: jest.fn(), update: jest.fn() },
    cesadFinalOpinion: { findUnique: jest.fn() },
    homologationRecord: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    processDocument: { create: jest.fn() },
    auditEvent: { create: jest.fn() },
    ...overrides,
  };
}

describe('HomologationService', () => {
  let service: HomologationService;
  let prismaService: jest.Mocked<PrismaService>;
  let processStageService: jest.Mocked<ProcessStageService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomologationService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
            homologationRecord: { findUnique: jest.fn() },
            evaluationProcess: { findUnique: jest.fn() },
          },
        },
        {
          provide: ProcessStageService,
          useValue: {
            findProcessOrThrow: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(HomologationService);
    prismaService = module.get(PrismaService);
    processStageService = module.get(ProcessStageService);
  });

  describe('getStatus', () => {
    it('returns null fields when no HomologationRecord exists', async () => {
      processStageService.findProcessOrThrow.mockResolvedValue(
        makeProcess('PARECER_EMITIDO') as any,
      );
      (prismaService.homologationRecord.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getStatus(PROCESS_ID, AUTHORITY_USER);

      expect(result.processStatus).toBe(ProcessStatus.PARECER_EMITIDO);
      expect(result.homologatedAt).toBeNull();
      expect(result.notifiedAt).toBeNull();
      expect(result.acknowledgedAt).toBeNull();
    });

    it('throws ForbiddenException for disallowed roles', async () => {
      await expect(service.getStatus(PROCESS_ID, CESAD_USER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('approve', () => {
    it('creates HomologationRecord and transitions status to HOMOLOGADO', async () => {
      const tx = makeTx();
      const now = new Date();
      processStageService.findProcessOrThrow.mockResolvedValue(
        makeProcess('PARECER_EMITIDO') as any,
      );
      (tx.cesadFinalOpinion.findUnique as jest.Mock).mockResolvedValue({
        id: 'fo-1',
        sentToHomologationAt: now,
      });
      (tx.homologationRecord.findUnique as jest.Mock).mockResolvedValue(null);
      (tx.homologationRecord.create as jest.Mock).mockResolvedValue({
        id: 'hr-1',
        processId: PROCESS_ID,
        homologatedAt: now,
        homologatedByUserId: AUTHORITY_USER.sub,
        homologationRemarks: null,
        notifiedAt: null,
        notifiedByUserId: null,
        acknowledgedAt: null,
      });
      (prismaService.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));

      const result = await service.approve(PROCESS_ID, AUTHORITY_USER, {});

      expect(tx.homologationRecord.create).toHaveBeenCalled();
      expect(tx.processDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ documentType: 'HOMOLOGATION_RECORD' }) }),
      );
      expect(tx.evaluationProcess.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'HOMOLOGADO' } }),
      );
      expect(result.processStatus).toBe(ProcessStatus.HOMOLOGADO);
    });

    it('throws BadRequestException when process is not PARECER_EMITIDO', async () => {
      const tx = makeTx();
      processStageService.findProcessOrThrow.mockResolvedValue(makeProcess('HOMOLOGADO') as any);
      (prismaService.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));

      await expect(service.approve(PROCESS_ID, AUTHORITY_USER, {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws BadRequestException when CESAD final opinion was not sent to homologation', async () => {
      const tx = makeTx();
      processStageService.findProcessOrThrow.mockResolvedValue(
        makeProcess('PARECER_EMITIDO') as any,
      );
      (tx.cesadFinalOpinion.findUnique as jest.Mock).mockResolvedValue({
        id: 'fo-1',
        sentToHomologationAt: null,
      });
      (prismaService.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));

      await expect(service.approve(PROCESS_ID, AUTHORITY_USER, {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws ConflictException when HomologationRecord already exists', async () => {
      const tx = makeTx();
      const now = new Date();
      processStageService.findProcessOrThrow.mockResolvedValue(
        makeProcess('PARECER_EMITIDO') as any,
      );
      (tx.cesadFinalOpinion.findUnique as jest.Mock).mockResolvedValue({
        id: 'fo-1',
        sentToHomologationAt: now,
      });
      (tx.homologationRecord.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });
      (prismaService.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));

      await expect(service.approve(PROCESS_ID, AUTHORITY_USER, {})).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('throws ForbiddenException for non-authority roles', async () => {
      await expect(service.approve(PROCESS_ID, INTERN_USER, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('returnForRegularization', () => {
    it('transitions status back to EM_AVALIACAO', async () => {
      const tx = makeTx();
      processStageService.findProcessOrThrow.mockResolvedValue(
        makeProcess('PARECER_EMITIDO') as any,
      );
      (tx.homologationRecord.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));

      const result = await service.returnForRegularization(PROCESS_ID, AUTHORITY_USER, {});

      expect(tx.evaluationProcess.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'EM_AVALIACAO' } }),
      );
      expect(result.processStatus).toBe(ProcessStatus.EM_AVALIACAO);
    });

    it('throws BadRequestException when process is not PARECER_EMITIDO', async () => {
      const tx = makeTx();
      processStageService.findProcessOrThrow.mockResolvedValue(makeProcess('HOMOLOGADO') as any);
      (prismaService.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));

      await expect(
        service.returnForRegularization(PROCESS_ID, AUTHORITY_USER, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws ConflictException when process was already homologated', async () => {
      const tx = makeTx();
      processStageService.findProcessOrThrow.mockResolvedValue(
        makeProcess('PARECER_EMITIDO') as any,
      );
      (tx.homologationRecord.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });
      (prismaService.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));

      await expect(
        service.returnForRegularization(PROCESS_ID, AUTHORITY_USER, {}),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('notify', () => {
    it('updates HomologationRecord and transitions to NOTIFICADO', async () => {
      const tx = makeTx();
      const now = new Date();
      const record = {
        id: 'hr-1',
        processId: PROCESS_ID,
        homologatedAt: now,
        homologatedByUserId: AUTHORITY_USER.sub,
        homologationRemarks: null,
        notifiedAt: null,
        notifiedByUserId: null,
        acknowledgedAt: null,
      };
      processStageService.findProcessOrThrow.mockResolvedValue(makeProcess('HOMOLOGADO') as any);
      (tx.homologationRecord.findUnique as jest.Mock).mockResolvedValue(record);
      (tx.homologationRecord.update as jest.Mock).mockResolvedValue({
        ...record,
        notifiedAt: now,
        notifiedByUserId: AUTHORITY_USER.sub,
      });
      (prismaService.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));

      const result = await service.notify(PROCESS_ID, AUTHORITY_USER, {});

      expect(tx.homologationRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ notifiedByUserId: AUTHORITY_USER.sub }) }),
      );
      expect(tx.processDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ documentType: 'RESULT_NOTIFICATION' }) }),
      );
      expect(result.processStatus).toBe(ProcessStatus.NOTIFICADO);
    });

    it('throws ConflictException when notification already sent', async () => {
      const tx = makeTx();
      const now = new Date();
      processStageService.findProcessOrThrow.mockResolvedValue(makeProcess('HOMOLOGADO') as any);
      (tx.homologationRecord.findUnique as jest.Mock).mockResolvedValue({
        id: 'hr-1',
        notifiedAt: now,
      });
      (prismaService.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));

      await expect(service.notify(PROCESS_ID, AUTHORITY_USER, {})).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('throws NotFoundException when HomologationRecord does not exist', async () => {
      const tx = makeTx();
      processStageService.findProcessOrThrow.mockResolvedValue(makeProcess('HOMOLOGADO') as any);
      (tx.homologationRecord.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));

      await expect(service.notify(PROCESS_ID, AUTHORITY_USER, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('acknowledge', () => {
    it('records acknowledgement and transitions to CIENTE', async () => {
      const tx = makeTx();
      const now = new Date();
      const record = {
        id: 'hr-1',
        processId: PROCESS_ID,
        homologatedAt: now,
        homologatedByUserId: AUTHORITY_USER.sub,
        homologationRemarks: null,
        notifiedAt: now,
        notifiedByUserId: AUTHORITY_USER.sub,
        acknowledgedAt: null,
      };
      processStageService.findProcessOrThrow.mockResolvedValue(makeProcess('NOTIFICADO') as any);
      (tx.homologationRecord.findUnique as jest.Mock).mockResolvedValue(record);
      (tx.homologationRecord.update as jest.Mock).mockResolvedValue({
        ...record,
        acknowledgedAt: now,
      });
      (prismaService.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));

      const result = await service.acknowledge(PROCESS_ID, INTERN_USER);

      expect(tx.processDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ documentType: 'ACKNOWLEDGEMENT_RECORD' }) }),
      );
      expect(result.processStatus).toBe(ProcessStatus.CIENTE);
    });

    it('throws ForbiddenException when caller is not the evaluated server', async () => {
      const tx = makeTx();
      processStageService.findProcessOrThrow.mockResolvedValue(
        makeProcess('NOTIFICADO', 'other-intern') as any,
      );
      (prismaService.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));

      await expect(service.acknowledge(PROCESS_ID, INTERN_USER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws ConflictException when acknowledgement already recorded', async () => {
      const tx = makeTx();
      const now = new Date();
      processStageService.findProcessOrThrow.mockResolvedValue(makeProcess('NOTIFICADO') as any);
      (tx.homologationRecord.findUnique as jest.Mock).mockResolvedValue({
        id: 'hr-1',
        acknowledgedAt: now,
      });
      (prismaService.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));

      await expect(service.acknowledge(PROCESS_ID, INTERN_USER)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('throws BadRequestException when process is not NOTIFICADO', async () => {
      const tx = makeTx();
      processStageService.findProcessOrThrow.mockResolvedValue(makeProcess('HOMOLOGADO') as any);
      (prismaService.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));

      await expect(service.acknowledge(PROCESS_ID, INTERN_USER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});

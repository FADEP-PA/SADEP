import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CesadStageOpinionStatus, type CesadStageOpinionRef } from '@sadep/contracts';

import { ReadOnlyOpinionShell } from './read-only-opinion-shell';

const mockDraftOpinion: CesadStageOpinionRef = {
  id: 'op-1',
  scope: 'STAGE',
  processId: 'proc-1',
  processStageId: 'ps-1',
  authorUserId: 'user-1',
  status: CesadStageOpinionStatus.DRAFT,
  reportText: 'Relatorio da etapa',
  legalBasis: 'Art. 10 Decreto 1234',
  conclusion: 'Parecer favoravel',
  stageConcept: null,
  stageResult: null,
  completedAt: null,
  expectedSigners: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockCompletedOpinion: CesadStageOpinionRef = {
  ...mockDraftOpinion,
  id: 'op-2',
  status: CesadStageOpinionStatus.COMPLETED,
  stageConcept: 'Satisfatorio',
  stageResult: 'Aprovado',
  completedAt: '2024-06-15T10:30:00Z',
};

describe('ReadOnlyOpinionShell', () => {
  it('renderiza estado ausente quando opinion e null', () => {
    render(<ReadOnlyOpinionShell opinion={null} />);

    expect(screen.getByText('Parecer da etapa ausente')).toBeTruthy();
    expect(screen.getByText('Parecer ausente')).toBeTruthy();
  });

  it('renderiza campos do parecer quando opinion e DRAFT', () => {
    render(<ReadOnlyOpinionShell opinion={mockDraftOpinion} />);

    expect(screen.getByText('Relatorio da etapa')).toBeTruthy();
    expect(screen.getByText('Art. 10 Decreto 1234')).toBeTruthy();
    expect(screen.getByText('Parecer favoravel')).toBeTruthy();
  });

  it('renderiza campos do parecer quando opinion e COMPLETED', () => {
    render(<ReadOnlyOpinionShell opinion={mockCompletedOpinion} />);

    expect(screen.getByText('Relatorio da etapa')).toBeTruthy();
    expect(screen.getByText('Parecer favoravel')).toBeTruthy();
    expect(screen.getByText('Satisfatorio')).toBeTruthy();
    expect(screen.getByText('Aprovado')).toBeTruthy();
  });

  it('exibe status badge com label correto para DRAFT', () => {
    render(<ReadOnlyOpinionShell opinion={mockDraftOpinion} />);

    expect(screen.getByText('Parecer em elaboracao')).toBeTruthy();
  });

  it('exibe status badge com label correto para COMPLETED', () => {
    render(<ReadOnlyOpinionShell opinion={mockCompletedOpinion} />);

    expect(screen.getByText('Parecer pronto/consolidado')).toBeTruthy();
  });

  it('exibe labels de stage e process', () => {
    render(
      <ReadOnlyOpinionShell
        opinion={mockDraftOpinion}
        stageLabel="Etapa 1 - ETAPA_1"
        processLabel="proc-abc"
      />,
    );

    expect(screen.getByText('Etapa 1 - ETAPA_1')).toBeTruthy();
    expect(screen.getByText('proc-abc')).toBeTruthy();
  });
});

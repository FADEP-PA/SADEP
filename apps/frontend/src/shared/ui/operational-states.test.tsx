import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  AccessBlockedState,
  ClearState,
  EmptyState,
  InsufficientHistoryState,
  MissingDocumentState,
  ProcessNotFoundState,
  ReadNotReleasedState,
  StageUnavailableState,
  TemporaryUnavailableState,
} from './operational-states';

describe('operational-states', () => {
  describe('EmptyState', () => {
    it('renders a concise default empty state', () => {
      render(<EmptyState />);

      expect(screen.getByText('Nenhum registro disponível')).toBeTruthy();
      expect(
        screen.getByText('Não há informações para exibir agora.'),
      ).toBeTruthy();
      expect(screen.queryByText('Sem dados')).toBeNull();
    });

    it('accepts custom institutional title and description without altering the badge', () => {
      render(
        <EmptyState
          title="Sem servidores no filtro"
          description="Os filtros atuais nao retornaram registros para esta consulta."
        />,
      );

      expect(screen.getByText('Sem servidores no filtro')).toBeTruthy();
      expect(
        screen.getByText('Os filtros atuais nao retornaram registros para esta consulta.'),
      ).toBeTruthy();
      expect(screen.queryByText('Sem dados')).toBeNull();
    });
  });

  describe('AccessBlockedState', () => {
    it('renders the default access-blocked title and next step', () => {
      render(<AccessBlockedState />);

      expect(screen.getByText('Acesso não permitido')).toBeTruthy();
      expect(
        screen.getByText('Seu perfil não possui acesso a esta página.'),
      ).toBeTruthy();
    });
  });

  describe('TemporaryUnavailableState', () => {
    it('renders the default temporarily unavailable institutional copy', () => {
      render(<TemporaryUnavailableState />);

      expect(screen.getByText('Conteúdo temporariamente indisponível')).toBeTruthy();
      expect(screen.getByText('Tente novamente.')).toBeTruthy();
    });
  });

  describe('ProcessNotFoundState', () => {
    it('renders the default process-not-found title and next step', () => {
      render(<ProcessNotFoundState />);

      expect(screen.getByText('Processo não encontrado')).toBeTruthy();
      expect(screen.getByText('Volte à lista e tente novamente.')).toBeTruthy();
    });

    it('accepts custom institutional title and description without altering the badge', () => {
      render(
        <ProcessNotFoundState
          title="Processo nao localizado nesta consulta"
          description="Confira o identificador informado e tente novamente."
        />,
      );

      expect(screen.getByText('Processo nao localizado nesta consulta')).toBeTruthy();
      expect(
        screen.getByText('Confira o identificador informado e tente novamente.'),
      ).toBeTruthy();
    });
  });

  describe('StageUnavailableState', () => {
    it('renders the default stage-unavailable institutional copy', () => {
      render(<StageUnavailableState />);

      expect(screen.getByText('Etapa indisponível')).toBeTruthy();
      expect(screen.getByText('Esta etapa ainda não está disponível.')).toBeTruthy();
    });
  });

  describe('MissingDocumentState', () => {
    it('renders the default missing-document institutional copy', () => {
      render(<MissingDocumentState />);

      expect(screen.getByText('Documento ausente')).toBeTruthy();
      expect(screen.getByText('Este documento ainda não está disponível.')).toBeTruthy();
    });

    it('renders extra institutional details passed via the children slot', () => {
      render(
        <MissingDocumentState>
          <p>Solicite o reenvio do documento institucional para prosseguir.</p>
        </MissingDocumentState>,
      );

      expect(screen.getByText('Documento ausente')).toBeTruthy();
      expect(
        screen.getByText('Solicite o reenvio do documento institucional para prosseguir.'),
      ).toBeTruthy();
    });
  });

  describe('ReadNotReleasedState', () => {
    it('renders the default read-not-released institutional copy', () => {
      render(<ReadNotReleasedState />);

      expect(screen.getByText('Leitura ainda não liberada')).toBeTruthy();
      expect(screen.getByText('Este conteúdo ainda não está disponível.')).toBeTruthy();
    });
  });

  describe('InsufficientHistoryState', () => {
    it('renders the default insufficient-history institutional copy', () => {
      render(<InsufficientHistoryState />);

      expect(screen.getByText('Nenhuma movimentação registrada')).toBeTruthy();
      expect(
        screen.getByText('O histórico aparecerá aqui quando houver uma atualização.'),
      ).toBeTruthy();
    });
  });

  describe('ClearState', () => {
    it('renders the default clear-state institutional copy', () => {
      render(<ClearState />);

      expect(screen.getByText('Nenhuma pendência')).toBeTruthy();
      expect(screen.getByText('Você não possui ações para realizar agora.')).toBeTruthy();
    });

    it('accepts custom institutional title and description without altering the badge', () => {
      render(
        <ClearState
          title="Sem pendencias na leitura desta etapa"
          description="A leitura operacional nao indica bloqueios para o perfil autenticado."
        />,
      );

      expect(screen.getByText('Sem pendencias na leitura desta etapa')).toBeTruthy();
      expect(
        screen.getByText(
          'A leitura operacional nao indica bloqueios para o perfil autenticado.',
        ),
      ).toBeTruthy();
    });
  });
});

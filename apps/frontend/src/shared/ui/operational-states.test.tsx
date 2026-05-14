import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  AccessBlockedState,
  ClearState,
  DemonstrationModeState,
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
    it('renders the default institutional empty title, description and badge', () => {
      render(<EmptyState />);

      expect(screen.getByText('Nenhum registro disponivel')).toBeTruthy();
      expect(
        screen.getByText('Ainda nao ha informacoes disponiveis para esta consulta.'),
      ).toBeTruthy();
      expect(screen.getByText('Sem dados')).toBeTruthy();
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
      expect(screen.getByText('Sem dados')).toBeTruthy();
    });
  });

  describe('AccessBlockedState', () => {
    it('renders the default access-blocked title, description and badge', () => {
      render(<AccessBlockedState />);

      expect(screen.getByText('Acesso bloqueado')).toBeTruthy();
      expect(
        screen.getByText(
          'O perfil autenticado nao possui permissao para acessar este conteudo no momento.',
        ),
      ).toBeTruthy();
      expect(screen.getByText('Acesso')).toBeTruthy();
    });
  });

  describe('TemporaryUnavailableState', () => {
    it('renders the default temporarily unavailable institutional copy', () => {
      render(<TemporaryUnavailableState />);

      expect(screen.getByText('Conteudo temporariamente indisponivel')).toBeTruthy();
      expect(
        screen.getByText('Esta informacao ainda nao esta disponivel para exibicao neste perfil.'),
      ).toBeTruthy();
      expect(screen.getByText('Indisponivel')).toBeTruthy();
    });
  });

  describe('DemonstrationModeState', () => {
    it('renders the default demonstration mode title, description and badge', () => {
      render(<DemonstrationModeState />);

      expect(screen.getByText('Visualizacao demonstrativa')).toBeTruthy();
      expect(
        screen.getByText(
          'Esta area usa dados ficticios e seguros para apresentacao visual enquanto a consulta autenticada nao estiver carregada.',
        ),
      ).toBeTruthy();
      expect(screen.getByText('Demonstracao')).toBeTruthy();
    });

    it('renders extra institutional details passed via the children slot', () => {
      render(
        <DemonstrationModeState
          title="Painel demonstrativo"
          description="A consulta autenticada ainda nao foi carregada."
        >
          <p>Informe um identificador de processo para carregar os dados reais.</p>
        </DemonstrationModeState>,
      );

      expect(screen.getByText('Painel demonstrativo')).toBeTruthy();
      expect(
        screen.getByText('A consulta autenticada ainda nao foi carregada.'),
      ).toBeTruthy();
      expect(
        screen.getByText('Informe um identificador de processo para carregar os dados reais.'),
      ).toBeTruthy();
      expect(screen.getByText('Demonstracao')).toBeTruthy();
    });
  });

  describe('ProcessNotFoundState', () => {
    it('renders the default process-not-found title, description and badge', () => {
      render(<ProcessNotFoundState />);

      expect(screen.getByText('Processo não encontrado')).toBeTruthy();
      expect(
        screen.getByText(
          'O identificador informado nao retornou processo disponivel para este perfil. Confira o codigo e tente novamente.',
        ),
      ).toBeTruthy();
      expect(screen.getByText('Processo')).toBeTruthy();
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
      expect(screen.getByText('Processo')).toBeTruthy();
    });
  });

  describe('StageUnavailableState', () => {
    it('renders the default stage-unavailable institutional copy', () => {
      render(<StageUnavailableState />);

      expect(screen.getByText('Etapa indisponível')).toBeTruthy();
      expect(
        screen.getByText(
          'A etapa solicitada ainda nao esta disponivel para leitura neste contexto operacional.',
        ),
      ).toBeTruthy();
      expect(screen.getByText('Etapa')).toBeTruthy();
    });
  });

  describe('MissingDocumentState', () => {
    it('renders the default missing-document institutional copy', () => {
      render(<MissingDocumentState />);

      expect(screen.getByText('Documento ausente')).toBeTruthy();
      expect(
        screen.getByText(
          'O documento esperado ainda nao foi localizado ou formalizado para esta etapa.',
        ),
      ).toBeTruthy();
      expect(screen.getByText('Documento')).toBeTruthy();
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
      expect(screen.getByText('Documento')).toBeTruthy();
    });
  });

  describe('ReadNotReleasedState', () => {
    it('renders the default read-not-released institutional copy', () => {
      render(<ReadNotReleasedState />);

      expect(screen.getByText('Leitura ainda não liberada')).toBeTruthy();
      expect(
        screen.getByText(
          'A leitura completa deste conteudo ainda nao esta disponivel para o momento processual atual.',
        ),
      ).toBeTruthy();
      expect(screen.getByText('Leitura')).toBeTruthy();
    });
  });

  describe('InsufficientHistoryState', () => {
    it('renders the default insufficient-history institutional copy', () => {
      render(<InsufficientHistoryState />);

      expect(screen.getByText('Histórico insuficiente')).toBeTruthy();
      expect(
        screen.getByText(
          'Ainda nao ha eventos auditaveis suficientes para compor a leitura operacional desta area.',
        ),
      ).toBeTruthy();
      expect(screen.getByText('Histórico')).toBeTruthy();
    });
  });

  describe('ClearState', () => {
    it('renders the default clear-state institutional copy', () => {
      render(<ClearState />);

      expect(screen.getByText('Nenhuma pendencia identificada')).toBeTruthy();
      expect(
        screen.getByText(
          'Os dados disponiveis nao indicam bloqueios para esta leitura operacional.',
        ),
      ).toBeTruthy();
      expect(screen.getByText('Regular')).toBeTruthy();
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
      expect(screen.getByText('Regular')).toBeTruthy();
    });
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  AccessBlockedState,
  DemonstrationModeState,
  EmptyState,
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
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProcessRequestFeedback } from './process-request-feedback';

describe('ProcessRequestFeedback', () => {
  it('retorna null quando nao ha mensagem de erro', () => {
    const { container } = render(
      <ProcessRequestFeedback
        status={null}
        message={null}
        genericTitle="Falha ao carregar processo"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza estado de processo nao encontrado para erro 404', () => {
    render(
      <ProcessRequestFeedback
        status={404}
        message="O identificador informado nao retornou processo disponivel para este perfil."
        details={['Confira o codigo informado.', 'Tente novamente apos atualizar a consulta.']}
        genericTitle="Falha ao carregar processo"
      />,
    );

    expect(screen.getByText('Processo')).toBeInTheDocument();
    expect(screen.getByText(/Processo n.o encontrado/)).toBeInTheDocument();
    expect(
      screen.getByText('O identificador informado nao retornou processo disponivel para este perfil.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Confira o codigo informado.')).toBeInTheDocument();
    expect(screen.getByText('Tente novamente apos atualizar a consulta.')).toBeInTheDocument();
  });

  it('renderiza estado de acesso bloqueado para erro 403', () => {
    render(
      <ProcessRequestFeedback
        status={403}
        message="O perfil autenticado nao possui permissao para acessar este processo."
        details={['A consulta deve respeitar a autorizacao contextual do servico.']}
        genericTitle="Falha ao carregar processo"
      />,
    );

    expect(screen.getByText('Acesso')).toBeInTheDocument();
    expect(screen.getByText('Acesso bloqueado')).toBeInTheDocument();
    expect(
      screen.getByText('O perfil autenticado nao possui permissao para acessar este processo.'),
    ).toBeInTheDocument();
    expect(screen.getByText('A consulta deve respeitar a autorizacao contextual do servico.')).toBeInTheDocument();
  });

  it('renderiza estado temporariamente indisponivel para erro generico', () => {
    render(
      <ProcessRequestFeedback
        status={500}
        message="Nao foi possivel carregar os dados do processo."
        details={['Tente novamente em instantes.']}
        genericTitle="Falha ao carregar processo"
      />,
    );

    expect(screen.getByText('Indisponivel')).toBeInTheDocument();
    expect(screen.getByText('Falha ao carregar processo')).toBeInTheDocument();
    expect(screen.getByText('Nao foi possivel carregar os dados do processo.')).toBeInTheDocument();
    expect(screen.getByText('Tente novamente em instantes.')).toBeInTheDocument();
  });
});

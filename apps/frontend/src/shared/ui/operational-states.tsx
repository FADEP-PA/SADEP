import type { ReactNode } from 'react';

import { ContentState } from './content-state';

type OperationalStateFrameProps = {
  badge: string;
  title: string;
  description: string;
  tone: 'info' | 'warning' | 'error';
  children?: ReactNode;
};

type OperationalStateProps = {
  title?: string;
  description?: string;
  children?: ReactNode;
};

function OperationalStateFrame({
  badge,
  title,
  description,
  tone,
  children,
}: OperationalStateFrameProps) {
  return (
    <div className="operational-state">
      <span className={`operational-state__badge operational-state__badge--${tone}`}>{badge}</span>
      <ContentState title={title} description={description} tone={tone}>
        {children}
      </ContentState>
    </div>
  );
}

export function ProcessNotFoundState({
  title = 'Processo não encontrado',
  description = 'O identificador informado não retornou um processo acessível para este perfil. Confira o código e tente novamente.',
  children,
}: OperationalStateProps) {
  return (
    <OperationalStateFrame badge="Processo" title={title} description={description} tone="warning">
      {children}
    </OperationalStateFrame>
  );
}

export function AccessBlockedState({
  title = 'Acesso bloqueado',
  description = 'O perfil autenticado não possui permissão para acessar este conteúdo no momento.',
  children,
}: OperationalStateProps) {
  return (
    <OperationalStateFrame badge="Acesso" title={title} description={description} tone="error">
      {children}
    </OperationalStateFrame>
  );
}

export function StageUnavailableState({
  title = 'Etapa indisponível',
  description = 'A etapa solicitada ainda não está disponível para leitura neste contexto operacional.',
  children,
}: OperationalStateProps) {
  return (
    <OperationalStateFrame badge="Etapa" title={title} description={description} tone="warning">
      {children}
    </OperationalStateFrame>
  );
}

export function MissingDocumentState({
  title = 'Documento ausente',
  description = 'O documento esperado ainda não foi localizado ou formalizado para esta etapa.',
  children,
}: OperationalStateProps) {
  return (
    <OperationalStateFrame badge="Documento" title={title} description={description} tone="warning">
      {children}
    </OperationalStateFrame>
  );
}

export function ReadNotReleasedState({
  title = 'Leitura ainda não liberada',
  description = 'O backend ainda não liberou a leitura completa deste conteúdo para o momento processual atual.',
  children,
}: OperationalStateProps) {
  return (
    <OperationalStateFrame badge="Leitura" title={title} description={description} tone="info">
      {children}
    </OperationalStateFrame>
  );
}

export function InsufficientHistoryState({
  title = 'Histórico insuficiente',
  description = 'Ainda não há eventos auditáveis suficientes para compor a leitura operacional desta área.',
  children,
}: OperationalStateProps) {
  return (
    <OperationalStateFrame badge="Histórico" title={title} description={description} tone="warning">
      {children}
    </OperationalStateFrame>
  );
}

export function EmptyState({
  title = 'Nenhum registro disponivel',
  description = 'Ainda nao ha informacoes para exibir neste painel.',
  children,
}: OperationalStateProps) {
  return (
    <OperationalStateFrame badge="Sem dados" title={title} description={description} tone="info">
      {children}
    </OperationalStateFrame>
  );
}

export function TemporaryUnavailableState({
  title = 'Conteudo temporariamente indisponivel',
  description = 'Este conteudo ainda depende de uma integracao ou liberacao operacional para aparecer aqui.',
  children,
}: OperationalStateProps) {
  return (
    <OperationalStateFrame badge="Indisponivel" title={title} description={description} tone="warning">
      {children}
    </OperationalStateFrame>
  );
}

export function DemonstrationModeState({
  title = 'Modo demonstrativo preservado',
  description = 'Esta visualizacao usa dados ficticios para manter a validacao visual enquanto a integracao real nao esta disponivel.',
  children,
}: OperationalStateProps) {
  return (
    <OperationalStateFrame badge="Demonstracao" title={title} description={description} tone="info">
      {children}
    </OperationalStateFrame>
  );
}

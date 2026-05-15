import type { ReactNode } from 'react';

import { ContentState } from './content-state';

type OperationalStateFrameProps = {
  badge: string;
  title: string;
  description: string;
  tone: 'info' | 'warning' | 'error' | 'success';
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
  description = 'O identificador informado nao retornou processo disponivel para este perfil. Confira o codigo e tente novamente.',
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
  description = 'O perfil autenticado nao possui permissao para acessar este conteudo no momento.',
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
  description = 'A etapa solicitada ainda nao esta disponivel para leitura neste contexto operacional.',
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
  description = 'O documento esperado ainda nao foi localizado ou formalizado para esta etapa.',
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
  description = 'A leitura completa deste conteudo ainda nao esta disponivel para o momento processual atual.',
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
  description = 'Ainda nao ha eventos auditaveis suficientes para compor a leitura operacional desta area.',
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
  description = 'Ainda nao ha informacoes disponiveis para esta consulta.',
  children,
}: OperationalStateProps) {
  return (
    <OperationalStateFrame badge="Sem dados" title={title} description={description} tone="info">
      {children}
    </OperationalStateFrame>
  );
}

export function ClearState({
  title = 'Nenhuma pendencia identificada',
  description = 'Os dados disponiveis nao indicam bloqueios para esta leitura operacional.',
  children,
}: OperationalStateProps) {
  return (
    <OperationalStateFrame badge="Regular" title={title} description={description} tone="success">
      {children}
    </OperationalStateFrame>
  );
}

export function TemporaryUnavailableState({
  title = 'Conteudo temporariamente indisponivel',
  description = 'Esta informacao ainda nao esta disponivel para exibicao neste perfil.',
  children,
}: OperationalStateProps) {
  return (
    <OperationalStateFrame badge="Indisponivel" title={title} description={description} tone="warning">
      {children}
    </OperationalStateFrame>
  );
}

export function DemonstrationModeState({
  title = 'Visualizacao demonstrativa',
  description = 'Esta area usa dados ficticios e seguros para apresentacao visual enquanto a consulta autenticada nao estiver carregada.',
  children,
}: OperationalStateProps) {
  return (
    <OperationalStateFrame badge="Demonstracao" title={title} description={description} tone="info">
      {children}
    </OperationalStateFrame>
  );
}

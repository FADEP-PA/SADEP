import type { ReactNode } from 'react';

import { ContentState } from './content-state';

type OperationalStateProps = {
  title?: string;
  description?: string;
  children?: ReactNode;
};

export function ProcessNotFoundState({
  title = 'Processo não encontrado',
  description = 'Volte à lista e tente novamente.',
  children,
}: OperationalStateProps) {
  return <ContentState title={title} description={description} tone="warning">{children}</ContentState>;
}

export function AccessBlockedState({
  title = 'Acesso não permitido',
  description = 'Seu perfil não possui acesso a esta página.',
  children,
}: OperationalStateProps) {
  return <ContentState title={title} description={description} tone="error">{children}</ContentState>;
}

export function StageUnavailableState({
  title = 'Etapa indisponível',
  description = 'Esta etapa ainda não está disponível.',
  children,
}: OperationalStateProps) {
  return <ContentState title={title} description={description} tone="warning">{children}</ContentState>;
}

export function MissingDocumentState({
  title = 'Documento ausente',
  description = 'Este documento ainda não está disponível.',
  children,
}: OperationalStateProps) {
  return <ContentState title={title} description={description} tone="warning">{children}</ContentState>;
}

export function ReadNotReleasedState({
  title = 'Leitura ainda não liberada',
  description = 'Este conteúdo ainda não está disponível.',
  children,
}: OperationalStateProps) {
  return <ContentState title={title} description={description} tone="info">{children}</ContentState>;
}

export function InsufficientHistoryState({
  title = 'Nenhuma movimentação registrada',
  description = 'O histórico aparecerá aqui quando houver uma atualização.',
  children,
}: OperationalStateProps) {
  return <ContentState title={title} description={description} tone="info">{children}</ContentState>;
}

export function EmptyState({
  title = 'Nenhum registro disponível',
  description = 'Não há informações para exibir agora.',
  children,
}: OperationalStateProps) {
  return <ContentState title={title} description={description} tone="info">{children}</ContentState>;
}

export function ClearState({
  title = 'Nenhuma pendência',
  description = 'Você não possui ações para realizar agora.',
  children,
}: OperationalStateProps) {
  return <ContentState title={title} description={description} tone="success">{children}</ContentState>;
}

export function TemporaryUnavailableState({
  title = 'Conteúdo temporariamente indisponível',
  description = 'Tente novamente.',
  children,
}: OperationalStateProps) {
  return <ContentState title={title} description={description} tone="warning">{children}</ContentState>;
}

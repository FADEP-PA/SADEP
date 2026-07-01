import {
  CesadCommissionActType,
  CesadCommissionMemberRoleType,
  CesadCommissionStatus,
} from '@sadep/contracts';

import type { StatusBadgeTone } from '@/shared/ui/status-badge';

import type { CesadCommissionTemporalSituation } from '../data/cesad-commission-admin-demo';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
  year: 'numeric',
});

export function formatCesadCommissionStatus(status: CesadCommissionStatus) {
  const labels: Record<CesadCommissionStatus, string> = {
    [CesadCommissionStatus.ACTIVE]: 'Ativa',
    [CesadCommissionStatus.INACTIVE]: 'Inativa',
    [CesadCommissionStatus.SUPERSEDED]: 'Supersedida',
  };

  return labels[status];
}

export function getCesadCommissionStatusTone(status: CesadCommissionStatus): StatusBadgeTone {
  if (status === CesadCommissionStatus.ACTIVE) return 'success';
  if (status === CesadCommissionStatus.SUPERSEDED) return 'warning';
  return 'neutral';
}

export function formatCesadTemporalSituation(situation: CesadCommissionTemporalSituation) {
  const labels: Record<CesadCommissionTemporalSituation, string> = {
    FUTURE: 'Futura/agendada',
    CURRENT: 'Vigente',
    CLOSED: 'Encerrada',
    INACTIVE: 'Inativa',
    SUPERSEDED: 'Supersedida',
  };

  return labels[situation];
}

export function getCesadTemporalSituationTone(
  situation: CesadCommissionTemporalSituation,
): StatusBadgeTone {
  const tones: Record<CesadCommissionTemporalSituation, StatusBadgeTone> = {
    FUTURE: 'info',
    CURRENT: 'success',
    CLOSED: 'neutral',
    INACTIVE: 'warning',
    SUPERSEDED: 'warning',
  };

  return tones[situation];
}

export function formatCesadActType(type: CesadCommissionActType) {
  const labels: Record<CesadCommissionActType, string> = {
    [CesadCommissionActType.CONSTITUTION]: 'Constituição',
    [CesadCommissionActType.AMENDMENT]: 'Alteração',
    [CesadCommissionActType.RENEWAL]: 'Renovação',
  };

  return labels[type];
}

export function formatCesadMemberRoleType(type: CesadCommissionMemberRoleType) {
  const labels: Record<CesadCommissionMemberRoleType, string> = {
    [CesadCommissionMemberRoleType.TITULAR]: 'Titular',
    [CesadCommissionMemberRoleType.SUPLENTE]: 'Suplente',
  };

  return labels[type];
}

export function formatCesadDate(value: string | null) {
  if (!value) return 'Sem data fim';
  return dateFormatter.format(new Date(value));
}

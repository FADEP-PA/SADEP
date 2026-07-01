import { CesadCommissionMemberRoleType, UserRole } from '@sadep/contracts';

import { StatusBadge } from '@/shared/ui/status-badge';

import type { CesadCommissionMemberDisplayRef } from '../data/cesad-commission-admin-demo';
import {
  formatCesadDate,
  formatCesadMemberRoleType,
} from './cesad-commission-formatters';

type CesadCommissionMembersTableProps = {
  title: string;
  members: CesadCommissionMemberDisplayRef[];
  roleType: CesadCommissionMemberRoleType;
  expectedMinimum: number;
};

function formatUserRole(role: UserRole) {
  if (role === UserRole.CESAD_MEMBER) return 'Membro CESAD';
  if (role === UserRole.COMMISSION_ASSISTANT) return 'Assistente';
  return role;
}

export function CesadCommissionMembersTable({
  title,
  members,
  roleType,
  expectedMinimum,
}: CesadCommissionMembersTableProps) {
  const filteredMembers = members.filter((member) => member.roleType === roleType);
  const hasMinimumComposition = filteredMembers.length >= expectedMinimum;

  return (
    <section className="surface-card cesad-members-card">
      <div className="cesad-commission-card-header">
        <div>
          <span className="section-chip">{formatCesadMemberRoleType(roleType)}</span>
          <h3>{title}</h3>
        </div>
        <StatusBadge
          label={`${filteredMembers.length} de ${expectedMinimum}`}
          tone={hasMinimumComposition ? 'success' : 'warning'}
        />
      </div>

      <div className="cesad-member-table">
        <div className="cesad-member-table__header" aria-hidden="true">
          <span>Integrante</span>
          <span>Perfil</span>
          <span>Área</span>
          <span>Vínculo</span>
        </div>

        {filteredMembers.map((member) => (
          <article key={member.id} className="cesad-member-table__row">
            <div className="cesad-member-table__cell cesad-member-table__cell--title">
              <span data-label="Integrante">{member.displayName}</span>
              <small>{member.userId}</small>
            </div>
            <div className="cesad-member-table__cell" data-label="Perfil">
              <span>{formatUserRole(member.userRole)}</span>
            </div>
            <div className="cesad-member-table__cell" data-label="Área">
              <span>{member.institutionalArea}</span>
            </div>
            <div className="cesad-member-table__cell" data-label="Vínculo">
              <span>
                {formatCesadDate(member.startDate)} até {formatCesadDate(member.endDate)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

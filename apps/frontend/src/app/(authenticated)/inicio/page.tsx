'use client';

import { ProcessWorkspace } from '@/features/process/components/process-workspace';
import { useAuth } from '@/shared/auth/auth-context';
import { InfoCard } from '@/shared/ui/info-card';

const overviewCards = [
  {
    title: 'Leitura do estado atual',
    description: 'Consulta do status do processo com base no workflow definido no backend.',
  },
  {
    title: 'Ações disponíveis',
    description: 'Exibição das operações permitidas para o perfil autenticado no momento da consulta.',
  },
  {
    title: 'Histórico resumido',
    description: 'Apresentação da última movimentação auditável para apoio operacional da etapa atual.',
  },
];

export default function TechnicalHomePage() {
  const { session } = useAuth();

  return (
    <section className="technical-home">
      <div className="technical-home__hero">
        <div>
          <span className="technical-home__badge">Central de processos</span>
          <h2>Acompanhamento funcional do fluxo</h2>
          <p>
            A área autenticada passa a concentrar a primeira estrutura de telas do processo administrativo,
            com foco em consulta de estado, ações liberadas, histórico e preparação das próximas visões por perfil.
          </p>
        </div>

        <div className="technical-home__panel">
          <strong>Sessão ativa</strong>
          <ul>
            <li>Usuário autenticado: {session?.user.email}</li>
            <li>Perfil ativo: {session?.user.role}</li>
            <li>Leitura protegida por autenticação da aplicação.</li>
          </ul>
        </div>
      </div>

      <div className="metrics-grid">
        {overviewCards.map((card) => (
          <InfoCard key={card.title} title={card.title} description={card.description} />
        ))}
      </div>

      <ProcessWorkspace />
    </section>
  );
}

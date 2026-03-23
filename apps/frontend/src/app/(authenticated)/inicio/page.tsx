'use client';

import Link from 'next/link';

import { useAuth } from '@/shared/auth/auth-context';
import { getRolePresentation } from '@/shared/rbac/role-catalog';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';

const overviewCards = [
  {
    title: 'Consulta do processo',
    description: 'Acesso direto à leitura do status, do histórico e das ações autorizadas no fluxo.',
  },
  {
    title: 'Áreas por perfil',
    description: 'Cada papel institucional possui uma área própria disponível pela navegação lateral.',
  },
  {
    title: 'Rastreabilidade',
    description: 'As informações exibidas respeitam autenticação, perfil de acesso e dados do backend.',
  },
];

export default function TechnicalHomePage() {
  const { session } = useAuth();
  const rolePresentation = session ? getRolePresentation(session.user.role) : null;

  return (
    <section className="technical-home">
      <div className="technical-home__hero technical-home__hero--institutional">
        <article className="technical-home__hero-panel">
          <span className="technical-home__badge">Painel central</span>
          <h2>Ambiente organizado para navegação operacional</h2>
          <p>
            Use a barra lateral para acessar diretamente a consulta de processos, sua área de atuação
            e as demais telas liberadas para o seu perfil.
          </p>

          <div className="technical-home__hero-actions">
            <Link href="/processos" className="secondary-button technical-home__link-button">
              Abrir processos
            </Link>
            <Link
              href={rolePresentation?.homePath ?? '/perfil'}
              className="ghost-button technical-home__link-button"
            >
              Ir para minha área
            </Link>
          </div>
        </article>

        <aside className="technical-home__panel technical-home__panel--institutional">
          <span className="technical-home__section-label">Sessão autenticada</span>
          <KeyValueList
            items={[
              { label: 'Usuário', value: session?.user.email ?? 'Não informado' },
              { label: 'Perfil', value: rolePresentation?.label ?? session?.user.role ?? 'Não informado' },
              { label: 'Área principal', value: rolePresentation?.homePath ?? 'Não informada' },
            ]}
          />
          <p className="technical-home__paragraph">
            Todos os acessos disponíveis para este perfil estão organizados na barra lateral.
          </p>
        </aside>
      </div>

      <div className="metrics-grid">
        {overviewCards.map((card) => (
          <InfoCard
            key={card.title}
            eyebrow="Navegação"
            title={card.title}
            description={card.description}
          />
        ))}
      </div>

      <div className="technical-home__institutional-grid">
        <InfoCard
          eyebrow="Perfil em operação"
          title={rolePresentation?.label ?? 'Perfil não identificado'}
          description={rolePresentation?.description ?? 'A sessão atual não retornou um perfil catalogado.'}
        >
          <p className="muted-paragraph">
            A navegação lateral mantém o acesso principal às telas disponíveis para este papel.
          </p>
        </InfoCard>

        <InfoCard
          eyebrow="Como navegar"
          title="Acesso direto pelas seções do menu"
          description="A barra lateral concentra as entradas do sistema para reduzir dispersão e facilitar a operação diária."
        >
          <ul className="content-list">
            <li>Abra “Processos” para consultar workflow, histórico e ações liberadas.</li>
            <li>Use “Minha atuação” ou “Áreas operacionais” para entrar na área do seu perfil.</li>
            <li>Consulte “Meu perfil” para validar os dados da sessão autenticada.</li>
          </ul>
        </InfoCard>
      </div>
    </section>
  );
}

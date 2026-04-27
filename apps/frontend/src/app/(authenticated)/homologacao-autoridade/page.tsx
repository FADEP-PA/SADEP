'use client';

import Link from 'next/link';
import { UserRole } from '@aep-pa/contracts';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { PageSection } from '@/shared/ui/page-section';

const HOMOLOGATION_CHECKPOINTS = [
  {
    title: 'Conferencia processual',
    description:
      'Organizacao dos pontos que a autoridade precisa revisar antes de homologar o resultado final.',
  },
  {
    title: 'Parecer e documentos',
    description:
      'Espaco preparado para receber leitura do parecer CESAD, anexos e registros formais quando a API dedicada existir.',
  },
  {
    title: 'Despacho conclusivo',
    description:
      'Base visual para futura decisao de homologacao, sem liberar acao operacional que ainda nao existe no backend.',
  },
];

export default function HomologationAuthorityPage() {
  const { session } = useAuth();

  return (
    <AuthGuard allowedRoles={[UserRole.HOMOLOGATION_AUTHORITY, UserRole.ADMIN]}>
      <section className="portal-dashboard">
        <PageSection
          eyebrow="Homologacao"
          title="Area da autoridade homologadora"
          description="Painel de apoio para conferencia final do processo, leitura de contexto e preparacao do despacho conclusivo."
        >
          <div className="workspace-overview workspace-overview--lilac">
            <div className="workspace-overview__copy">
              <span className="section-chip">Conferencia final</span>
              <h3>Homologacao com leitura orientada</h3>
              <p>
                Esta area separa a jornada da autoridade homologadora e deixa claro quais pontos ja
                podem ser acompanhados no portal enquanto o fluxo decisorio dedicado ainda depende
                de contratos de backend.
              </p>

              <div className="portal-hero__actions">
                <Link href="/processos" className="secondary-button portal-link-button">
                  Consultar processos
                </Link>
                <Link href="/perfil" className="ghost-button portal-link-button">
                  Ver sessao
                </Link>
              </div>
            </div>

            <aside className="workspace-overview__panel">
              <KeyValueList
                items={[
                  { label: 'autoridade', value: session?.user.name ?? 'Nao informado' },
                  { label: 'email', value: session?.user.email ?? 'Nao informado' },
                  { label: 'perfil ativo', value: 'Autoridade homologadora' },
                  { label: 'area inicial', value: '/homologacao-autoridade' },
                ]}
              />

              <div className="workspace-stat-grid">
                <div className="workspace-stat">
                  <span>etapa</span>
                  <strong>Final</strong>
                </div>
                <div className="workspace-stat">
                  <span>acao</span>
                  <strong>Conferencia</strong>
                </div>
                <div className="workspace-stat">
                  <span>decisao</span>
                  <strong>Pendente API</strong>
                </div>
              </div>
            </aside>
          </div>

          <div className="metrics-grid">
            {HOMOLOGATION_CHECKPOINTS.map((item) => (
              <InfoCard key={item.title} eyebrow="Homologacao" title={item.title} description={item.description} />
            ))}
          </div>

          <div className="portal-callout">
            <div className="portal-callout__copy">
              <span className="section-chip">Fluxo futuro</span>
              <h2>Pronta para receber a homologacao operacional</h2>
              <p>
                A tela organiza a experiencia final sem simular homologacao real. Quando o backend
                expuser fila, parecer formal e acao decisoria, estes blocos podem evoluir sem
                trocar a estrutura principal da pagina.
              </p>
            </div>

            <div className="portal-callout__panel">
              <KeyValueList
                items={[
                  { label: 'consulta atual', value: 'processos e sessao' },
                  { label: 'homologacao real', value: 'aguardando endpoint dedicado' },
                  { label: 'trilha decisoria', value: 'pendente de contrato backend' },
                ]}
              />
              <ul className="content-list">
                <li>A area deixa de usar o placeholder generico de perfil.</li>
                <li>Atalhos permanecem restritos a rotas existentes e seguras.</li>
                <li>O texto diferencia apoio visual de decisao homologatoria real.</li>
              </ul>
            </div>
          </div>
        </PageSection>
      </section>
    </AuthGuard>
  );
}

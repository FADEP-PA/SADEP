export type DemoCesadStageOpinionState = 'ABSENT' | 'DRAFT' | 'CONSOLIDATED';

export type DemoCesadStageOpinion = {
  id: string;
  state: DemoCesadStageOpinionState;
  title: string;
  statusLabel: string;
  stageLabel: string;
  processLabel: string;
  summary: string;
  legalBasis: string;
  conclusion: string;
  pendingItems: string[];
};

export const DEMO_CESAD_STAGE_OPINIONS: DemoCesadStageOpinion[] = [
  {
    id: 'demo-opinion-absent',
    state: 'ABSENT',
    title: 'Parecer ainda inexistente',
    statusLabel: 'Sem parecer registrado',
    stageLabel: 'Etapa demonstrativa 1',
    processLabel: 'Processo demonstrativo SADEP-CESAD-001',
    summary:
      'A estrutura reserva o espaco do parecer sem sugerir que o documento ja exista ou esteja apto a assinatura.',
    legalBasis: 'Fundamentacao sera exibida somente quando houver contrato proprio.',
    conclusion: 'Sem conclusao demonstrativa.',
    pendingItems: [
      'Contrato backend para parecer de etapa',
      'Capacidades de elaboracao e conclusao retornadas pela API',
      'Politica de assinatura colegiada',
    ],
  },
  {
    id: 'demo-opinion-draft',
    state: 'DRAFT',
    title: 'Parecer em elaboracao',
    statusLabel: 'Rascunho visual',
    stageLabel: 'Etapa demonstrativa 2',
    processLabel: 'Processo demonstrativo SADEP-CESAD-002',
    summary:
      'Area prevista para relato tecnico da etapa, exibida como rascunho visual sem persistencia.',
    legalBasis:
      'Referencia normativa demonstrativa, sem valor juridico e sem vinculo com documento real.',
    conclusion:
      'Conclusao preliminar demonstrativa, aguardando contrato backend antes de qualquer acao real.',
    pendingItems: [
      'Salvar rascunho apenas quando o endpoint existir',
      'Validar campos obrigatorios pelo contrato oficial',
      'Exibir bloqueios retornados pelo workflow',
    ],
  },
  {
    id: 'demo-opinion-consolidated',
    state: 'CONSOLIDATED',
    title: 'Parecer pronto para leitura',
    statusLabel: 'Consolidado visual',
    stageLabel: 'Etapa demonstrativa 3',
    processLabel: 'Processo demonstrativo SADEP-CESAD-003',
    summary:
      'Modelo de leitura do parecer consolidado da etapa, separado de assinatura e homologacao.',
    legalBasis:
      'Fundamentacao demonstrativa organizada em bloco proprio para futura integracao documental.',
    conclusion:
      'Resultado demonstrativo da etapa apresentado como leitura institucional, sem emitir ato real.',
    pendingItems: [
      'Associar documento formal retornado pelo backend',
      'Exibir trilha real de assinaturas quando modelada',
      'Diferenciar parecer de etapa de parecer conclusivo final',
    ],
  },
];

import { HttpError } from '@/shared/api/http-error';
import { httpRequest } from '@/shared/api/http-client';

import type {
  ProcessDashboardSnapshot,
  WorkflowHistoryItem,
  WorkflowResponse,
} from '@/features/dashboard/types/process-dashboard-types';
import {
  CesadStageReadSnapshotRef,
  ProcessAction,
  SupervisorEvaluationContentInput,
  SupervisorEvaluationWithDocumentContextRef,
  UserRole,
} from '@aep-pa/contracts';

export type UpsertSupervisorEvaluationInput = {
  summary: string;
  generalComments: string;
  content: SupervisorEvaluationContentInput;
  comment?: string;
};

export type WorkflowTransitionInput = {
  action: ProcessAction;
  comment?: string;
};


export async function getWorkflow(processId: string, accessToken: string) {
  return httpRequest<WorkflowResponse>(`/processes/${processId}/workflow`, {
    method: 'GET',
    token: accessToken,
  });
}

export async function getWorkflowHistory(processId: string, accessToken: string) {
  const history = await httpRequest<WorkflowHistoryItem[]>(`/processes/${processId}/history`, {
    method: 'GET',
    token: accessToken,
  });

  return {
    items: history,
    meta: {
      total: history.length,
    },
  };
}

export async function getSupervisorEvaluation(processId: string, accessToken: string) {
  return httpRequest<SupervisorEvaluationWithDocumentContextRef | null>(
    `/processes/${processId}/supervisor-evaluation`,
    {
      method: 'GET',
      token: accessToken,
    },
  );
}

export async function getCesadStageReadSnapshot(
  processId: string,
  stageSequence: number,
  accessToken: string,
) {
  return httpRequest<CesadStageReadSnapshotRef>(
    `/processes/${processId}/stages/${stageSequence}/consolidated-read`,
    {
      method: 'GET',
      token: accessToken,
    },
  );
}

export async function saveSupervisorEvaluationDraft(
  processId: string,
  accessToken: string,
  body: UpsertSupervisorEvaluationInput,
) {
  return httpRequest<SupervisorEvaluationWithDocumentContextRef>(
    `/processes/${processId}/supervisor-evaluation/draft`,
    {
      method: 'POST',
      token: accessToken,
      body,
    },
  );
}

export async function submitSupervisorEvaluation(
  processId: string,
  accessToken: string,
  body: UpsertSupervisorEvaluationInput,
) {
  return httpRequest<SupervisorEvaluationWithDocumentContextRef>(
    `/processes/${processId}/supervisor-evaluation/submit`,
    {
      method: 'POST',
      token: accessToken,
      body,
    },
  );
}

export async function rectifySupervisorEvaluation(
  processId: string,
  accessToken: string,
  body: UpsertSupervisorEvaluationInput,
) {
  return httpRequest<SupervisorEvaluationWithDocumentContextRef>(
    `/processes/${processId}/supervisor-evaluation/rectify`,
    {
      method: 'POST',
      token: accessToken,
      body,
    },
  );
}

export async function getTechnicalProcessSnapshot(
  processId: string,
  accessToken: string,
  userRole: UserRole,
): Promise<ProcessDashboardSnapshot> {
  const [workflow, historyResponse] = await Promise.all([
    getWorkflow(processId, accessToken),
    getWorkflowHistory(processId, accessToken),
  ]);

  try {
    const supervisorEvaluation = await getSupervisorEvaluation(processId, accessToken);

    return {
      workflow,
      history: historyResponse.items,
      supervisorEvaluation,
      supervisorEvaluationWarning: null,
    };
  } catch (error) {
    const canConsultSupervisorEvaluation =
      userRole === UserRole.ADMIN ||
      userRole === UserRole.IMMEDIATE_SUPERVISOR ||
      userRole === UserRole.INTERN_SERVER;

    if (error instanceof HttpError && error.status === 403 && !canConsultSupervisorEvaluation) {
      return {
        workflow,
        history: historyResponse.items,
        supervisorEvaluation: null,
        supervisorEvaluationWarning:
          'Seu perfil não pode consultar a avaliação da chefia. O dashboard exibe apenas workflow e histórico.',
      };
    }

    if (error instanceof HttpError && error.status === 403 && userRole === UserRole.INTERN_SERVER) {
      return {
        workflow,
        history: historyResponse.items,
        supervisorEvaluation: null,
        supervisorEvaluationWarning:
          'A avaliação da chefia só fica disponível para o servidor após a formalização documental da etapa.',
      };
    }

    throw error;
  }
}

export async function transitionWorkflow(
  processId: string,
  accessToken: string,
  body: WorkflowTransitionInput,
) {
  return httpRequest<WorkflowResponse>(`/processes/${processId}/workflow/transition`, {
    method: 'POST',
    token: accessToken,
    body,
  });
}

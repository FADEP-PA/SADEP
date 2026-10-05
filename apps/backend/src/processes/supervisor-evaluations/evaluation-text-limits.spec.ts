import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EVALUATION_TEXT_MAX_LENGTH } from '@sadep/contracts';
import { UpsertSupervisorEvaluationDto } from './dto/supervisor-evaluation.dto';
import { UpsertSelfEvaluationDto } from '../self-evaluations/dto/self-evaluation.dto';

describe('Evaluation text DTO boundaries', () => {
  it.each([899, 900, 901])('validates each structured field at %i characters', async (length) => {
    const text = 'x'.repeat(length);
    const supervisor = plainToInstance(UpsertSupervisorEvaluationDto, {
      summary: `${text}\n\n${text}`,
      generalComments: `${text}\n\nSystem-generated result`,
      comment: text,
      content: {
        criteria: [{ code: '1.1', label: 'Assiduidade', rating: 4, comment: text }],
        textFields: {
          unitCompetencies: text, serverAssignments: text, generalComments: text,
          monthlyObservations: [{ id: 'obs-1', monthLabel: '1º mês', description: text }],
        },
      },
    });
    const self = plainToInstance(UpsertSelfEvaluationDto, { selfReflection: text, additionalNotes: text, comment: text });
    expect((await validate(supervisor)).length === 0).toBe(length <= EVALUATION_TEXT_MAX_LENGTH);
    expect((await validate(self)).length === 0).toBe(length <= EVALUATION_TEXT_MAX_LENGTH);
  });
});

import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  listBeneficiariesHandler,
  getBeneficiaryHandler,
  searchBeneficiariesHandler,
  createBeneficiaryHandler,
  updateBeneficiaryHandler,
  deleteBeneficiaryHandler,
} from './beneficiary.controller.js';

export async function beneficiaryRoutes(app: FastifyInstance) {
  app.get('/beneficiaries', {
    preHandler: [authenticate],
  }, listBeneficiariesHandler);

  app.get('/beneficiaries/search', {
    preHandler: [authenticate],
  }, searchBeneficiariesHandler);

  app.get('/beneficiaries/:id', {
    preHandler: [authenticate],
  }, getBeneficiaryHandler);

  app.post('/beneficiaries', {
    preHandler: [authenticate],
  }, createBeneficiaryHandler);

  app.patch('/beneficiaries/:id', {
    preHandler: [authenticate],
  }, updateBeneficiaryHandler);

  app.delete('/beneficiaries/:id', {
    preHandler: [authenticate],
  }, deleteBeneficiaryHandler);
}

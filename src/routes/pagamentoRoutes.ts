import { Router } from 'express';
import { PagamentoController } from '../controllers/PagamentoController';
import { authMiddleware } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();
const pagamentoController = new PagamentoController();

router.use(authMiddleware);

router.get('/', (req, res) => pagamentoController.listar(req, res));
router.get('/:id', (req, res) => pagamentoController.obterPorId(req, res));
router.post('/', (req, res) => pagamentoController.criar(req, res));
router.put('/:id', (req, res) => pagamentoController.atualizar(req, res));
router.delete('/:id', (req, res) => pagamentoController.deletar(req, res));

// Rota de upload de comprovante
router.post('/:id/comprovante', upload.single('file'), (req, res) =>
  pagamentoController.uploadComprovante(req, res)
);

export default router;

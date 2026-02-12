import { Router } from 'express';
import { FazendaController } from '../controllers/FazendaController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const fazendaController = new FazendaController();

router.use(authMiddleware);

router.get('/', (req, res) => fazendaController.listar(req, res));
router.get('/:id', (req, res) => fazendaController.obterPorId(req, res));
router.post('/', (req, res) => fazendaController.criar(req, res));
router.post('/:id/incrementar-volume', (req, res) => fazendaController.incrementarVolume(req, res));
router.put('/:id', (req, res) => fazendaController.atualizar(req, res));
router.delete('/:id', (req, res) => fazendaController.deletar(req, res));

export default router;

import { Router } from 'express';
import healthRouter from './health';
import entitiesRouter from './entities';
import deviceClassesRouter from './deviceClasses';
import areasRouter from './areas';
import metricsRouter from './metrics';
import historyRouter from './history';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/entities/:entityId/history', historyRouter);
apiRouter.use('/entities', entitiesRouter);
apiRouter.use('/device-classes', deviceClassesRouter);
apiRouter.use('/areas', areasRouter);
apiRouter.use('/devices/metrics', metricsRouter);

export default apiRouter;

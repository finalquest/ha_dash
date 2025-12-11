import { Router } from 'express';
import healthRouter from './health';
import entitiesRouter from './entities';
import deviceClassesRouter from './deviceClasses';
import areasRouter from './areas';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/entities', entitiesRouter);
apiRouter.use('/device-classes', deviceClassesRouter);
apiRouter.use('/areas', areasRouter);

export default apiRouter;

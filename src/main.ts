import express from 'express';
import type { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit';
import cors from 'cors'

import uploadRoutes from './routes/upload-routes'
import HttpError from './models/http-error';

const app = express()
const port = 9001

const limiter = rateLimit({
  windowMs: 6000 * 15, 
  max: 100, 
  message: 'Too many requests, please try again later.',
  standardHeaders: true, 
  legacyHeaders: false,
});

app.use(limiter);
app.use(express.json())


app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-API-Key']
}));

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
})

app.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.send('online')
})

app.use('/api/upload', uploadRoutes)

app.use((req: Request, res: Response, next: NextFunction)=>{
    const error = new HttpError("Could not find this route", 404);
    throw error;
});

app.use((error: HttpError, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(error);
    }

    res.status(error.code || 500);
    console.log("REQ_", req.body)
    console.log("ERRO_", error)
    res.json({ message: error.message || "An unknown error occurred!" });
  });

app.listen(port, () => {
  console.log(`Server is running over ${port - 1}`)
})
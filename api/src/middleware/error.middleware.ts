import { Request, Response, NextFunction } from 'express';
import { normalizeHttpAuthError } from '../utils/auth-errors.util';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/2e82e369-b2c3-4892-be74-bf76a361a519',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'error.middleware.ts:9',message:'Error handler invoked',data:{error:err.message,path:req.path,method:req.method},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  console.error('Error:', err);

  // Determine status code - default to 500 if not set
  // Express doesn't set statusCode automatically, so we check if it was explicitly set
  const statusCode = (res.statusCode && res.statusCode !== 200) ? res.statusCode : 500;
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/2e82e369-b2c3-4892-be74-bf76a361a519',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'error.middleware.ts:18',message:'Sending error response',data:{statusCode,hasStack:!!err.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  // Normaliser le message d'erreur pour les routes d'authentification
  const isAuthRoute = req.path.includes('/auth');
  const context = req.path.includes('/login') ? 'login' : req.path.includes('/register') ? 'register' : 'general';
  
  // Utiliser un message normalisé pour les erreurs d'authentification
  const errorMessage = isAuthRoute 
    ? normalizeHttpAuthError(statusCode, context)
    : err.message || 'Une erreur est survenue. Veuillez réessayer.';

  res.status(statusCode).json({
    success: false,
    error: errorMessage,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });
};

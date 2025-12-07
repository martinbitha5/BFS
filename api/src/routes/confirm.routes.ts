import { Router, Request, Response } from 'express';
import { supabase } from '../config/database';

const router = Router();

/**
 * GET /api/v1/confirm/email
 * Page de confirmation d'email - Redirige vers l'app mobile
 */
router.get('/email', async (req: Request, res: Response) => {
  const { token_hash, type } = req.query;

  // Si c'est une confirmation d'email
  if (type === 'signup' && token_hash) {
    // Vérifier le token avec Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token_hash as string,
      type: 'signup'
    });

    if (error) {
      // Page HTML d'erreur
      return res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Erreur de confirmation</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 20px;
              padding: 40px;
              max-width: 500px;
              width: 100%;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #e53e3e;
              font-size: 24px;
              margin-bottom: 16px;
            }
            p {
              color: #4a5568;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 24px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 14px 32px;
              border-radius: 10px;
              text-decoration: none;
              font-weight: 600;
              font-size: 16px;
              transition: transform 0.2s;
            }
            .button:hover {
              transform: translateY(-2px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">❌</div>
            <h1>Erreur de confirmation</h1>
            <p>Le lien de confirmation est invalide ou a expiré.</p>
            <p style="font-size: 14px; color: #718096;">
              Erreur: ${error.message}
            </p>
            <a href="exp://192.168.1.71:8081" class="button">Retour à l'application</a>
          </div>
        </body>
        </html>
      `);
    }

    // Succès - Page HTML avec redirection automatique vers l'app
    return res.send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email confirmé ✅</title>
        <meta http-equiv="refresh" content="3;url=exp://192.168.1.71:8081/--/auth/confirmed">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            animation: slideIn 0.5s ease-out;
          }
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .icon {
            font-size: 80px;
            margin-bottom: 20px;
            animation: bounce 1s infinite;
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          h1 {
            color: #2d3748;
            font-size: 28px;
            margin-bottom: 16px;
          }
          p {
            color: #4a5568;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .success-badge {
            display: inline-block;
            background: #48bb78;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 24px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 14px 32px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s;
            margin-top: 16px;
          }
          .button:hover {
            transform: translateY(-2px);
          }
          .loader {
            margin: 20px auto;
            width: 50px;
            height: 50px;
            border: 4px solid #e2e8f0;
            border-top-color: #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">🎉</div>
          <h1>Email confirmé avec succès !</h1>
          <div class="success-badge">✅ Compte activé</div>
          <p>Votre adresse email a été vérifiée. Vous pouvez maintenant vous connecter à votre compte BFS.</p>
          <div class="loader"></div>
          <p style="font-size: 14px; color: #718096;">
            Redirection vers l'application dans 3 secondes...
          </p>
          <a href="exp://192.168.1.71:8081" class="button">Ouvrir l'application maintenant</a>
        </div>
        <script>
          // Tenter d'ouvrir l'app avec deep link
          setTimeout(() => {
            window.location.href = 'exp://192.168.1.71:8081/--/auth/confirmed';
          }, 3000);
        </script>
      </body>
      </html>
    `);
  }

  // Route par défaut
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BFS - Baggage Found Solution</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 20px;
          padding: 40px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          text-align: center;
        }
        .logo {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 {
          color: #2d3748;
          font-size: 28px;
          margin-bottom: 16px;
        }
        p {
          color: #4a5568;
          font-size: 16px;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">✈️</div>
        <h1>BFS - Baggage Found Solution</h1>
        <p>API de gestion des bagages</p>
      </div>
    </body>
    </html>
  `);
});

export default router;

// Vercel serverless entry point — re-exports the Express app.
// Vercel calls this file as a function handler for all /api/* requests.
import app from '../backend/src/server.js';

export default app;

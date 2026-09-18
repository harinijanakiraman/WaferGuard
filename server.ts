import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check API
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      engine: 'FabTwin Silicon Yield Engine v1.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Backend CSV export endpoint
  app.get('/api/reports/history/export', (req, res) => {
    const csvHeader =
      'Run_ID,Run_Name,Lot_ID,Wafer_ID,Engineer,Predicted_Yield_Pct,i9_Pct,i7_Pct,i5_Pct,i3_Pct,Reject_Pct,Avg_Defect_Risk_Pct,Avg_Critical_Defect_Pct,Best_i9_Score,Status,Created_At\n';
    const sampleRow =
      'SIM-RUN-8921-A,"FinFET_Nominal_Baseline_X9",LOT-FINFET-2026-X9,WFR-300-FINFET-0982,"Harini Janakiraman",91.4,56.8,24.2,12.1,5.3,1.6,4.2,0.8,92.4,Optimal,2026-08-14T14:32:00Z\n';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="FabTwin_Audit_Export.csv"');
    res.send(csvHeader + sampleRow);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FabTwin server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

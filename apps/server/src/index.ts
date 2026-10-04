import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import type { Scenario } from '@ai-roi-calc/engine';
import {
  calculate,
  createDefaultScenario,
  parseScenario,
  CURRENCIES,
  DEFAULT_FX_RATES_PER_EUR,
  DEFAULT_FX_RATES_NOTE,
} from '@ai-roi-calc/engine';
import { generatePdfHtml, generateExcelData, safeFileName } from './export.js';
import ExcelJS from 'exceljs';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));

/** Validates the request body as a scenario; sends 400 and returns null when invalid. */
function scenarioFromBody(req: Request, res: Response): Scenario | null {
  const result = parseScenario(req.body);
  if (!result.ok) {
    res.status(400).json({ error: 'Invalid scenario', details: result.errors });
    return null;
  }
  return result.scenario;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get default scenario
app.get('/api/defaults', (req, res) => {
  const defaults = createDefaultScenario();
  res.json(defaults);
});

// Calculate ROI
app.post('/api/calculate', (req, res) => {
  try {
    const scenario = scenarioFromBody(req, res);
    if (!scenario) return;
    const results = calculate(scenario);
    res.json(results);
  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({ error: 'Calculation failed' });
  }
});

// Export as JSON
app.post('/api/export/json', (req, res) => {
  try {
    const scenario = scenarioFromBody(req, res);
    if (!scenario) return;
    const results = calculate(scenario);

    const filename = safeFileName(scenario, 'json');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json({ scenario, results });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Export PDF (HTML template only, Puppeteer integration later)
app.post('/api/export/pdf-html', (req, res) => {
  try {
    const scenario = scenarioFromBody(req, res);
    if (!scenario) return;
    const results = calculate(scenario);
    const html = generatePdfHtml(scenario, results);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'PDF export failed' });
  }
});

// Export PDF (HTML with print styles)
app.post('/api/export/pdf', (req, res) => {
  try {
    const scenario = scenarioFromBody(req, res);
    if (!scenario) return;
    const results = calculate(scenario);
    const html = generatePdfHtml(scenario, results);

    const filename = safeFileName(scenario, 'html');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(html);
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'PDF export failed' });
  }
});

// Export Excel workbook
app.post('/api/export/xlsx', async (req, res) => {
  try {
    const scenario = scenarioFromBody(req, res);
    if (!scenario) return;
    const results = calculate(scenario);
    const excelData = generateExcelData(scenario, results);

    const workbook = new ExcelJS.Workbook();

    // Add sheets
    excelData.sheets.forEach(sheetData => {
      const sheet = workbook.addWorksheet(sheetData.name);

      sheetData.rows.forEach((row: any[], rowIndex: number) => {
        const excelRow = sheet.addRow(row);

        // Style header rows
        if (rowIndex === 0 || (rowIndex > 0 && row[0] && row.length > 1 && !isNaN(row[1]))) {
          excelRow.font = { bold: true };
          excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        }
      });

      // Auto-width columns
      sheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell?.({ includeEmpty: true }, (cell: any) => {
          const cellLength = String(cell.value).length;
          if (cellLength > maxLength) maxLength = cellLength;
        });
        column.width = Math.min(maxLength + 2, 30);
      });
    });

    const filename = safeFileName(scenario, 'xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Excel export failed' });
  }
});

// Export Excel data (JSON structure)
app.post('/api/export/xlsx-data', (req, res) => {
  try {
    const scenario = scenarioFromBody(req, res);
    if (!scenario) return;
    const results = calculate(scenario);
    const excelData = generateExcelData(scenario, results);

    res.json(excelData);
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Excel export failed' });
  }
});

// Get currency list
app.get('/api/currencies', (req, res) => {
  res.json({ currencies: CURRENCIES, fxRatesPerEur: DEFAULT_FX_RATES_PER_EUR, note: DEFAULT_FX_RATES_NOTE });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

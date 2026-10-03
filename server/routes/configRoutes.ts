import { Router, Request, Response } from 'express';
import { ConfigDbService } from '../services/configDbService';

export const configRouter = Router();

/**
 * POST /api/configs
 * Save a new strategy configuration or increment version for an existing name.
 */
configRouter.post('/configs', async (req: Request, res: Response) => {
  try {
    const { name, is_default, parameters_json } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Strategy configuration name is required.',
      });
    }

    if (!parameters_json || typeof parameters_json !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'parameters_json payload must be a valid object.',
      });
    }

    const saved = await ConfigDbService.saveConfig({
      name: name.trim(),
      is_default: Boolean(is_default),
      parameters_json,
    });

    return res.status(201).json({
      success: true,
      data: saved,
      message: `Strategy configuration '${saved.name}' (v${saved.version}) saved to Neon database.`,
    });
  } catch (err: any) {
    console.error('[Config API] Failed to save config:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal error saving strategy configuration',
    });
  }
});

/**
 * GET /api/configs
 * List all saved configurations
 */
configRouter.get('/configs', async (req: Request, res: Response) => {
  try {
    const configs = await ConfigDbService.getAllConfigs();
    return res.json({
      success: true,
      data: configs,
    });
  } catch (err: any) {
    console.error('[Config API] Failed to fetch configs:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch strategy configurations',
    });
  }
});

/**
 * GET /api/configs/active
 * Get current active/default configuration
 */
configRouter.get('/configs/active', async (req: Request, res: Response) => {
  try {
    const config = await ConfigDbService.getActiveConfig();
    return res.json({
      success: true,
      data: config,
    });
  } catch (err: any) {
    console.error('[Config API] Failed to fetch active config:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch active strategy configuration',
    });
  }
});

/**
 * DELETE /api/configs/:id
 * Delete a configuration by ID
 */
configRouter.delete('/configs/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid config ID' });
    }
    const deleted = await ConfigDbService.deleteConfig(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: `Config with ID ${id} not found` });
    }
    return res.json({ success: true, message: `Config ${id} deleted successfully` });
  } catch (err: any) {
    console.error('[Config API] Failed to delete config:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete config' });
  }
});


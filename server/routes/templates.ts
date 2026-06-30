import { Router } from 'express';
import logger from '../logger.js';
import {
  CONTENT_TEMPLATES,
  getTemplateById,
  getTemplatesByCategory,
  getTemplatesByPlatform,
  applyTemplate,
} from '../contentTemplates.js';

export function createTemplatesRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    try {
      res.json({ templates: CONTENT_TEMPLATES });
    } catch (error: unknown) {
      logger.error('Error fetching templates:', error);
      res.status(500).json({ message: 'Failed to fetch templates' });
    }
  });

  router.get('/category/:category', (req, res) => {
    try {
      const { category } = req.params;
      const templates = getTemplatesByCategory(category);
      res.json({ templates });
    } catch (error: unknown) {
      logger.error('Error fetching templates by category:', error);
      res.status(500).json({ message: 'Failed to fetch templates' });
    }
  });

  router.get('/platform/:platform', (req, res) => {
    try {
      const { platform } = req.params;
      const templates = getTemplatesByPlatform(platform);
      res.json({ templates });
    } catch (error: unknown) {
      logger.error('Error fetching templates by platform:', error);
      res.status(500).json({ message: 'Failed to fetch templates' });
    }
  });

  router.post('/apply', async (req, res) => {
    try {
      const { templateId, userInput } = req.body;
      const template = getTemplateById(templateId);

      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }

      const appliedTemplate = applyTemplate(template, userInput);
      res.json({ template: appliedTemplate });
    } catch (error: unknown) {
      logger.error('Error applying template:', error);
      res.status(500).json({ message: 'Failed to apply template' });
    }
  });

  return router;
}

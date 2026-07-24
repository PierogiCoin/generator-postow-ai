import { Router } from 'express';
import logger from '../logger.js';
import {
  CONTENT_TEMPLATES,
  getTemplateById,
  getTemplatesByCategory,
  getTemplatesByPlatform,
  applyTemplate,
  matchIndustryPack,
} from '../contentTemplates.js';
import {
  validateRequest,
  validateParams,
  applyTemplateSchema,
  templateCategoryParamSchema,
  templatePlatformParamSchema,
} from '../middleware/validate.js';
import type { ContentTemplate } from '../contentTemplates.js';

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

  router.get('/for-niche', (req, res) => {
    try {
      const niche = typeof req.query.niche === 'string' ? req.query.niche : '';
      const matched = matchIndustryPack(niche);
      const industry = getTemplatesByCategory('industry');
      res.json({
        matched,
        templates: industry,
        niche: niche.trim() || null,
      });
    } catch (error: unknown) {
      logger.error('Error matching niche templates:', error);
      res.status(500).json({ message: 'Failed to match niche templates' });
    }
  });

  router.get(
    '/category/:category',
    validateParams(templateCategoryParamSchema),
    (req, res) => {
      try {
        const { category } = req.params;
        const templates = getTemplatesByCategory(category);
        res.json({ templates });
      } catch (error: unknown) {
        logger.error('Error fetching templates by category:', error);
        res.status(500).json({ message: 'Failed to fetch templates' });
      }
    }
  );

  router.get(
    '/platform/:platform',
    validateParams(templatePlatformParamSchema),
    (req, res) => {
      try {
        const { platform } = req.params;
        const templates = getTemplatesByPlatform(platform);
        res.json({ templates });
      } catch (error: unknown) {
        logger.error('Error fetching templates by platform:', error);
        res.status(500).json({ message: 'Failed to fetch templates' });
      }
    }
  );

  router.post('/apply', validateRequest(applyTemplateSchema), async (req, res) => {
    try {
      const { templateId, userInput } = req.body as {
        templateId: string;
        userInput: Record<string, unknown>;
      };
      const template = getTemplateById(templateId);

      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }

      const appliedTemplate = applyTemplate(
        template,
        userInput as Partial<ContentTemplate>
      );
      res.json({ template: appliedTemplate });
    } catch (error: unknown) {
      logger.error('Error applying template:', error);
      res.status(500).json({ message: 'Failed to apply template' });
    }
  });

  return router;
}

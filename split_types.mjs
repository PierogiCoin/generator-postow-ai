import { Project } from 'ts-morph';
import fs from 'fs';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('types/index.ts');

const mappings = {
  generation: ['GenerationType', 'GenerationMode', 'CopywritingFramework', 'AIModel', 'FormData', 'GenerationResult', 'AIAssistantAction', 'ContentType', 'ContentLanguage'],
  social: ['Platform', 'PostStatus', 'SocialConnection', 'SocialPlatform', 'OmnichannelPost', 'RepurposedContent', 'RepurposedContentItem'],
  analytics: ['SentimentAnalysisResult', 'SEOAnalysisResult', 'PerformancePrediction', 'PredictionTip'],
  brand: ['BrandVoiceSettings', 'CompetitorBrandIntel', 'BrandVoiceData', 'BrandVoiceProfile', 'Tone', 'ToneArchetype', 'VisualStyle', 'StyleSuggestionResult'],
  calendar: ['CalendarSuggestion', 'IntelligentCalendarPlanItem', 'CalendarSlotContext', 'CampaignPost', 'CampaignPlan'],
  strategy: ['StrategicIdeaType', 'GroundingSource', 'StrategicIdea', 'StrategistContentItem', 'ContentInventoryReview', 'ContentAdaptationSummary', 'ContentPillar', 'SWOTAnalysis', 'CompetitiveSnapshot', 'StrategicAuditReport', 'AudiencePersona', 'AlternativeIdea', 'Trend', 'Scene'],
  system: ['SortKey', 'SortDirection', 'UserPlan', 'NotificationType', 'Notification', 'AchievementId', 'Achievement', 'AppView', 'PaymentHistoryItem']
};

// Also any interface not explicitly listed will just stay in system.ts or index.ts. We will move the listed ones.

for (const [moduleName, typesToMove] of Object.entries(mappings)) {
  const newFile = project.createSourceFile(`types/${moduleName}.ts`, '', { overwrite: true });
  for (const typeName of typesToMove) {
    const typeAlias = sourceFile.getTypeAlias(typeName);
    const interfaceDecl = sourceFile.getInterface(typeName);
    const enumDecl = sourceFile.getEnum(typeName);

    if (typeAlias) {
      newFile.addTypeAlias(typeAlias.getStructure());
      typeAlias.remove();
    }
    if (interfaceDecl) {
      newFile.addInterface(interfaceDecl.getStructure());
      interfaceDecl.remove();
    }
    if (enumDecl) {
      newFile.addEnum(enumDecl.getStructure());
      enumDecl.remove();
    }
  }
}

// Add imports to the extracted files if they depend on each other.
// Actually, it's easier to just save them, then use another tool or manual fixes to fix imports between them.
project.saveSync();

// Now rebuild index.ts
let indexContent = `// Re-exports for backward compatibility
import type React from "react";\n\n`;

for (const moduleName of Object.keys(mappings)) {
  indexContent += `export * from './${moduleName}';\n`;
}
indexContent += `\n// Remaining types:\n`;
indexContent += fs.readFileSync('types/index.ts', 'utf8');

fs.writeFileSync('types/index.ts', indexContent);

console.log('Split completed!');

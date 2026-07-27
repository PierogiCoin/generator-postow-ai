import { CopywritingFramework } from '../../../types';
import type { TextPromptContext } from '../types';

const FRAMEWORK_INSTRUCTIONS: Record<CopywritingFramework, string> = {
  [CopywritingFramework.PAS]: `STRUCTURE - Use PAS Framework:
1. PROBLEM: Start with a relatable pain point that resonates with the audience. Be specific and empathetic.
2. AGITATION: Amplify the emotions around this problem. Make the reader feel the urgency and discomfort.
3. SOLUTION: Present the solution clearly. Show transformation and relief. End with a strong CTA.`,

  [CopywritingFramework.AIDA]: `STRUCTURE - Use AIDA Framework:
1. ATTENTION: Hook with a bold statement, question, or curiosity gap in first 2 lines.
2. INTEREST: Build interest with relevant facts, benefits, or intriguing details.
3. DESIRE: Create desire by painting a picture of the outcome/benefits. Use emotional language.
4. ACTION: Strong, clear call-to-action that creates urgency.`,

  [CopywritingFramework.Storytelling]: `STRUCTURE - Use Storytelling Framework:
1. SETUP: Establish the scene and characters. Create immediate relatability.
2. CONFLICT: Present the challenge or struggle. Build tension.
3. CLIMAX: The turning point or moment of realization.
4. RESOLUTION: How it all turned out. The lesson learned.
5. BRIDGE: Connect story to reader's life and include soft CTA.`,

  [CopywritingFramework.HookStoryOffer]: `STRUCTURE - Use Hook-Story-Offer Framework:
1. HOOK: Pattern interrupt. Something that stops the scroll (contrarian, curiosity, or bold claim).
2. STORY: Brief, engaging narrative that supports the hook. Personal or relatable.
3. OFFER: The value proposition. What they'll get/how this helps them.
4. CTA: Simple next step.`,

  [CopywritingFramework.ProblemAgitateSolve]: `STRUCTURE - Use Problem-Agitate-Solve:
1. PROBLEM: Identify a specific pain point your audience faces daily.
2. AGITATE: Describe the worst-case scenario if this continues. Use vivid, emotional language.
3. SOLVE: Present your solution as the obvious relief. Show before/after contrast.
4. PROOF: Add credibility (stats, testimonials, or logic).`,

  [CopywritingFramework.BeforeAfterBridge]: `STRUCTURE - Use Before-After-Bridge:
1. BEFORE: Paint the picture of current struggle/frustration. Make it visceral.
2. AFTER: Describe the ideal outcome. How life looks when problem is solved.
3. BRIDGE: How to get from Before to After. The method/tool/solution.
4. CTA: Invite them to take the first step on the bridge.`,

  [CopywritingFramework.FeatureBenefit]: `STRUCTURE - Use Feature-Benefit-Outcome:
1. HOOK: Catch attention with the main feature.
2. FEATURE: What it is (the specs/functionality).
3. BENEFIT: What it does for them (immediate value).
4. OUTCOME: The transformation in their life/business (emotional payoff).
5. CTA: Encourage them to experience the outcome.`,

  [CopywritingFramework.Auto]: '',
};

export function frameworkBlock(ctx: TextPromptContext): string | null {
  const framework = ctx.formData.copywritingFramework;
  if (!framework || framework === CopywritingFramework.Auto) return null;
  return `\n${FRAMEWORK_INSTRUCTIONS[framework]}`;
}

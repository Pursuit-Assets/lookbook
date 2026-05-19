-- Migration: Clarify UFT AI Ambassadors initiative copy

UPDATE lookbook_initiatives
SET description = 'Projects from the UFT AI Ambassadors initiative, where teachers and education leaders explore practical AI tools and workflows for their schools and classrooms.'
WHERE slug = 'uft-ai-ambassadors';

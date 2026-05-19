-- Migration: Assign imported UFT ambassador projects to the UFT initiative

UPDATE lookbook_projects
SET cohort = 'UFT AI Ambassadors'
WHERE summary LIKE '{%"ambassador_name"%'
  AND (cohort IS NULL OR cohort = '');

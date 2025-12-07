-- Add German translations to ISO 45001 criteria
-- This script updates the default columns with German text while keeping English in _en columns

-- Update ISO 45001 sections with German titles
UPDATE iso_criteria_sections 
SET title = CASE section_number
  WHEN '1' THEN 'Kontext der Organisation'
  WHEN '2' THEN 'Führung (Leadership)'
  WHEN '3' THEN 'Planung'
  WHEN '4' THEN 'Unterstützung'
  WHEN '5' THEN 'Betrieb'
  WHEN '6' THEN 'Bewertung der Leistung'
  WHEN '7' THEN 'Verbesserung'
  WHEN '8' THEN 'Glossar'
END
WHERE iso_code = 'ISO_45001' AND section_number IN ('1','2','3','4','5','6','7','8');

-- Update ISO 45001 subsections with German titles
UPDATE iso_criteria_subsections AS sub
SET title = CASE sub.subsection_number
  -- Section 1 subsections
  WHEN '1.1' THEN 'Externe und interne Themen identifizieren'
  WHEN '1.2' THEN 'Interessierte Parteien und deren Anforderungen'
  WHEN '1.3' THEN 'Anwendungsbereich des Arbeitsschutzmanagementsystems'
  WHEN '1.4' THEN 'Managementsystem und Schnittstellen'
  
  -- Section 2 subsections
  WHEN '2.1' THEN 'Verantwortung und Verpflichtung der obersten Leitung'
  WHEN '2.2' THEN 'Arbeitsschutzpolitik'
  WHEN '2.3' THEN 'Rollen, Verantwortlichkeiten und Befugnisse'
  WHEN '2.4' THEN 'Beteiligung und Konsultation der Beschäftigten'
  WHEN '2.5' THEN 'Besondere Beauftragte und Fachfunktionen'
  
  -- Section 3 subsections
  WHEN '3.1' THEN 'Maßnahmen zum Umgang mit Risiken und Chancen'
  WHEN '3.2' THEN 'Rechtliche und andere Anforderungen'
  WHEN '3.3' THEN 'Arbeitsschutzziele'
  WHEN '3.4' THEN 'Notfall- und Krisenplanung'
  WHEN '3.6' THEN 'Detaillierte Zielplanung'
  
  -- Section 4 subsections
  WHEN '4.1' THEN 'Ressourcenmanagement & Budget'
  WHEN '4.2' THEN 'Kompetenz und Qualifikation'
  WHEN '4.3' THEN 'Bewusstsein und Kommunikation'
  WHEN '4.4' THEN 'Dokumentierte Information'
  WHEN '4.5' THEN 'Wissensmanagement'
  WHEN '4.6' THEN 'Kommunikation & Dokumentation'
  
  -- Section 5 subsections
  WHEN '5.1' THEN 'Betriebliche Planung und Steuerung'
  WHEN '5.2' THEN 'Gefährdungsbeurteilung & Schutzmaßnahmen'
  WHEN '5.3' THEN 'Management of Change'
  WHEN '5.4' THEN 'Beschaffung & Lieferantenmanagement'
  WHEN '5.5' THEN 'Notfallvorsorge und Gefahrenabwehr'
  WHEN '5.6' THEN 'Instandhaltungsmanagement'
  WHEN '5.7' THEN 'Betriebliche Steuerung und Prozessorganisation'
  WHEN '5.9' THEN 'Sicherheits- und Gesundheitsmanagement'
  WHEN '5.10' THEN 'Nachhaltigkeit und Umweltschutz'
  
  -- Section 6 subsections
  WHEN '6.1' THEN 'Überwachung, Messung, Analyse'
  WHEN '6.2' THEN 'Interne Audits'
  WHEN '6.3' THEN 'Managementbewertung'
  WHEN '6.4' THEN 'Feedback & Lernen'
  
  -- Section 7 subsections
  WHEN '7.1' THEN 'Kontinuierliche Verbesserung'
  WHEN '7.2' THEN 'Nichtkonformitäten & Korrekturmaßnahmen'
  WHEN '7.3' THEN 'Management psychosozialer Risiken'
  WHEN '7.4' THEN 'Lessons Learned'
  WHEN '7.5' THEN 'Compliance & Ethik'
  WHEN '7.6' THEN 'Innovation und Gesundheitsprogramme'
  
  -- Section 8 subsections
  WHEN '8.1' THEN 'Zusätzliche Informationen'
  
  ELSE sub.title
END
FROM iso_criteria_sections AS sec
WHERE sub.section_id = sec.id 
  AND sec.iso_code = 'ISO_45001';

-- Note: Questions would need individual German translations
-- This is a comprehensive task that would require translating hundreds of questions
-- For now, questions will remain in English until German translations are provided

-- Verify the updates
SELECT 
  s.section_number,
  s.title AS german_title,
  s.title_en AS english_title,
  COUNT(sub.id) AS subsection_count
FROM iso_criteria_sections s
LEFT JOIN iso_criteria_subsections sub ON sub.section_id = s.id
WHERE s.iso_code = 'ISO_45001'
GROUP BY s.id, s.section_number, s.title, s.title_en
ORDER BY s.section_number;

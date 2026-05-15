export interface ParsedActivity {
  id: string;
  saTitle: string;
  activityName: string;
}

export const extractActivitiesFromMarkdown = (markdown: string): ParsedActivity[] => {
  const activities: ParsedActivity[] = [];
  
  // Find all SA headers, which look like: ## SITUACIÓN DE APRENDIZAJE 1: Título
  const saRegex = /##\s*(?:SITUACI[ÓO]N DE APRENDIZAJE|SITUACIÓ D'APRENENTATGE|LEARNING SITUATION)\s*\d+\s*:?\s*([^\n]+)/gi;
  
  let saMatch;
  const saMatches = [];
  while ((saMatch = saRegex.exec(markdown)) !== null) {
    saMatches.push({
      title: saMatch[1].trim(),
      index: saMatch.index
    });
  }

  for (let i = 0; i < saMatches.length; i++) {
    const currentSA = saMatches[i];
    const nextIndex = i + 1 < saMatches.length ? saMatches[i + 1].index : markdown.length;
    const saContent = markdown.substring(currentSA.index, nextIndex);

    // Now extract activities within this SA
    // Example: | **Actividad 1:** Nombre | ...
    const activityRegex = /\|\s*\*\*(?:Actividad|Activitat|Activity)\s*\d+\s*:?\s*\*\*\s*([^|]*) \|/gi;
    let actMatch;
    let actCount = 1;
    while ((actMatch = activityRegex.exec(saContent)) !== null) {
      const actName = actMatch[1].trim();
      if (actName) {
        activities.push({
          id: `SA${i + 1}-A${actCount}`,
          saTitle: currentSA.title,
          activityName: actName
        });
        actCount++;
      }
    }
  }

  return activities;
};

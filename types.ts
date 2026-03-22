
export enum AppStep {
  UPLOAD = 'UPLOAD',
  CONTEXT = 'CONTEXT',
  PLANNING = 'PLANNING',
  SELECT_TYPE = 'SELECT_TYPE',
  GENERATING = 'GENERATING',
  EDITOR = 'EDITOR',
  HISTORY = 'HISTORY',
}

export enum DocType {
  PROPUESTA = 'PROPUESTA',
  SITUACION = 'SITUACION',
}

export interface CurriculumAnalysis {
  subject: string;
  grade: string;
  competencies: string[];
  blocks: string[];
}

export interface SADetail {
  idea: string;
  competencies: string[];
  blocks: string[];
}

export interface TeacherContext {
  subject: string;
  gradeLevel: string;
  weeklyHours: number;
  language: string;
  
  // Needs
  selectedNeeds: string[]; 
  otherNeeds: string;
  
  // Methodologies
  methodologyPreference: string[];
  
  // SA Specifics
  generateFullCourse: boolean;
  fullCourseIdeas: string; // Ideas for the full course
  numberOfSAs: number; 
  saDetails: SADetail[]; // Detailed ideas, competencies, and blocks for each SA
}

export interface GeneratedDocument {
  title: string;
  content: string;
  type: DocType;
}

export interface HistoryItem {
  id: string;
  title: string;
  content: string;
  type: DocType;
  date: string;
  subject: string;
  gradeLevel: string;
}

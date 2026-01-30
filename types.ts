
export enum AppStep {
  UPLOAD = 'UPLOAD',
  CONTEXT = 'CONTEXT',
  SELECT_TYPE = 'SELECT_TYPE',
  GENERATING = 'GENERATING',
  EDITOR = 'EDITOR',
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

export interface TeacherContext {
  subject: string;
  department: string;
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
  numberOfSAs: number; 
  saIdeas: string[]; // Ideas sugeridas para cada SdA
}

export interface GeneratedDocument {
  title: string;
  content: string;
  type: DocType;
}

export type Priority = 'low' | 'medium' | 'high';
export type Note = { id:string; title:string; description:string; tags:string[]; priority:Priority; dueDate:string|null; columnId:string|null; order:number; createdAt:string; updatedAt:string };
export type Column = { id:string; name:string; collapsed:boolean; isDefault:boolean };
export type AppData = { version:1; notes:Note[]; columns:Column[] };

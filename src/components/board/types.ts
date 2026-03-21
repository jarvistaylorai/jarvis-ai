export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Attachment {
  id: string;
  file_path: string;
  file_name: string;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  content: string;
  is_completed: boolean;
  position: number;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  position: number;
  list_id: string;
  project_id: string | null;
  project?: {
    id: string;
    name: string;
  };
  labels: { label: Label }[];
  checklists: Checklist[];
  comments: Comment[];
  attachments: Attachment[];
  assigned_to: string | null;
  phase_id: string | null;
  phase?: {
    id: string;
    title: string;
    objective: {
      id: string;
      title: string;
    };
  };
  due_date: string | null;
  start_date: string | null;
  created_at: string;
}

export interface ListData {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
}

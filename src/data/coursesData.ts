// Courses are now managed in the database
export interface Course {
  id: string;
  title: string;
  code: string;
  category: string;
  description: string;
  duration: string;
}

export const allCoursesData: Course[] = [];

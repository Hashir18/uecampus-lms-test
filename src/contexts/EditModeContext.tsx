import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

interface EditModeContextType {
  isEditMode: boolean;
  toggleEditMode: () => void;
  setEditMode: (value: boolean) => void;
  isAdmin: boolean;
  isEditor: boolean;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const { isAdmin, isTeacher } = useAuth();
  const isEditor = isAdmin || isTeacher;

  // Auto-disable edit mode if user loses admin status
  useEffect(() => {
    if (!isEditor && isEditMode) {
      setIsEditMode(false);
    }
  }, [isEditor, isEditMode]);

  const toggleEditMode = () => {
    if (isEditor) {
      setIsEditMode(prev => !prev);
    }
  };

  const setEditMode = (value: boolean) => {
    if (isEditor) {
      setIsEditMode(value);
    }
  };

  return (
    <EditModeContext.Provider value={{ isEditMode, toggleEditMode, setEditMode, isAdmin, isEditor }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (context === undefined) {
    throw new Error("useEditMode must be used within an EditModeProvider");
  }
  return context;
}

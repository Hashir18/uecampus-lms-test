import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ChevronDown, ChevronRight, Eye, EyeOff, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileViewer } from '@/components/FileViewer';
import { Badge } from '@/components/ui/badge';
import quizIcon from '@/assets/quiz-icon.png';
import { RichTextEditor } from '@/components/RichTextEditor';

interface Material {
  id: string;
  title: string;
  file_type: string;
  order_index: number;
  file_path: string;
  description?: string;
  file_size?: number;
}

interface Assignment {
  id: string;
  title: string;
  description?: string;
  points: number;
  passing_marks?: number;
  assessment_brief?: string;
  due_date?: string;
  is_hidden?: boolean;
  attempts?: number;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  quiz_url: string;
  duration?: number;
  is_hidden?: boolean;
  due_date?: string;
}

interface SortableItemProps {
  material: Material;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Material>) => void;
  getFileIcon: (fileType: string) => React.ReactNode;
}

interface SortableAssignmentProps {
  assignment: Assignment;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Assignment>) => void;
  onToggleHide?: (id: string, isHidden: boolean) => void;
  onSetDeadline?: (assignment: Assignment) => void;
}

interface SortableQuizProps {
  quiz: Quiz;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Quiz>) => void;
  onToggleHide?: (id: string, isHidden: boolean) => void;
  onSetDeadline?: (quiz: Quiz) => void;
}

function SortableItem({ material, onDelete, onUpdate, getFileIcon }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: material.id });

  const [isOpen, setIsOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState(material.title);
  const [editedDescription, setEditedDescription] = useState(material.description || '');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    onUpdate(material.id, {
      title: editedTitle,
      description: editedDescription,
    });
    setIsOpen(false);
  };

  return (
    <Collapsible
      ref={setNodeRef}
      style={style}
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border rounded bg-card"
    >
      <div className="flex items-center gap-2 p-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        {getFileIcon(material.file_type)}
        <span className="flex-1 text-sm truncate">{material.title}</span>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(material.id);
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <CollapsibleContent className="border-t">
        <div className="p-4 space-y-4">
          {/* Edit Section */}
          <div className="space-y-3">
            <div>
              <Label htmlFor={`title-${material.id}`}>Title</Label>
              <Input
                id={`title-${material.id}`}
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Material title"
              />
            </div>
            <div>
              <Label htmlFor={`desc-${material.id}`}>Description</Label>
              <RichTextEditor
                content={editedDescription}
                onChange={setEditedDescription}
              />
            </div>
            <Button onClick={handleSave} size="sm" className="w-full">
              Save Changes
            </Button>
          </div>

          {/* Preview Section */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4" />
              <Label>Preview</Label>
            </div>
            <div className="border rounded-lg overflow-hidden bg-muted/30 h-64">
              <FileViewer file={material} />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SortableAssignment({ assignment, onDelete, onUpdate, onToggleHide, onSetDeadline }: SortableAssignmentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: assignment.id });

  const [isOpen, setIsOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState(assignment.title);
  const [editedDescription, setEditedDescription] = useState(assignment.description || '');
  const [editedPoints, setEditedPoints] = useState(assignment.points);
  const [editedPassingMarks, setEditedPassingMarks] = useState(assignment.passing_marks || 50);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    onUpdate(assignment.id, {
      title: editedTitle,
      description: editedDescription,
      points: editedPoints,
      passing_marks: editedPassingMarks,
    });
    setIsOpen(false);
  };

  return (
    <Collapsible
      ref={setNodeRef}
      style={style}
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border rounded bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800"
    >
      <div className="flex items-center gap-2 p-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="flex-1 text-sm font-medium">{assignment.title}</span>
        <Badge variant="secondary" className="text-xs">
          {assignment.points} marks
        </Badge>
        {onToggleHide && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleHide(assignment.id, !assignment.is_hidden);
            }}
          >
            {assignment.is_hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(assignment.id);
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <CollapsibleContent className="border-t">
        <div className="p-4 space-y-4">
          {/* Edit Section */}
          <div className="space-y-3">
            <div>
              <Label htmlFor={`title-${assignment.id}`}>Assignment Title</Label>
              <Input
                id={`title-${assignment.id}`}
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Assignment title"
              />
            </div>
            <div>
              <Label htmlFor={`desc-${assignment.id}`}>Description</Label>
              <RichTextEditor
                content={editedDescription}
                onChange={setEditedDescription}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`points-${assignment.id}`}>Total Marks</Label>
                <Input
                  id={`points-${assignment.id}`}
                  type="number"
                  value={editedPoints}
                  onChange={(e) => setEditedPoints(parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor={`passing-${assignment.id}`}>Passing Marks</Label>
                <Input
                  id={`passing-${assignment.id}`}
                  type="number"
                  value={editedPassingMarks}
                  onChange={(e) => setEditedPassingMarks(parseInt(e.target.value))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm" className="flex-1">
                Save Changes
              </Button>
              {onSetDeadline && (
                <Button
                  onClick={() => onSetDeadline(assignment)}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Set Deadline
                </Button>
              )}
            </div>
          </div>

          {/* Preview Section - Show Assignment Brief if available */}
          {assignment.assessment_brief && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4" />
                <Label>Assessment Brief Preview</Label>
              </div>
              <div className="border rounded-lg overflow-hidden bg-muted/30 h-64">
                <FileViewer 
                  file={{
                    id: assignment.id,
                    title: assignment.title,
                    file_path: assignment.assessment_brief,
                    file_type: 'application/pdf',
                    _isBrief: true
                  }} 
                />
              </div>
            </div>
          )}

          {/* Assignment Details */}
          <div className="border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-semibold">Total Marks:</span>
              <span>{assignment.points}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Passing Marks:</span>
              <span className="text-green-600 dark:text-green-400">{assignment.passing_marks || 50}</span>
            </div>
            {assignment.due_date && (
              <div className="flex justify-between">
                <span className="font-semibold">Due Date:</span>
                <span>{new Date(assignment.due_date).toLocaleDateString()}</span>
              </div>
            )}
            {assignment.attempts && (
              <div className="flex justify-between">
                <span className="font-semibold">Attempts Allowed:</span>
                <span>{assignment.attempts}</span>
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SortableQuiz({ quiz, onDelete, onUpdate, onToggleHide, onSetDeadline }: SortableQuizProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: quiz.id });

  const [isOpen, setIsOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState(quiz.title);
  const [editedDescription, setEditedDescription] = useState(quiz.description || '');
  const [editedQuizUrl, setEditedQuizUrl] = useState(quiz.quiz_url);
  const [editedDuration, setEditedDuration] = useState(quiz.duration || 30);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    onUpdate(quiz.id, {
      title: editedTitle,
      description: editedDescription,
      quiz_url: editedQuizUrl,
      duration: editedDuration,
    });
    setIsOpen(false);
  };

  return (
    <Collapsible
      ref={setNodeRef}
      style={style}
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border rounded bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
    >
      <div className="flex items-center gap-2 p-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <img src={quizIcon} alt="Quiz" className="h-5 w-5 object-contain flex-shrink-0" />
        <span className="flex-1 text-sm font-medium">{quiz.title}</span>
        <Badge variant="secondary" className="text-xs">
          {quiz.duration} min
        </Badge>
        {onToggleHide && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleHide(quiz.id, !quiz.is_hidden);
            }}
          >
            {quiz.is_hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(quiz.id);
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <CollapsibleContent className="border-t">
        <div className="p-4 space-y-4">
          {/* Edit Section */}
          <div className="space-y-3">
            <div>
              <Label htmlFor={`title-${quiz.id}`}>Quiz Title</Label>
              <Input
                id={`title-${quiz.id}`}
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Quiz title"
              />
            </div>
            <div>
              <Label htmlFor={`desc-${quiz.id}`}>Description</Label>
              <RichTextEditor
                content={editedDescription}
                onChange={setEditedDescription}
              />
            </div>
            <div>
              <Label htmlFor={`url-${quiz.id}`}>Quiz URL</Label>
              <Input
                id={`url-${quiz.id}`}
                value={editedQuizUrl}
                onChange={(e) => setEditedQuizUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor={`duration-${quiz.id}`}>Duration (minutes)</Label>
              <Input
                id={`duration-${quiz.id}`}
                type="number"
                value={editedDuration}
                onChange={(e) => setEditedDuration(parseInt(e.target.value))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm" className="flex-1">
                Save Changes
              </Button>
              {onSetDeadline && (
                <Button
                  onClick={() => onSetDeadline(quiz)}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Set Deadline
                </Button>
              )}
            </div>
          </div>

          {/* Preview Section - Show Quiz Link */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4" />
              <Label>Quiz Preview</Label>
            </div>
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold">Duration:</span>
                  <span>{quiz.duration} minutes</span>
                </div>
                {quiz.due_date && (
                  <div className="flex justify-between">
                    <span className="font-semibold">Due Date:</span>
                    <span>{new Date(quiz.due_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="pt-2">
                  <a 
                    href={quiz.quiz_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline inline-flex items-center gap-1"
                  >
                    Open Quiz →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface DraggableMaterialListProps {
  materials: Material[];
  onReorder: (materials: Material[]) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Material>) => void;
  getFileIcon: (fileType: string) => React.ReactNode;
}

export function DraggableMaterialList({
  materials,
  onReorder,
  onDelete,
  onUpdate,
  getFileIcon,
}: DraggableMaterialListProps) {
  const [items, setItems] = useState(materials);

  // Sync internal state with materials prop
  useEffect(() => {
    setItems(materials);
  }, [materials]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      onReorder(newItems);
    }
  };

  // Don't render if no items
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((material) => (
            <SortableItem
              key={material.id}
              material={material}
              onDelete={onDelete}
              onUpdate={onUpdate}
              getFileIcon={getFileIcon}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// Assignment List Component
interface DraggableAssignmentListProps {
  assignments: Assignment[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Assignment>) => void;
  onToggleHide?: (id: string, isHidden: boolean) => void;
  onSetDeadline?: (assignment: Assignment) => void;
}

export function DraggableAssignmentList({
  assignments,
  onDelete,
  onUpdate,
  onToggleHide,
  onSetDeadline,
}: DraggableAssignmentListProps) {
  if (!assignments || assignments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {assignments.map((assignment) => (
        <SortableAssignment
          key={assignment.id}
          assignment={assignment}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onToggleHide={onToggleHide}
          onSetDeadline={onSetDeadline}
        />
      ))}
    </div>
  );
}

// Quiz List Component
interface DraggableQuizListProps {
  quizzes: Quiz[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Quiz>) => void;
  onToggleHide?: (id: string, isHidden: boolean) => void;
  onSetDeadline?: (quiz: Quiz) => void;
}

export function DraggableQuizList({
  quizzes,
  onDelete,
  onUpdate,
  onToggleHide,
  onSetDeadline,
}: DraggableQuizListProps) {
  if (!quizzes || quizzes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {quizzes.map((quiz) => (
        <SortableQuiz
          key={quiz.id}
          quiz={quiz}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onToggleHide={onToggleHide}
          onSetDeadline={onSetDeadline}
        />
      ))}
    </div>
  );
}

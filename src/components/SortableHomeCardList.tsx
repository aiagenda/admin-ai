import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { HomeCardId } from "@/lib/home-cards";
import { getHomeCardLabel } from "@/lib/home-cards";

function SortableRow({ id, label }: { id: HomeCardId; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={"flex items-center gap-2 rounded-lg border p-3 bg-background " + (isDragging ? "opacity-80 shadow-md z-10" : "")}
    >
      <button
        type="button"
        className="touch-none p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm">{label}</span>
    </div>
  );
}

type Props = {
  order: HomeCardId[];
  onOrderChange: (order: HomeCardId[]) => void;
};

export function SortableHomeCardList({ order, onOrderChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = order.indexOf(active.id as HomeCardId);
      const newIndex = order.indexOf(over.id as HomeCardId);
      if (oldIndex !== -1 && newIndex !== -1) {
        onOrderChange(arrayMove([...order], oldIndex, newIndex));
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {order.map((id) => (
            <SortableRow key={id} id={id} label={getHomeCardLabel(id as HomeCardId)} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

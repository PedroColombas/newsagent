import { Chip } from "../ui/Chip";
import { GENRES } from "../../lib/preferences-options";

export function GenrePicker({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (genre: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {GENRES.map((g) => (
        <Chip key={g} label={g} selected={selected.includes(g)} onClick={() => onToggle(g)} />
      ))}
    </div>
  );
}

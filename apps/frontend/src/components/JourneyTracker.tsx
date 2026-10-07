import type { Stage, StageId, StageState } from "../types";
import { Icon } from "./Icon";

interface JourneyTrackerProps {
  activeStage: StageId;
  completedStages: Set<StageId>;
  stages: Stage[];
  onSelect?: (stage: StageId) => void;
}

function stateFor(stageId: StageId, activeStage: StageId, completedStages: Set<StageId>): StageState {
  if (stageId === activeStage) return "current";
  if (completedStages.has(stageId)) return "complete";
  return "pending";
}

export function JourneyTracker({ activeStage, completedStages, stages, onSelect }: JourneyTrackerProps) {
  return (
    <nav className="journey-tracker" aria-label="Patient journey">
      {stages.map((stage, index) => {
        const state = stateFor(stage.id, activeStage, completedStages);
        return (
          <button
            key={stage.id}
            className={`journey-step journey-${state}`}
            onClick={() => onSelect?.(stage.id)}
            type="button"
            disabled={!onSelect}
            aria-current={stage.id === activeStage ? "step" : undefined}
          >
            <span className="journey-number">
              {state === "complete" ? <Icon name="check" size={16} /> : index + 1}
            </span>
            <span>{stage.shortLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}

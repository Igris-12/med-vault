import type { ProcessingStep } from '../../types/api';

interface Step {
  key: ProcessingStep;
  label: string;
}

const STEPS: Step[] = [
  { key: 'saving', label: 'Saving' },
  { key: 'analyzing', label: 'Analyzing' },
  { key: 'embedding', label: 'Embedding' },
  { key: 'storing', label: 'Storing' },
  { key: 'done', label: 'Done' },
];

interface Props {
  currentStep: ProcessingStep;
  filename: string;
}

export function ProcessingStepper({ currentStep, filename }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  const isFailed = currentStep === 'failed';

  return (
    <div className="mv-card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-sm text-text-primary truncate max-w-[200px]" title={filename}>
          {filename}
        </p>
        {isFailed && <span className="badge-coral">Failed</span>}
        {currentStep === 'done' && <span className="badge-teal">Done ✓</span>}
      </div>

      {/* Steps */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const isDone = isFailed ? false : i < currentIndex || currentStep === 'done';
          const isActive = !isFailed && i === currentIndex && currentStep !== 'done';
          const isFuture = !isDone && !isActive;

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                {/* Circle */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono transition-all duration-300
                    ${isDone ? 'bg-teal text-teal-text' : ''}
                    ${isActive ? 'border-2 border-amber bg-amber/10' : ''}
                    ${isFuture ? 'border border-border-dim bg-surface text-text-faint' : ''}
                    ${isFailed && i === currentIndex ? 'border-2 border-coral bg-coral/10' : ''}
                  `}
                >
                  {isDone && '✓'}
                  {isActive && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber animate-pulse" />
                  )}
                  {isFuture && <span className="text-text-faint text-xs">{i + 1}</span>}
                  {isFailed && i === currentIndex && '✕'}
                </div>
                {/* Label */}
                <span className={`text-xs font-body hidden sm:block
                  ${isDone ? 'text-teal' : ''}
                  ${isActive ? 'text-amber' : ''}
                  ${isFuture ? 'text-text-faint' : ''}
                `}>
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 mx-1 transition-all duration-500
                  ${i < currentIndex ? 'bg-teal' : 'bg-border-dim'}
                `} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

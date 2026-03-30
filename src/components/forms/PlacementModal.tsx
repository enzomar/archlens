import React, { useState } from 'react';
import {
  Sparkles, ArrowLeft, Check, X, Building2, Zap, Database,
  Square, Layers, Package,
} from 'lucide-react';
import type { EntityKind, Viewpoint, ZoomLevel } from '../../domain/types';
import { VIEWPOINT_LABELS } from '../../domain/types';

// ─── Types ────────────────────────────────────────────────────────

export interface PlacementResult {
  viewpoint: Viewpoint;
  kind:      EntityKind;
  zoomLevel: ZoomLevel;
}

interface Props {
  onConfirm: (result: PlacementResult) => void;
  onSkip:    () => void;
}

type Step = 'intent' | 'scope' | 'refine' | 'result';

interface Answers {
  intent?: 'business' | 'application' | 'technology';
  scope?:  'context' | 'container' | 'component';
  refine?: 'independent' | 'part-of' | 'external';
}

// ─── Option definitions ───────────────────────────────────────────

const INTENT_OPTIONS = [
  {
    id:    'business' as const,
    Icon:  Building2,
    title: 'Business activity, process or actor',
    desc:  'A person, department, workflow or business capability',
    badge: 'Business',
  },
  {
    id:    'application' as const,
    Icon:  Zap,
    title: 'Application, service or feature',
    desc:  'Software that delivers value to users or other systems',
    badge: 'Application',
  },
  {
    id:    'technology' as const,
    Icon:  Database,
    title: 'Technology element',
    desc:  'Database, infrastructure, messaging bus or platform service',
    badge: 'Technology',
  },
];

const SCOPE_OPTIONS = [
  {
    id:    'context' as const,
    Icon:  Square,
    title: 'A whole system or external dependency',
    desc:  'You treat it as a black box — its internals are not your concern',
    badge: 'System context',
  },
  {
    id:    'container' as const,
    Icon:  Layers,
    title: 'A major building block or service',
    desc:  'Independently deployable — has its own process or data store',
    badge: 'Container',
  },
  {
    id:    'component' as const,
    Icon:  Package,
    title: 'A detailed internal part',
    desc:  'Runs inside a larger service — a module, class or subsystem',
    badge: 'Component',
  },
];

const REFINE_OPTIONS = [
  {
    id:    'independent' as const,
    title: 'Yes — it runs independently',
    desc:  'Has its own process, container image or data store',
  },
  {
    id:    'part-of' as const,
    title: 'No — it lives inside something else',
    desc:  'Compiled into or embedded within a larger service',
  },
  {
    id:    'external' as const,
    title: "It's outside my system boundary",
    desc:  'A third-party or external dependency I call into',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────

function computeResult(answers: Required<Pick<Answers, 'intent' | 'scope'>> & Pick<Answers, 'refine'>): PlacementResult {
  const viewpoint: Viewpoint = answers.intent;

  let zoom = answers.scope;
  if (answers.refine === 'external')     zoom = 'context';
  if (answers.refine === 'part-of')      zoom = 'component';
  if (answers.refine === 'independent')  zoom = 'container';

  const kindMap: Record<string, EntityKind> = {
    business_context:          'person',
    business_container:        'person',
    business_component:        'evaluation',
    application_context:       'system',
    application_container:     'container',
    application_component:     'component',
    technology_context:         'system',
    technology_container:       'container',
    technology_component:       'component',
  };

  const zoomMap: Record<string, ZoomLevel> = {
    context:   'context',
    container: 'container',
    component: 'component',
  };

  return {
    viewpoint,
    kind:      kindMap[`${viewpoint}_${zoom}`] ?? 'system',
    zoomLevel: zoomMap[zoom] ?? 'context',
  };
}

const KIND_LABEL: Record<string, string> = {
  person:     'Person / Role',
  system:     'System',
  container:  'Container',
  component:  'Component',
  evaluation: 'Evaluation',
};

const KIND_EXPLANATION: Record<string, string> = {
  person:     'Represents a human user, role or business actor that interacts with your systems.',
  system:     'Represents a complete system or external dependency, treated as a black box.',
  container:  'An independently deployable unit — an application, microservice, or data store.',
  component:  'An internal module or subsystem within a container, not deployable on its own.',
  evaluation: 'A business metric, KPI or evaluation process in the business domain.',
};

function needsRefinement(scope: Answers['scope']): boolean {
  return scope === 'container';
}

// ─── Step sub-components ──────────────────────────────────────────

interface OptionCardProps {
  selected:   boolean;
  onClick:    () => void;
  children:   React.ReactNode;
}
const OptionCard: React.FC<OptionCardProps> = ({ selected, onClick, children }) => (
  <button
    type="button"
    className={`pm-option-card${selected ? ' pm-option-card--selected' : ''}`}
    onClick={onClick}
  >
    {children}
  </button>
);

// ─── Main component ───────────────────────────────────────────────

export const PlacementModal: React.FC<Props> = ({ onConfirm, onSkip }) => {
  const [step,    setStep]    = useState<Step>('intent');
  const [answers, setAnswers] = useState<Answers>({});
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward');

  function advance(nextStep: Step, dir: 'forward' | 'back' = 'forward') {
    setAnimDir(dir);
    setStep(nextStep);
  }

  function selectIntent(val: Answers['intent']) {
    setAnswers(prev => ({ ...prev, intent: val, scope: undefined, refine: undefined }));
    advance('scope');
  }

  function selectScope(val: Answers['scope']) {
    const next = { ...answers, scope: val, refine: undefined };
    setAnswers(next);
    if (needsRefinement(val)) {
      advance('refine');
    } else {
      advance('result');
    }
  }

  function selectRefine(val: Answers['refine']) {
    setAnswers(prev => ({ ...prev, refine: val }));
    advance('result');
  }

  function goBack() {
    if (step === 'result' && needsRefinement(answers.scope)) {
      advance('refine', 'back');
    } else if (step === 'result') {
      advance('scope', 'back');
    } else if (step === 'refine') {
      advance('scope', 'back');
    } else if (step === 'scope') {
      advance('intent', 'back');
    }
  }

  const result = (step === 'result' && answers.intent && answers.scope)
    ? computeResult({ intent: answers.intent, scope: answers.scope, refine: answers.refine })
    : null;

  const stepIndex = { intent: 0, scope: 1, refine: 2, result: needsRefinement(answers.scope) ? 3 : 2 }[step];
  const totalSteps = needsRefinement(answers.scope) ? 3 : 2;

  return (
    <div className="pm-overlay" role="dialog" aria-modal="true" aria-label="Placement assistant">
      <div className="pm-modal">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="pm-header">
          <span className="pm-header-badge">
            <Sparkles size={13} />
            Placement guide
          </span>
          <button
            type="button"
            className="pm-skip-btn"
            onClick={onSkip}
            aria-label="Skip placement guide"
          >
            Skip <X size={12} />
          </button>
        </div>

        {/* ── Progress dots ────────────────────────────────── */}
        <div className="pm-progress" aria-label={`Step ${stepIndex + 1} of ${totalSteps + 1}`}>
          {[...Array(totalSteps + 1)].map((_, i) => (
            <span
              key={i}
              className={`pm-dot${i < stepIndex ? ' pm-dot--done' : i === stepIndex ? ' pm-dot--active' : ''}`}
            />
          ))}
        </div>

        {/* ── Step content ────────────────────────────────── */}
        <div className={`pm-step pm-step--${animDir}`} key={step}>

          {step === 'intent' && (
            <>
              <p className="pm-question">What is the primary purpose of what you want to create?</p>
              <div className="pm-options">
                {INTENT_OPTIONS.map(opt => (
                  <OptionCard key={opt.id} selected={answers.intent === opt.id} onClick={() => selectIntent(opt.id)}>
                    <span className="pm-opt-icon"><opt.Icon size={22} strokeWidth={1.5} /></span>
                    <span className="pm-opt-body">
                      <span className="pm-opt-title">{opt.title}</span>
                      <span className="pm-opt-desc">{opt.desc}</span>
                    </span>
                    <span className="pm-opt-badge">{opt.badge}</span>
                  </OptionCard>
                ))}
              </div>
            </>
          )}

          {step === 'scope' && (
            <>
              <p className="pm-question">At what level are you thinking about it?</p>
              <div className="pm-options">
                {SCOPE_OPTIONS.map(opt => (
                  <OptionCard key={opt.id} selected={answers.scope === opt.id} onClick={() => selectScope(opt.id)}>
                    <span className="pm-opt-icon"><opt.Icon size={22} strokeWidth={1.5} /></span>
                    <span className="pm-opt-body">
                      <span className="pm-opt-title">{opt.title}</span>
                      <span className="pm-opt-desc">{opt.desc}</span>
                    </span>
                    <span className="pm-opt-badge">{opt.badge}</span>
                  </OptionCard>
                ))}
              </div>
            </>
          )}

          {step === 'refine' && (
            <>
              <p className="pm-question">Would this be deployed or managed independently?</p>
              <div className="pm-options pm-options--compact">
                {REFINE_OPTIONS.map(opt => (
                  <OptionCard key={opt.id} selected={answers.refine === opt.id} onClick={() => selectRefine(opt.id)}>
                    <span className="pm-opt-body">
                      <span className="pm-opt-title">{opt.title}</span>
                      <span className="pm-opt-desc">{opt.desc}</span>
                    </span>
                  </OptionCard>
                ))}
              </div>
            </>
          )}

          {step === 'result' && result && (
            <div className="pm-result">
              <div className="pm-result-label">Suggested placement</div>
              <div className="pm-result-pill">
                <span className="pm-result-vp">{VIEWPOINT_LABELS[result.viewpoint]}</span>
                <span className="pm-result-sep">·</span>
                <span className="pm-result-kind">{KIND_LABEL[result.kind] ?? result.kind}</span>
              </div>
              <p className="pm-result-explanation">
                {KIND_EXPLANATION[result.kind] ?? ''}
              </p>
              <div className="pm-result-actions">
                <button
                  type="button"
                  className="pm-btn pm-btn--primary"
                  onClick={() => onConfirm(result)}
                  autoFocus
                >
                  <Check size={14} /> Confirm &amp; prefill
                </button>
                <button
                  type="button"
                  className="pm-btn pm-btn--secondary"
                  onClick={() => advance('intent', 'back')}
                >
                  <ArrowLeft size={14} /> Start over
                </button>
                <button
                  type="button"
                  className="pm-btn pm-btn--ghost"
                  onClick={onSkip}
                >
                  Skip
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Back link (non-first steps) ────────────────── */}
        {step !== 'intent' && step !== 'result' && (
          <button type="button" className="pm-back-btn" onClick={goBack}>
            <ArrowLeft size={13} /> Back
          </button>
        )}

      </div>
    </div>
  );
};

'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type {
  StepKey,
  StepData,
  StepStatus,
} from '@/components/organization/hackathons/new/constants';
import { STEP_ORDER } from '@/components/organization/hackathons/new/constants';

interface UseHackathonStepsReturn {
  activeTab: StepKey;
  steps: Record<StepKey, StepData>;
  setActiveTab: (tab: StepKey) => void;
  setStepsFromDraft: (
    steps: Record<StepKey, StepData>,
    activeStep: StepKey
  ) => void;
  navigateToStep: (stepKey: StepKey) => void;
  updateStepCompletion: (
    stepKey: StepKey,
    isCompleted: boolean,
    nextStep?: StepKey
  ) => void;
}

function isStepKey(value: string | null | undefined): value is StepKey {
  return !!value && (STEP_ORDER as readonly string[]).includes(value);
}

/**
 * Wizard step state. The active step is URL-driven via the `?step=` query param,
 * so refresh, browser back/forward, and bookmarking all resume the right step.
 *
 * Navigation is free-roam: any step is reachable at any time, regardless of
 * whether earlier steps are complete. The per-step status map
 * (active/completed/pending) is purely presentational (it drives the tab badge),
 * never a navigation gate. Validation happens only when a section is saved and
 * again at final submit, never on navigation.
 */
export const useHackathonSteps = (
  initialActiveTab: StepKey = 'information'
): UseHackathonStepsReturn => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlStep = searchParams.get('step');
  const activeTab: StepKey = isStepKey(urlStep) ? urlStep : initialActiveTab;

  const [steps, setSteps] = useState<Record<StepKey, StepData>>({
    information: { status: 'active', isCompleted: false },
    timeline: { status: 'pending', isCompleted: false },
    participation: { status: 'pending', isCompleted: false },
    tracks: { status: 'pending', isCompleted: false },
    rewards: { status: 'pending', isCompleted: false },
    'custom-questions': { status: 'pending', isCompleted: false },
    resources: { status: 'pending', isCompleted: false },
    judging: { status: 'pending', isCompleted: false },
    collaboration: { status: 'pending', isCompleted: false },
    review: { status: 'pending', isCompleted: false },
  });

  // Write the active step to the URL. `push` for explicit navigation (so the
  // back button steps through), `replace` for programmatic syncs (auto-resume).
  const writeStep = useCallback(
    (stepKey: StepKey, mode: 'push' | 'replace' = 'push') => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('step', stepKey);
      const url = `${pathname}?${params.toString()}`;
      if (mode === 'replace') router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const setActiveTab = useCallback(
    (tab: StepKey) => writeStep(tab, 'push'),
    [writeStep]
  );

  // Free navigation: mark the target step active and sync the URL. Never reset
  // or invalidate other steps' progress. The old implementation wiped every
  // later step back to `pending` on a forward jump, which silently discarded
  // completion badges and made the tab strip "act weird"; that is removed.
  const navigateToStep = useCallback(
    (stepKey: StepKey) => {
      setSteps(prev => ({
        ...prev,
        [stepKey]: { ...prev[stepKey], status: 'active' as StepStatus },
      }));
      writeStep(stepKey, 'push');
    },
    [writeStep]
  );

  const setStepsFromDraft = useCallback(
    (stepsState: Record<StepKey, StepData>, activeStep: StepKey) => {
      setSteps(stepsState);
      // Respect an explicit ?step= in the URL (a refresh / bookmark). Only fall
      // back to the computed first-incomplete step when the URL has none, and
      // do it as a replace so auto-resume doesn't add a history entry.
      if (!isStepKey(searchParams.get('step'))) {
        writeStep(activeStep, 'replace');
      }
    },
    [searchParams, writeStep]
  );

  const updateStepCompletion = useCallback(
    (stepKey: StepKey, isCompleted: boolean, nextStep?: StepKey) => {
      setSteps(prev => {
        const newSteps: Record<StepKey, StepData> = {
          ...prev,
          [stepKey]: {
            ...prev[stepKey],
            status: 'completed' as StepStatus,
            isCompleted,
          },
        };

        if (nextStep) {
          newSteps[nextStep] = {
            ...prev[nextStep],
            status: 'active' as StepStatus,
          };
        }

        return newSteps;
      });

      if (nextStep) {
        writeStep(nextStep, 'push');
      }
    },
    [writeStep]
  );

  return {
    activeTab,
    steps,
    setActiveTab,
    setStepsFromDraft,
    navigateToStep,
    updateStepCompletion,
  };
};

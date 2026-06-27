'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Trophy,
  Sparkles,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Ban,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useWinnersBoard } from '@/hooks/use-winners-board';
import type {
  WinnersBoard as WinnersBoardData,
  WinnersBoardPrize,
  WinnersBoardPlacement,
} from '@/lib/api/hackathons/winners';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function placementTitle(
  prize: WinnersBoardPrize,
  pl: WinnersBoardPlacement
): string {
  if (pl.label) return `${prize.prizeName} · ${pl.label}`;
  if (prize.placements.length > 1)
    return `${prize.prizeName} · ${ordinal(pl.position)} place`;
  return prize.prizeName;
}

function formatAmount(amount: string, currency: string): string {
  const n = Number.parseFloat(amount || '0');
  const formatted = Number.isFinite(n) ? n.toLocaleString('en-US') : amount;
  return `${formatted} ${currency}`;
}

const NONE_VALUE = '__none__';
const WITHHELD_VALUE = '__withheld__';

interface WinnersBoardProps {
  organizationId: string;
  hackathonId: string;
  /** Notifies the parent whenever the board (re)loads, for gate/readiness UI. */
  onBoardLoaded?: (board: WinnersBoardData) => void;
}

export function WinnersBoard({
  organizationId,
  hackathonId,
  onBoardLoaded,
}: WinnersBoardProps) {
  const {
    board,
    isLoading,
    error,
    savingPlacementId,
    selectWinner,
    clearWinner,
    withholdWinner,
  } = useWinnersBoard(organizationId, hackathonId);

  const [pending, setPending] = useState<{
    placementId: string;
    submissionId: string;
    projectName: string;
    otherLabel: string;
  } | null>(null);

  useEffect(() => {
    if (board) onBoardLoaded?.(board);
  }, [board, onBoardLoaded]);

  // submissionId -> the placement titles it currently holds. Used to warn when
  // a pick would hand the same project a second prize (stacking).
  const heldBy = useMemo(() => {
    const m = new Map<string, string[]>();
    board?.prizes.forEach(prize =>
      prize.placements.forEach(pl => {
        if (pl.selected) {
          const list = m.get(pl.selected.submissionId) ?? [];
          list.push(placementTitle(prize, pl));
          m.set(pl.selected.submissionId, list);
        }
      })
    );
    return m;
  }, [board]);

  const handlePick = (
    prize: WinnersBoardPrize,
    pl: WinnersBoardPlacement,
    submissionId: string
  ) => {
    if (submissionId === WITHHELD_VALUE) {
      void withholdWinner(pl.placementId);
      return;
    }
    // Placeholder sentinel (shown when there's no winner) — not selectable.
    if (submissionId === NONE_VALUE) return;
    if (pl.selected?.submissionId === submissionId) return;
    // Already winning elsewhere? Confirm the stacking first.
    const elsewhere = (heldBy.get(submissionId) ?? []).filter(
      title => title !== placementTitle(prize, pl)
    );
    const candidate = pl.candidates.find(c => c.submissionId === submissionId);
    if (elsewhere.length > 0) {
      setPending({
        placementId: pl.placementId,
        submissionId,
        projectName: candidate?.projectName ?? 'This project',
        otherLabel: elsewhere[0],
      });
      return;
    }
    void selectWinner(pl.placementId, submissionId);
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center gap-3 py-12 text-gray-400'>
        <Loader2 className='h-5 w-5 animate-spin' />
        Loading winners...
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-lg border border-red-900 bg-red-950/20 p-6 text-center text-red-300'>
        {error}
      </div>
    );
  }

  if (!board || board.prizes.length === 0) {
    return (
      <div className='rounded-lg border border-gray-800 bg-gray-900/40 p-8 text-center text-gray-400'>
        <p className='font-medium text-white'>No prizes to award</p>
        <p className='mt-1 text-sm'>
          Add prizes in the Rewards section before picking winners.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {board.prizes.map(prize => (
        <div
          key={prize.prizeId}
          className='overflow-hidden rounded-xl border border-gray-800 bg-gray-900/40'
        >
          <div className='flex items-center gap-2 border-b border-gray-800 px-4 py-3'>
            <Trophy className='h-4 w-4 text-amber-400' />
            <span className='text-sm font-semibold text-white'>
              {prize.prizeName}
            </span>
            <span className='text-xs text-gray-500'>
              {prize.isOverall ? 'Overall' : 'Track'}
            </span>
          </div>

          <div className='divide-y divide-gray-800/70'>
            {prize.placements.map(pl => {
              const saving = savingPlacementId === pl.placementId;
              const isOverride = pl.selected?.source === 'ORGANIZER_OVERRIDE';
              return (
                <div key={pl.placementId} className='px-4 py-3'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div className='min-w-0'>
                      <p className='text-sm font-medium text-white'>
                        {pl.label ??
                          (prize.placements.length > 1
                            ? `${ordinal(pl.position)} place`
                            : 'Winner')}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {formatAmount(pl.amount, pl.currency)}
                      </p>
                    </div>

                    <div className='flex items-center gap-2'>
                      {saving && (
                        <Loader2 className='h-4 w-4 animate-spin text-gray-400' />
                      )}
                      <Select
                        value={
                          pl.withheld
                            ? WITHHELD_VALUE
                            : (pl.selected?.submissionId ?? NONE_VALUE)
                        }
                        onValueChange={v => handlePick(prize, pl, v)}
                        disabled={saving}
                      >
                        <SelectTrigger className='w-[260px] border-gray-700 bg-black/40 text-left text-sm'>
                          <SelectValue placeholder='Pick a winner' />
                        </SelectTrigger>
                        <SelectContent className='max-h-72'>
                          {pl.candidates.map(c => (
                            <SelectItem
                              key={c.submissionId}
                              value={c.submissionId}
                            >
                              {c.projectName || 'Untitled project'} (
                              {c.averageScore.toFixed(1)})
                            </SelectItem>
                          ))}
                          <SelectItem value={WITHHELD_VALUE}>
                            Don&apos;t award this prize
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className='mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs'>
                    {pl.withheld ? (
                      <>
                        <span className='inline-flex items-center gap-1 text-gray-400'>
                          <Ban className='h-3 w-3' /> Not awarded
                        </span>
                        {pl.defaultCandidate && (
                          <button
                            type='button'
                            onClick={() => clearWinner(pl.placementId)}
                            className='inline-flex items-center gap-1 text-gray-400 hover:text-white'
                          >
                            <RotateCcw className='h-3 w-3' /> Award{' '}
                            {pl.defaultCandidate.projectName} instead
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {pl.defaultCandidate &&
                          pl.selected?.submissionId !==
                            pl.defaultCandidate.submissionId && (
                            <span className='inline-flex items-center gap-1 text-gray-500'>
                              <Sparkles className='h-3 w-3' />
                              Suggested: {pl.defaultCandidate.projectName}
                            </span>
                          )}
                        {isOverride && (
                          <button
                            type='button'
                            onClick={() => clearWinner(pl.placementId)}
                            className='inline-flex items-center gap-1 text-gray-400 hover:text-white'
                          >
                            <RotateCcw className='h-3 w-3' /> Use the suggested
                            winner
                          </button>
                        )}
                        {pl.conflict && (
                          <span className='inline-flex items-center gap-1 text-amber-400'>
                            <AlertTriangle className='h-3 w-3' />
                            Also wins another prize
                          </span>
                        )}
                        {!pl.selected && (
                          <span className='text-gray-500'>
                            No winner yet for this prize.
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <AlertDialog
        open={!!pending}
        onOpenChange={open => !open && setPending(null)}
      >
        <AlertDialogContent className='border-gray-800 bg-gray-950'>
          <AlertDialogHeader>
            <AlertDialogTitle>Award a second prize?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.projectName} already wins {pending?.otherLabel}. Give
              them this prize as well?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPending(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending)
                  void selectWinner(pending.placementId, pending.submissionId);
                setPending(null);
              }}
            >
              Award both
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default WinnersBoard;

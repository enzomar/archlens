import { create, useStore as useZustandStore } from 'zustand';
import { temporal } from 'zundo';
import type { TemporalState } from 'zundo';
import { v4 as uuid } from 'uuid';
import type { DiagramTab } from '../domain/types';

// ─── RE-EXPORTS (backward-compat for all existing importers) ─────
export type { LogEntry, ArchLensState } from './storeTypes';
export type { DiagramSnapshot } from './storeTypes';

import type { ArchLensState, DiagramSnapshot } from './storeTypes';
import { emptyTabData } from './tabHelpers';
import { createEntitySlice } from './slices/entitySlice';
import { createNavigationSlice } from './slices/navigationSlice';
import { createUiSlice } from './slices/uiSlice';
import { createDataSlice } from './slices/dataSlice';

// ─── INITIAL TAB ──────────────────────────────────────────────────
const _initialTabId = uuid();
const _initialTab: DiagramTab = { id: _initialTabId, name: 'Diagram 1', ...emptyTabData() };

// ─── STORE ────────────────────────────────────────────────────────
export const useStore = create<ArchLensState>()(
  temporal(
    (set, get) => ({
      ...(createEntitySlice(set as never, get as never) as unknown as Partial<ArchLensState>),
      ...(createNavigationSlice(set as never, get as never) as unknown as Partial<ArchLensState>),
      ...(createUiSlice(set as never, get as never) as unknown as Partial<ArchLensState>),
      ...(createDataSlice(set as never, get as never, _initialTab) as unknown as Partial<ArchLensState>),
    }) as ArchLensState,
    {
      partialize: (state): DiagramSnapshot => ({
        entities: state.entities,
        relationships: state.relationships,
        positions: state.positions,
        notes: state.notes,
        boundaries: state.boundaries,
        traceabilityLinks: state.traceabilityLinks,
      }),
      limit: 100,
    }
  )
);

// ─── TEMPORAL STORE (undo / redo) ────────────────────────────────
export const useTemporalStore = <T>(
  selector: (state: TemporalState<DiagramSnapshot>) => T
): T => useZustandStore(useStore.temporal, selector);

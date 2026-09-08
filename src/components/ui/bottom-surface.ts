// Keep floating overlays in step with the authenticated navigation dock.
// The sheet clearance includes the dock inset, its 56px height, and a 12px gap.
export const bottomSurfaceTokensClass =
  '[--bottom-dock-height:3.5rem] [--bottom-popup-gap:0.75rem]';

export const bottomDockInsetClass =
  'bottom-[max(var(--bottom-popup-gap),env(safe-area-inset-bottom))]';

export const bottomDockHeightClass = 'h-[var(--bottom-dock-height)]';

export const sheetDockClearanceClass =
  '[--sheet-bottom-clearance:calc(max(var(--bottom-popup-gap),env(safe-area-inset-bottom))+var(--bottom-dock-height)+var(--bottom-popup-gap))]';

export const floatingPopupDialogClass = `modal items-end justify-items-center px-3 pb-[var(--sheet-bottom-clearance)] ${bottomSurfaceTokensClass} ${sheetDockClearanceClass}`;

export const floatingPopupBoxClass =
  'modal-box w-full max-w-xl max-h-[calc(var(--sheet-viewport-height,100dvh)-var(--sheet-bottom-clearance))] overflow-y-auto rounded-box border border-base-300/60 bg-base-100 px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl';

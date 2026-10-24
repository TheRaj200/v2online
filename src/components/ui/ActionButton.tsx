import React from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { ActionState } from '../../hooks/useAsyncAction';

/**
 * 3-Stage Action Button
 *   1. idle    -> normal label (children)
 *   2. loading -> spinner + loadingText, disabled (double click block)
 *   3. success -> green check + successText  |  error -> red cross + errorText
 *   (kuch der baad apne aap idle par wapas — useAsyncAction handle karta hai)
 *
 * Usage:
 *   const save = useAsyncAction();
 *   <ActionButton state={save.state} onClick={() => save.run(doSave)} loadingText="Saving...">Save</ActionButton>
 *
 * Form submit ke liye: type="submit" + form onSubmit me `save.run(...)`.
 */
interface ActionButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  state?: ActionState;
  children: React.ReactNode;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  /** Success/Error stage par bhi button ka original color rakhna ho to true */
  keepColorOnResult?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  state = 'idle',
  children,
  loadingText = 'Processing...',
  successText = 'Done!',
  errorText = 'Failed',
  keepColorOnResult = false,
  className = '',
  disabled,
  type = 'button',
  ...rest
}) => {
  const isLoading = state === 'loading';
  const resultColor =
    keepColorOnResult || state === 'idle' || state === 'loading'
      ? ''
      : state === 'success'
        ? '!bg-emerald-600 !border-emerald-600 !text-white'
        : '!bg-red-600 !border-red-600 !text-white';

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-live="polite"
      className={`inline-flex items-center justify-center gap-1.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer ${className} ${resultColor}`}
      {...rest}
    >
      {state === 'loading' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>{loadingText}</span>
        </>
      )}
      {state === 'success' && (
        <>
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successText}</span>
        </>
      )}
      {state === 'error' && (
        <>
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{errorText}</span>
        </>
      )}
      {state === 'idle' && children}
    </button>
  );
};

export default ActionButton;

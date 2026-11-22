import {UseMutationOptions, useMutation} from '@tanstack/react-query';
import {errorText} from '../lib/apiClient';

// React Query mutation that also exposes the backend / network error as ready-to-show text.
export function useApiMutation<TData, TVars = void>(
  fn: (vars: TVars) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, unknown, TVars>, 'mutationFn'>,
) {
  const mutation = useMutation<TData, unknown, TVars>({
    mutationFn: fn,
    ...options,
  });
  return {
    ...mutation,
    errorMessage: mutation.error ? errorText(mutation.error) : '',
  };
}

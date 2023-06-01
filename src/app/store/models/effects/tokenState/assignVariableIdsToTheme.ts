import type { RematchDispatch } from '@rematch/core';
import type { RootModel } from '@/types/RootModel';

export function assignVariableIdsToTheme(dispatch: RematchDispatch<RootModel>) {
  return (): void => {
    dispatch.tokenState.updateDocument({
      updateRemote: true,
      shouldUpdateNodes: false,
    });
  };
}

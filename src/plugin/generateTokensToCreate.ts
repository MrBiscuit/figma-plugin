import { TokenSetStatus } from '@/constants/TokenSetStatus';
import { TokenTypes } from '@/constants/TokenTypes';
import { ThemeObject } from '@/types';
import { AnyTokenList } from '@/types/tokens';
import { mergeTokenGroups, resolveTokenValues } from './tokenHelpers';

export function generateTokensToCreate(theme: ThemeObject, tokens: Record<string, AnyTokenList>, availableTokenTypes: TokenTypes[]) {
  const enabledTokenSets = Object.entries(theme.selectedTokenSets)
    .filter(([, status]) => status === TokenSetStatus.ENABLED)
    .map(([tokenSet]) => tokenSet);
  const resolved = resolveTokenValues(mergeTokenGroups(tokens, theme.selectedTokenSets));
  return resolved.filter(
    (token) => ((!token.internal__Parent || enabledTokenSets.includes(token.internal__Parent)) && availableTokenTypes.includes(token.type)), // filter out SOURCE tokens
  );
}

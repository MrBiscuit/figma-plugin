import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { LDProps } from 'launchdarkly-react-client-sdk/lib/withLDConsumer';
import { track } from '@/utils/analytics';
import { useJSONbin } from './providers/jsonbin';
import useURL from './providers/url';
import { Dispatch } from '../store';
import useStorage from './useStorage';
import { useGitHub } from './providers/github';
import { useBitbucket } from './providers/bitbucket';
import { useGitLab } from './providers/gitlab';
import { useADO } from './providers/ado';
import useFile from '@/app/store/providers/file';
import { BackgroundJobs } from '@/constants/BackgroundJobs';
import { apiSelector } from '@/selectors';
import { UsedTokenSetsMap } from '@/types';
import { RemoteTokenStorageData } from '@/storage/RemoteTokenStorage';
import { AsyncMessageTypes } from '@/types/AsyncMessages';
import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import { StorageProviderType } from '@/constants/StorageProviderType';
import { StorageTypeCredentials, StorageTypeFormValues } from '@/types/StorageType';
import { saveLastSyncedState } from '@/utils/saveLastSyncedState';

type PullTokensOptions = {
  context?: StorageTypeCredentials,
  featureFlags?: LDProps['flags'],
  usedTokenSet?: UsedTokenSetsMap | null
  activeTheme?: string | null
};

// @TODO typings and hooks

export default function useRemoteTokens() {
  const dispatch = useDispatch<Dispatch>();
  const api = useSelector(apiSelector);

  const { setStorageType } = useStorage();
  const { pullTokensFromJSONBin, addJSONBinCredentials, createNewJSONBin } = useJSONbin();
  const {
    addNewGitHubCredentials,
    syncTokensWithGitHub,
    pullTokensFromGitHub,
    pushTokensToGitHub,
    createGithubBranch,
    fetchGithubBranches,
  } = useGitHub();
  const {
    addNewGitLabCredentials,
    syncTokensWithGitLab,
    pullTokensFromGitLab,
    pushTokensToGitLab,
    fetchGitLabBranches,
    createGitLabBranch,
  } = useGitLab();
  const {
    addNewBitbucketCredentials,
    syncTokensWithBitbucket,
    pullTokensFromBitbucket,
    pushTokensToBitbucket,
    fetchBitbucketBranches,
    createBitbucketBranch,
  } = useBitbucket();
  const {
    addNewADOCredentials,
    syncTokensWithADO,
    pullTokensFromADO,
    pushTokensToADO,
    createADOBranch,
    fetchADOBranches,
  } = useADO();
  const { pullTokensFromURL } = useURL();
  const { readTokensFromFileOrDirectory } = useFile();

  const pullTokens = useCallback(
    async ({
      context = api, featureFlags, usedTokenSet, activeTheme,
    }: PullTokensOptions) => {
      track('pullTokens', { provider: context.provider });
      dispatch.uiState.startJob({
        name: BackgroundJobs.UI_PULLTOKENS,
        isInfinite: true,
      });

      let remoteData: RemoteTokenStorageData<unknown> | null = null;
      switch (context.provider) {
        case StorageProviderType.JSONBIN: {
          remoteData = await pullTokensFromJSONBin(context);
          break;
        }
        case StorageProviderType.GITHUB: {
          remoteData = await pullTokensFromGitHub(context, featureFlags);
          break;
        }
        case StorageProviderType.GITLAB: {
          remoteData = await pullTokensFromGitLab(context, featureFlags);
          break;
        }
        case StorageProviderType.BITBUCKET: {
          remoteData = await pullTokensFromBitbucket(context, featureFlags);
          break;
        }
        case StorageProviderType.ADO: {
          remoteData = await pullTokensFromADO(context, featureFlags);
          break;
        }
        case StorageProviderType.URL: {
          remoteData = await pullTokensFromURL(context);
          break;
        }
        default:
          throw new Error('Not implemented');
      }
      console.log("remote", remoteData)
      if (remoteData) {
        console.log("if", remoteData)
        dispatch.tokenState.setLastSyncedState(JSON.stringify([remoteData.tokens, remoteData.themes], null, 2));
        dispatch.tokenState.setTokenData({
          values: remoteData.tokens,
          themes: remoteData.themes,
          activeTheme: activeTheme ?? null,
          usedTokenSet: usedTokenSet ?? {},
        });
        track('Launched with token sets', {
          count: Object.keys(remoteData.tokens).length,
          setNames: Object.keys(remoteData.tokens),
        });
      }
      dispatch.uiState.completeJob(BackgroundJobs.UI_PULLTOKENS);
      return remoteData;
    },
    [
      dispatch,
      api,
      pullTokensFromGitHub,
      pullTokensFromBitbucket,
      pullTokensFromGitLab,
      pullTokensFromJSONBin,
      pullTokensFromURL,
      pullTokensFromADO,
    ],
  );

  const restoreStoredProvider = useCallback(
    async (context: StorageTypeCredentials) => {
      track('restoreStoredProvider', { provider: context.provider });
      dispatch.uiState.setLocalApiState(context);
      dispatch.uiState.setApiData(context);
      dispatch.tokenState.setEditProhibited(false);
      setStorageType({ provider: context, shouldSetInDocument: true });
      switch (context.provider) {
        case StorageProviderType.GITHUB: {
          await syncTokensWithGitHub(context);
          break;
        }
        case StorageProviderType.GITLAB: {
          await syncTokensWithGitLab(context);
          break;
        }
        case StorageProviderType.BITBUCKET: {
          await syncTokensWithBitbucket(context);
          break;
        }
        case StorageProviderType.ADO: {
          await syncTokensWithADO(context);
          break;
        }
        default:
          await pullTokens({ context });
      }
      return null;
    },
    [
      dispatch,
      setStorageType,
      pullTokens,
      syncTokensWithGitHub,
      syncTokensWithGitLab,
      syncTokensWithBitbucket,
      syncTokensWithADO,
    ],
  );

  const pushTokens = useCallback(
    async (context: StorageTypeCredentials = api) => {
      track('pushTokens', { provider: context.provider });
      switch (context.provider) {
        case StorageProviderType.GITHUB: {
          await pushTokensToGitHub(context);
          break;
        }
        case StorageProviderType.BITBUCKET: {
          await pushTokensToBitbucket(context);
          break;
        }
        case StorageProviderType.GITLAB: {
          await pushTokensToGitLab(context);
          break;
        }
        case StorageProviderType.ADO: {
          await pushTokensToADO(context);
          break;
        }
        default:
          throw new Error('Not implemented');
      }
    },
    [api, pushTokensToGitHub, pushTokensToGitLab, pushTokensToBitbucket, pushTokensToADO],
  );

  const addNewProviderItem = useCallback(
    async (credentials: StorageTypeFormValues<false>): Promise<boolean> => {
      let data;
      switch (credentials.provider) {
        case StorageProviderType.JSONBIN: {
          if (credentials.id) {
            data = await addJSONBinCredentials(credentials);
          } else {
            const id = await createNewJSONBin(credentials);
            if (id) {
              credentials.id = id;
              data = true;
            }
          }
          break;
        }
        case StorageProviderType.GITHUB: {
          data = await addNewGitHubCredentials(credentials);
          break;
        }
        case StorageProviderType.BITBUCKET: {
          data = await addNewBitbucketCredentials(credentials);
          break;
        }
        case StorageProviderType.GITLAB: {
          data = await addNewGitLabCredentials(credentials);
          break;
        }
        case StorageProviderType.ADO: {
          data = await addNewADOCredentials(credentials);
          break;
        }
        case StorageProviderType.URL: {
          data = await pullTokensFromURL(credentials);
          break;
        }
        default:
          throw new Error('Not implemented');
      }
      if (data) {
        dispatch.uiState.setLocalApiState(credentials as StorageTypeCredentials); // in JSONBIN the ID can technically be omitted, but this function handles this by creating a new JSONBin and assigning the ID
        dispatch.uiState.setApiData(credentials as StorageTypeCredentials);
        setStorageType({ provider: credentials as StorageTypeCredentials, shouldSetInDocument: true });
        return true;
      }
      return false;
    },
    [
      dispatch,
      addJSONBinCredentials,
      addNewGitLabCredentials,
      addNewBitbucketCredentials,
      addNewGitHubCredentials,
      addNewADOCredentials,
      createNewJSONBin,
      pullTokensFromURL,
      setStorageType,
    ],
  );

  const addNewBranch = useCallback(
    async (context: StorageTypeCredentials, branch: string, source?: string) => {
      let newBranchCreated = false;
      switch (context.provider) {
        case StorageProviderType.GITHUB: {
          newBranchCreated = await createGithubBranch(context, branch, source);
          break;
        }
        case StorageProviderType.BITBUCKET: {
          newBranchCreated = await createBitbucketBranch(context, branch, source);
          break;
        }
        case StorageProviderType.GITLAB: {
          newBranchCreated = await createGitLabBranch(context, branch, source);
          break;
        }
        case StorageProviderType.ADO: {
          newBranchCreated = await createADOBranch(context, branch, source);
          break;
        }
        default:
          throw new Error('Not implemented');
      }

      return newBranchCreated;
    },
    [createGithubBranch, createADOBranch, createBitbucketBranch],
  );

  const fetchBranches = useCallback(
    async (context: StorageTypeCredentials) => {
      switch (context.provider) {
        case StorageProviderType.GITHUB:
          return fetchGithubBranches(context);
        case StorageProviderType.BITBUCKET:
          return fetchBitbucketBranches(context);
        case StorageProviderType.GITLAB:
          return fetchGitLabBranches(context);
        case StorageProviderType.ADO:
          return fetchADOBranches(context);
        default:
          return null;
      }
    },
    [fetchGithubBranches, fetchGitLabBranches, fetchBitbucketBranches, fetchADOBranches],
  );

  const deleteProvider = useCallback((provider) => {
    AsyncMessageChannel.ReactInstance.message({
      type: AsyncMessageTypes.REMOVE_SINGLE_CREDENTIAL,
      context: provider,
    });
  }, []);

  const fetchTokensFromFileOrDirectory = useCallback(async (files: FileList | null) => {
    track('fetchTokensFromFileOrDirectory');
    dispatch.uiState.startJob({ name: BackgroundJobs.UI_FETCHTOKENSFROMFILE });

    let remoteData: RemoteTokenStorageData<unknown> | null = null;
    if (files) {
      remoteData = await readTokensFromFileOrDirectory(files);
      if (remoteData) {
        dispatch.tokenState.setTokenData({
          values: remoteData.tokens,
          themes: remoteData.themes,
        });
        track('Launched with token sets', {
          count: Object.keys(remoteData.tokens).length,
          setNames: Object.keys(remoteData.tokens),
        });
      }
    }

    dispatch.uiState.completeJob(BackgroundJobs.UI_FETCHTOKENSFROMFILE);
    return remoteData;
  }, [
    dispatch,
    readTokensFromFileOrDirectory,
  ]);

  return useMemo(() => ({
    restoreStoredProvider,
    deleteProvider,
    pullTokens,
    pushTokens,
    addNewProviderItem,
    fetchBranches,
    addNewBranch,
    fetchTokensFromFileOrDirectory,
  }), [
    restoreStoredProvider,
    deleteProvider,
    pullTokens,
    pushTokens,
    addNewProviderItem,
    fetchBranches,
    addNewBranch,
    fetchTokensFromFileOrDirectory,
  ]);
}

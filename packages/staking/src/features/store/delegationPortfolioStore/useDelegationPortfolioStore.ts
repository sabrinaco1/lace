import { Wallet } from '@lace/cardano';
import { BrowsePoolsView, getPoolInfos } from 'features/BrowsePools';
import { DEFAULT_BROWSE_POOLS_VIEW, DEFAULT_SORT_OPTIONS } from 'features/BrowsePools/constants';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { CARDANO_COIN_SYMBOL_BY_NETWORK, LAST_STABLE_EPOCH, PERCENTAGE_SCALE_MAX } from './constants';
import { makeMapOfSavedPercentages } from './makeMapOfSavedPercentages';
import { mapStakePoolToDisplayData } from './mapStakePoolToDisplayData';
import {
  Command,
  CurrentPortfolioStakePool,
  DelegationFlow,
  ExecuteCommand,
  Handler,
  processExpandedViewCases,
  processPopupViewCases,
  sanitizePercentages,
} from './stateMachine';
import { atomicStateMutators } from './stateMachine/atomicStateMutators';
import { DelegationPortfolioState, DelegationPortfolioStore } from './types';

const defaultState: DelegationPortfolioState = {
  activeDelegationFlow: DelegationFlow.Overview,
  activeDrawerStep: undefined,
  browsePoolsView: DEFAULT_BROWSE_POOLS_VIEW,
  cardanoCoinSymbol: 'ADA',
  currentPortfolio: [],
  draftPortfolio: undefined,
  hydrated: false,
  pendingSelectedPortfolio: undefined,
  selectedPortfolio: [],
  sortField: DEFAULT_SORT_OPTIONS.field,
  sortOrder: DEFAULT_SORT_OPTIONS.order,
  txError: undefined,
  view: undefined,
  viewedStakePool: undefined,
};

export const useDelegationPortfolioStore = create(
  immer<DelegationPortfolioStore>((set, get) => ({
    ...defaultState,
    mutators: {
      executeCommand: (command) => {
        let numberOfRecursiveCalls = 0;
        const callsConsideredAnInfiniteLoop = 10;
        let paramsStack: Command[] = [command];

        const { view } = get();
        // eslint-disable-next-line unicorn/consistent-function-scoping
        let processCommand: Handler = () => {
          throw new Error('DelegationPortfolioStore: view not set');
        };
        if (view === 'popup') {
          processCommand = processPopupViewCases;
        }
        if (view === 'expanded') {
          processCommand = processExpandedViewCases;
        }

        set((state) => {
          // TODO: decide whether to throw this function away
          //  as we may not want to execute command from inside the SM
          const executeCommand: ExecuteCommand = (childCommand) => {
            paramsStack = [...paramsStack, childCommand];
            numberOfRecursiveCalls += 1;
            if (numberOfRecursiveCalls > callsConsideredAnInfiniteLoop) {
              const error = new Error('DelegationPortfolioStore: Infinite loop detected');
              throw Object.assign(error, { paramsStack });
            }
            // eslint-disable-next-line sonarjs/no-extra-arguments
            return processCommand({
              command: childCommand,
              executeCommand,
              state,
            });
          };

          // eslint-disable-next-line sonarjs/no-extra-arguments
          return processCommand({ command, executeCommand, state });
        });
      },
      forceAbortFlows: () =>
        set((state) => {
          const viewingOverviewPage = [
            DelegationFlow.Overview,
            DelegationFlow.CurrentPoolDetails,
            DelegationFlow.PortfolioManagement,
          ].includes(state.activeDelegationFlow);
          state.activeDelegationFlow = viewingOverviewPage ? DelegationFlow.Overview : DelegationFlow.BrowsePools;
          state.activeDrawerStep = undefined;
          state.selectedPortfolio = [];
          state.pendingSelectedPortfolio = undefined;
          state.viewedStakePool = undefined;
          state.hydrated = false;
        }),
      hydrate: ({
        poolIds,
        stakePoolProvider,
        view,
        poolsView,
      }: {
        poolIds: Wallet.Cardano.PoolId[];
        stakePoolProvider: Wallet.StakePoolProvider;
        view: 'popup' | 'expanded';
        poolsView: BrowsePoolsView;
      }) => {
        if (poolIds.length === 0) {
          set((state) => {
            state.browsePoolsView = poolsView;
            state.hydrated = true;
            state.view = view;
          });

          return;
        }

        const setPools = (selectedStakePools: Wallet.Cardano.StakePool[]) => {
          set((state) => {
            Object.assign(state, {
              ...atomicStateMutators.selectPools({ stakePools: selectedStakePools, state }),
              browsePoolsView: poolsView,
              hydrated: true,
              view,
            } as DelegationPortfolioStore);
          });
        };

        getPoolInfos({
          poolIds,
          preserveOrder: true,
          stakePoolProvider,
          status: [
            Wallet.Cardano.StakePoolStatus.Activating,
            Wallet.Cardano.StakePoolStatus.Active,
            Wallet.Cardano.StakePoolStatus.Retiring,
          ],
        })
          .then(setPools)
          .catch(() => setPools([]));
      },
      setCardanoCoinSymbol: (currentChain) =>
        set((state) => {
          state.cardanoCoinSymbol = CARDANO_COIN_SYMBOL_BY_NETWORK[currentChain.networkId];
        }),
      setCurrentPortfolio: async ({
        currentEpoch,
        delegationDistribution,
        delegationRewardsHistory,
        delegationPortfolio,
      }) => {
        const lastNonVolatileEpoch = currentEpoch.epochNo.valueOf() - LAST_STABLE_EPOCH;
        const confirmedRewardHistory = delegationRewardsHistory.all.filter(
          ({ epoch }) => epoch.valueOf() <= lastNonVolatileEpoch
        );

        const mapOfPoolIdsToSavedPercentages = makeMapOfSavedPercentages(delegationPortfolio?.pools);

        let currentPortfolio = delegationDistribution.map<CurrentPortfolioStakePool>(
          ({ pool: stakePool, percentage, stake }) => {
            const confirmedPoolRewards = confirmedRewardHistory
              .filter(({ poolId }) => poolId === stakePool.id)
              .map(({ rewards }) => rewards);

            return {
              displayData: {
                ...mapStakePoolToDisplayData({ stakePool }),
                lastReward: confirmedPoolRewards[confirmedPoolRewards.length - 1] || BigInt(0),
                totalRewards: Wallet.BigIntMath.sum(confirmedPoolRewards),
              },
              id: stakePool.hexId,
              onChainPercentage: percentage * PERCENTAGE_SCALE_MAX,
              savedIntegerPercentage: mapOfPoolIdsToSavedPercentages[stakePool.hexId] || null,
              stakePool,
              value: stake,
            };
          }
        );

        currentPortfolio = sanitizePercentages({
          decimals: 2,
          items: currentPortfolio,
          key: 'onChainPercentage',
        });

        set((state) => {
          state.currentPortfolio = currentPortfolio;
        });
      },
      setView: (view) =>
        set((state) => {
          state.view = view;
        }),
    },
  }))
);

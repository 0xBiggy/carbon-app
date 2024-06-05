import { FormEvent, useState } from 'react';
import { useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import { useEditStrategyCtx } from 'components/strategies/edit/EditStrategyContext';
import { EditStrategyOverlapTokens } from 'components/strategies/edit/EditStrategyOverlapTokens';
import { EditStrategyLayout } from 'components/strategies/edit/NewEditStrategyLayout';
import { cn, roundSearchParam } from 'utils/helpers';
import { Button } from 'components/common/button';
import {
  getStatusTextByTxStatus,
  isValidRange,
} from 'components/strategies/utils';
import { handleTxStatusAndRedirectToOverview } from 'components/strategies/create/utils';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKey, Strategy, useUpdateStrategyQuery } from 'libs/queries';
import { useNotifications } from 'hooks/useNotifications';
import { m } from 'libs/motion';
import { useWeb3 } from 'libs/web3';
import { carbonEvents } from 'services/events';
import { useStrategyEvent } from 'components/strategies/create/useStrategyEventData';
import {
  calculateOverlappingBuyBudget,
  calculateOverlappingPrices,
  calculateOverlappingSellBudget,
} from '@bancor/carbon-sdk/strategy-management';
import { EditPriceNav } from 'components/strategies/edit/EditPriceNav';
import { useMarketPrice } from 'hooks/useMarketPrice';
import {
  getRoundedSpread,
  isMaxBelowMarket,
  isMinAboveMarket,
  isValidSpread,
} from 'components/strategies/overlapping/utils';
import { EditPriceOverlappingStrategy } from 'components/strategies/edit/NewEditPriceOverlappingStrategy';
import { items } from 'components/strategies/common/variants';
import { OverlappingInitMarketPriceField } from 'components/strategies/overlapping/OverlappingMarketPrice';
import style from 'components/strategies/common/form.module.css';
import { SafeDecimal } from 'libs/safedecimal';
import { geoMean } from 'utils/fullOutcome';
import { isZero } from 'components/strategies/common/utils';

export interface EditOverlappingStrategySearch {
  marketPrice?: string;
  min: string;
  max: string;
  spread: string;
  anchor?: 'buy' | 'sell';
  budget?: string;
  action?: 'deposit' | 'withdraw';
}

/** Create the orders out of the search params */
const getOrders = (
  strategy: Strategy,
  search: EditOverlappingStrategySearch,
  userMarketPrice?: string
) => {
  const { base, quote, order0, order1 } = strategy;
  const touched =
    search.min !== roundSearchParam(order0.startRate) ||
    search.max !== roundSearchParam(order1.endRate) ||
    search.spread !== getRoundedSpread(strategy).toString();

  if (!userMarketPrice) {
    return {
      buy: { min: '', max: '', marginalPrice: '', budget: '' },
      sell: { min: '', max: '', marginalPrice: '', budget: '' },
    };
  }

  const calculatedPrice = geoMean(order0.marginalRate, order1.marginalRate);
  const marketPrice = touched
    ? calculatedPrice?.toString() || userMarketPrice
    : userMarketPrice;

  const { anchor, min, max, spread, budget = '0', action = 'deposit' } = search;
  if (!isValidRange(min, max) || !isValidSpread(spread)) {
    return {
      buy: { min, max: min, marginalPrice: min, budget: '' },
      sell: { min, max: min, marginalPrice: min, budget: '' },
    };
  }
  const prices = calculateOverlappingPrices(min, max, marketPrice, spread);
  const orders = {
    buy: {
      min: prices.buyPriceLow,
      max: prices.buyPriceHigh,
      marginalPrice: prices.buyPriceMarginal,
      budget: order0.balance,
    },
    sell: {
      min: prices.sellPriceLow,
      max: prices.sellPriceHigh,
      marginalPrice: prices.sellPriceMarginal,
      budget: order1.balance,
    },
  };

  if (!anchor || isZero(budget)) return orders;

  if (anchor === 'buy') {
    if (isMinAboveMarket(orders.buy)) return orders;
    const buyBudget =
      action === 'withdraw'
        ? new SafeDecimal(order0.balance).sub(budget).toString()
        : new SafeDecimal(order0.balance).add(budget).toString();
    orders.buy.budget = buyBudget;
    orders.sell.budget = calculateOverlappingSellBudget(
      base.decimals,
      quote.decimals,
      min,
      max,
      marketPrice,
      spread,
      buyBudget
    );
  } else {
    if (isMaxBelowMarket(orders.sell)) return orders;
    const sellBudget =
      action === 'withdraw'
        ? new SafeDecimal(order1.balance).sub(budget).toString()
        : new SafeDecimal(order1.balance).add(budget).toString();
    orders.sell.budget = sellBudget;
    orders.buy.budget = calculateOverlappingBuyBudget(
      base.decimals,
      quote.decimals,
      min,
      max,
      marketPrice,
      spread,
      sellBudget
    );
  }
  return orders;
};

const url = '/strategies/edit/$strategyId/overlapping/prices';

export const EditStrategyOverlappingPage = () => {
  const { strategy } = useEditStrategyCtx();
  const { base, quote } = strategy;
  const { history } = useRouter();
  const { dispatchNotification } = useNotifications();
  const navigate = useNavigate({ from: url });
  const search = useSearch({ from: url });
  const { user } = useWeb3();
  const externalPrice = useMarketPrice({ base, quote });
  const marketPrice = search.marketPrice ?? externalPrice?.toString();

  // TODO: support also renew
  const type = 'editPrices';

  const [isProcessing, setIsProcessing] = useState(false);
  const updateMutation = useUpdateStrategyQuery();
  const cache = useQueryClient();

  const isAwaiting = updateMutation.isLoading;
  const isLoading = isAwaiting || isProcessing;
  const loadingChildren = getStatusTextByTxStatus(isAwaiting, isProcessing);

  const orders = getOrders(strategy, search, marketPrice);

  // TODO: move useStrategyEvent to common
  const strategyEventData = useStrategyEvent(
    'recurring',
    base,
    quote,
    orders.buy,
    orders.sell
  );

  const hasChanged = (() => {
    const { order0, order1 } = strategy;
    if (search.min !== roundSearchParam(order0.startRate)) return true;
    if (search.max !== roundSearchParam(order1.endRate)) return true;
    if (search.spread !== getRoundedSpread(strategy).toString()) return true;
    if (search.budget) return true;
    return false;
  })();

  const isDisabled = (form: HTMLFormElement) => {
    if (!form.checkValidity()) return true;
    if (!!form.querySelector('.error-message')) return true;
    const warnings = form.querySelector('.warning-message');
    if (!warnings) return false;
    return !form.querySelector<HTMLInputElement>('#approve-warnings')?.checked;
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isDisabled(e.currentTarget)) return;
    updateMutation.mutate(
      {
        id: strategy.id,
        encoded: strategy.encoded,
        fieldsToUpdate: {
          buyPriceLow: orders.buy.min,
          buyPriceHigh: orders.buy.max,
          sellPriceLow: orders.sell.min,
          sellPriceHigh: orders.sell.max,
        },
        buyMarginalPrice: orders.buy.marginalPrice,
        sellMarginalPrice: orders.sell.marginalPrice,
      },
      {
        onSuccess: async (tx) => {
          handleTxStatusAndRedirectToOverview(setIsProcessing, navigate);
          const notif =
            type === 'editPrices' ? 'changeRatesStrategy' : 'renewStrategy';
          dispatchNotification(notif, { txHash: tx.hash });
          if (!tx) return;
          console.log('tx hash', tx.hash);
          await tx.wait();
          cache.invalidateQueries({
            queryKey: QueryKey.strategies(user),
          });
          carbonEvents.strategyEdit.strategyEditPrices({
            ...strategyEventData,
            strategyId: strategy.id,
          });
          console.log('tx confirmed');
        },
        onError: (e) => {
          setIsProcessing(false);
          console.error('update mutation failed', e);
        },
      }
    );
  };

  if (!marketPrice) {
    const setMarketPrice = (price: number) => {
      navigate({
        params: (params) => params,
        search: (previous) => ({ ...previous, marketPrice: price.toString() }),
        replace: true,
        resetScroll: false,
      });
    };
    return (
      <EditStrategyLayout type="editPrices">
        <div className="flex flex-col gap-20">
          <EditPriceNav />
          <EditStrategyOverlapTokens strategy={strategy} />
          <m.article
            variants={items}
            key="marketPrice"
            className="rounded-10 bg-background-900 flex flex-col md:w-[440px]"
          >
            <OverlappingInitMarketPriceField
              base={base}
              quote={quote}
              marketPrice={+(marketPrice || '')}
              setMarketPrice={setMarketPrice}
            />
          </m.article>
        </div>
      </EditStrategyLayout>
    );
  }

  return (
    <EditStrategyLayout type="editPrices">
      <form
        onSubmit={submit}
        onReset={() => history.back()}
        className={cn('flex w-full flex-col gap-20 md:w-[440px]', style.form)}
        data-testid="edit-form"
      >
        <EditPriceNav />
        <EditStrategyOverlapTokens strategy={strategy} />

        <EditPriceOverlappingStrategy
          marketPrice={marketPrice}
          order0={orders.buy}
          order1={orders.sell}
        />
        <label
          htmlFor="approve-warnings"
          className={cn(
            style.approveWarnings,
            'rounded-10 bg-background-900 text-14 font-weight-500 flex items-center gap-8 p-20 text-white/60'
          )}
        >
          <input
            id="approve-warnings"
            type="checkbox"
            name="approval"
            data-testid="approve-warnings"
          />
          I've approved the edits and distribution changes.
        </label>

        <Button
          type="submit"
          disabled={!hasChanged}
          loading={isLoading}
          loadingChildren={loadingChildren}
          variant="white"
          size="lg"
          fullWidth
          data-testid="edit-submit"
        >
          {type === 'editPrices' ? 'Confirm Changes' : 'Renew Strategy'}
        </Button>
        <Button
          type="reset"
          disabled={isLoading}
          variant="secondary"
          size="lg"
          fullWidth
        >
          Cancel
        </Button>
      </form>
    </EditStrategyLayout>
  );
};

import { FC, useCallback, useEffect, useState } from 'react';
import { useGetTokenBalance } from 'libs/queries';
import {
  getMaxBuyMin,
  getMinSellMax,
  hasArbOpportunity,
  isMaxBelowMarket,
  isMinAboveMarket,
} from 'components/strategies/overlapping/utils';
import { Tooltip } from 'components/common/tooltip/Tooltip';
import { OverlappingStrategyGraph } from 'components/strategies/overlapping/OverlappingStrategyGraph';
import { OverlappingSpread } from 'components/strategies/overlapping/OverlappingSpread';
import { calculateOverlappingPrices } from '@bancor/carbon-sdk/strategy-management';
import { SafeDecimal } from 'libs/safedecimal';
import {
  OverlappingBudgetDescription,
  OverlappingBudgetDistribution,
} from 'components/strategies/overlapping/OverlappingBudgetDistribution';
import { OverlappingAnchor } from 'components/strategies/overlapping/OverlappingAnchor';
import { getDeposit, getWithdraw } from './utils';
import { OverlappingAction } from 'components/strategies/overlapping/OverlappingAction';
import { hasNoBudget } from 'components/strategies/overlapping/useOverlappingMarketPrice';
import { OverlappingMarketPrice } from 'components/strategies/overlapping/OverlappingMarketPrice';
import { UserMarketPrice } from 'components/strategies/UserMarketPrice';
import { WarningMessageWithIcon } from 'components/common/WarningMessageWithIcon';
import { formatNumber } from 'utils/helpers';
import { BaseOrder } from '../common/types';
import { useEditStrategyCtx } from './EditStrategyContext';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { EditOverlappingStrategySearch } from 'pages/strategies/edit/overlapping/prices';
import { InputRange } from '../create/Order/InputRange';
import { m } from 'libs/motion';
import { items } from '../common/variants';

interface Props {
  marketPrice: string;
  order0: BaseOrder;
  order1: BaseOrder;
}

// When working with edit overlapping we can't trust marginal price when budget was 0, so we need to recalculate
export function isEditAboveMarket(
  min: string,
  max: string,
  marketPrice: number | undefined,
  spread: number
) {
  if (!marketPrice) return false;
  const prices = calculateOverlappingPrices(
    formatNumber(min || '0'),
    formatNumber(max || '0'),
    marketPrice.toString(),
    spread.toString()
  );
  return isMinAboveMarket({
    min: prices.buyPriceLow,
    marginalPrice: prices.buyPriceMarginal,
  });
}
export function isEditBelowMarket(
  min: string,
  max: string,
  marketPrice: number | undefined,
  spread: number
) {
  if (!marketPrice) return false;
  const prices = calculateOverlappingPrices(
    formatNumber(min || '0'),
    formatNumber(max || '0'),
    marketPrice.toString(),
    spread.toString()
  );
  return isMaxBelowMarket({
    max: prices.sellPriceHigh,
    marginalPrice: prices.sellPriceMarginal,
  });
}

type Search = EditOverlappingStrategySearch;

const url = '/strategies/edit/$strategyId/overlapping/prices';
export const EditPriceOverlappingStrategy: FC<Props> = (props) => {
  const { marketPrice, order0, order1 } = props;
  const { strategy } = useEditStrategyCtx();
  const { base, quote } = strategy;

  const { spread, action, anchor, budget } = useSearch({ from: url });
  const navigate = useNavigate({ from: url });

  const baseBalance = useGetTokenBalance(base).data;
  const quoteBalance = useGetTokenBalance(quote).data;
  const [touched, setTouched] = useState(false);

  const initialBuyBudget = strategy.order0.balance;
  const initialSellBudget = strategy.order1.balance;
  const depositBuyBudget = getDeposit(initialBuyBudget, order0.budget);
  const withdrawBuyBudget = getWithdraw(initialBuyBudget, order0.budget);
  const depositSellBudget = getDeposit(initialSellBudget, order1.budget);
  const withdrawSellBudget = getWithdraw(initialSellBudget, order1.budget);

  const set = useCallback(
    <T extends keyof Search>(key: T, value: Search[T]) => {
      navigate({
        params: (params) => params,
        search: (previous) => ({ ...previous, [key]: value }),
        replace: true,
        resetScroll: false,
      });
    },
    [navigate]
  );

  const aboveMarket = isMinAboveMarket(order0);
  const belowMarket = isMaxBelowMarket(order1);

  // ERROR
  const anchorError = (() => {
    if (touched && !anchor) return 'Please select a token to proceed';
  })();

  const budgetError = (() => {
    const value = anchor === 'buy' ? order0.budget : order1.budget;
    const budget = new SafeDecimal(value);
    if (action === 'deposit' && anchor === 'buy' && quoteBalance) {
      const delta = budget.sub(initialBuyBudget);
      if (delta.gt(quoteBalance)) return 'Insufficient balance';
    }
    if (action === 'deposit' && anchor === 'sell' && baseBalance) {
      const delta = budget.sub(initialSellBudget);
      if (delta.gt(baseBalance)) return 'Insufficient balance';
    }
    if (action === 'withdraw' && anchor === 'buy' && quoteBalance) {
      if (budget.lt(0)) return 'Insufficient funds';
    }
    if (action === 'withdraw' && anchor === 'sell' && baseBalance) {
      if (budget.lt(0)) return 'Insufficient funds';
    }
    return '';
  })();

  // WARNING
  const priceWarning = (() => {
    if (!aboveMarket && !belowMarket) return;
    return 'Notice: your strategy is “out of the money” and will be traded when the market price moves into your price range.';
  })();

  useEffect(() => {
    if (anchor === 'buy' && aboveMarket) set('anchor', undefined);
    if (anchor === 'sell' && belowMarket) set('anchor', undefined);
  }, [anchor, aboveMarket, belowMarket, set]);

  const budgetWarning = (() => {
    if (action !== 'deposit') return;
    if (hasArbOpportunity(order0.marginalPrice, spread, marketPrice)) {
      const buyBudgetChanged = strategy.order0.balance !== order0.budget;
      const sellBudgetChanged = strategy.order1.balance !== order1.budget;
      if (!buyBudgetChanged && !sellBudgetChanged) return;
      return 'Please note that the deposit might create an arb opportunity.';
    }
  })();

  useEffect(() => {
    if (anchor === 'buy' && aboveMarket) set('anchor', undefined);
    if (anchor === 'sell' && belowMarket) set('anchor', undefined);
  }, [anchor, aboveMarket, belowMarket, set]);

  const setMarketPrice = (price: number) => {
    setTouched(true);
    set('marketPrice', price.toString());
  };

  const setMin = (min: string) => {
    setTouched(true);
    set('min', min);
  };

  const setMax = (max: string) => {
    setTouched(true);
    set('max', max);
  };

  const setSpread = (value: number) => {
    setTouched(true);
    set('spread', value.toString());
  };

  const setAnchor = (value: 'buy' | 'sell') => {
    set('budget', undefined);
    set('anchor', value);
    if (!action) set('action', 'deposit');
  };

  const setAction = (value: 'deposit' | 'withdraw') => {
    set('action', value);
  };

  const setBudget = async (value: string) => {
    set('budget', value);
  };

  // Update on buyMin changes
  useEffect(() => {
    if (!order0.min) return;
    const timeout = setTimeout(async () => {
      const minSellMax = getMinSellMax(Number(order0.min), Number(spread));
      if (Number(order1.max) < minSellMax) set('max', minSellMax.toString());
    }, 1000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order0.min]);

  // Update on sellMax changes
  useEffect(() => {
    if (!order1.max) return;
    const timeout = setTimeout(async () => {
      const maxBuyMin = getMaxBuyMin(Number(order1.max), Number(spread));
      if (Number(order0.min) > maxBuyMin) set('min', maxBuyMin.toString());
    }, 1000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order1.max]);

  return (
    <UserMarketPrice marketPrice={+marketPrice}>
      <m.article
        variants={items}
        className="rounded-10 bg-background-900 flex w-full flex-col gap-16 p-20"
      >
        <header className="flex items-center gap-8">
          <h2 className="text-18 font-weight-500 flex-1">Price Range</h2>
          <OverlappingMarketPrice
            base={base}
            quote={quote}
            marketPrice={+marketPrice}
            setMarketPrice={setMarketPrice}
          />
        </header>
        <OverlappingStrategyGraph
          base={base}
          quote={quote}
          order0={order0}
          order1={order1}
          marketPrice={+marketPrice}
          spread={+spread}
          setMin={setMin}
          setMax={setMax}
        />
        {hasNoBudget(strategy) && (
          <WarningMessageWithIcon>
            Since the strategy had no budget, it will use the current market
            price to readjust the budget distribution around.
          </WarningMessageWithIcon>
        )}
      </m.article>
      <m.article
        variants={items}
        className="rounded-10 bg-background-900 flex w-full flex-col gap-16 p-20"
      >
        <header className="flex items-center gap-8">
          <h2 className="text-18 font-weight-500 flex-1">
            Edit Price Range&nbsp;
            <span className="text-white/40">
              ({quote?.symbol} per 1 {base?.symbol})
            </span>
          </h2>
          <Tooltip
            element="Indicate the strategy exact buy and sell prices."
            iconClassName="h-14 w-14 text-white/60"
          />
        </header>
        <InputRange
          base={base}
          quote={quote}
          min={order0.min}
          max={order1.max}
          setMin={setMin}
          setMax={setMax}
          minLabel="Min Buy Price"
          maxLabel="Max Sell Price"
          warnings={[priceWarning]}
          isOverlapping
        />
      </m.article>
      <m.article
        variants={items}
        className="rounded-10 bg-background-900 flex w-full flex-col gap-10 p-20"
      >
        <header className="mb-10 flex items-center gap-8 ">
          <h2 className="text-18 font-weight-500 flex-1">Edit Spread</h2>
          <Tooltip
            element="The difference between the highest bidding (Sell) price, and the lowest asking (Buy) price"
            iconClassName="h-14 w-14 text-white/60"
          />
        </header>
        <OverlappingSpread
          buyMin={Number(order0.min)}
          sellMax={Number(order1.max)}
          defaultValue={0.05}
          options={[0.01, 0.05, 0.1]}
          spread={+spread}
          setSpread={setSpread}
        />
      </m.article>
      <OverlappingAnchor
        base={base}
        quote={quote}
        anchor={anchor}
        setAnchor={setAnchor}
        anchorError={anchorError}
        disableBuy={aboveMarket}
        disableSell={belowMarket}
      />
      {anchor && (
        <OverlappingAction
          base={base}
          quote={quote}
          anchor={anchor}
          action={action}
          setAction={setAction}
          budgetValue={budget ?? ''}
          setBudget={setBudget}
          resetBudgets={() => setBudget('')}
          buyBudget={initialBuyBudget}
          sellBudget={initialSellBudget}
          error={budgetError}
          warning={budgetWarning}
        />
      )}
      {anchor && (
        <m.article
          id="overlapping-distribution"
          className="rounded-10 bg-background-900 flex w-full flex-col gap-16 p-20"
        >
          <hgroup>
            <h3 className="text-16 font-weight-500 flex items-center gap-8">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-[10px] text-white/60">
                3
              </span>
              Distribution
            </h3>
            <p className="text-14 text-white/80">
              Following the above {action} amount, these are the changes in
              budget allocation
            </p>
          </hgroup>
          <OverlappingBudgetDistribution
            token={base}
            initialBudget={initialSellBudget}
            withdraw={budgetError ? '0' : withdrawSellBudget}
            deposit={budgetError ? '0' : depositSellBudget}
            balance={baseBalance ?? '0'}
          />
          <OverlappingBudgetDescription
            token={base}
            initialBudget={initialSellBudget}
            withdraw={budgetError ? '0' : withdrawSellBudget}
            deposit={budgetError ? '0' : depositSellBudget}
            balance={baseBalance ?? '0'}
          />
          <OverlappingBudgetDistribution
            token={quote}
            initialBudget={initialBuyBudget}
            withdraw={budgetError ? '0' : withdrawBuyBudget}
            deposit={budgetError ? '0' : depositBuyBudget}
            balance={quoteBalance ?? '0'}
            buy
          />
          <OverlappingBudgetDescription
            token={quote}
            initialBudget={initialBuyBudget}
            withdraw={budgetError ? '0' : withdrawBuyBudget}
            deposit={budgetError ? '0' : depositBuyBudget}
            balance={quoteBalance ?? '0'}
          />
        </m.article>
      )}
    </UserMarketPrice>
  );
};

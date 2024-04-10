import {
  SimulatorInputOverlappingValues,
  SimulatorOverlappingInputDispatch,
} from 'hooks/useSimulatorOverlappingInput';

import { FC, useCallback, useEffect, useState } from 'react';
import { useMarketIndication } from 'components/strategies/marketPriceIndication';
import { ReactComponent as IconLink } from 'assets/icons/link.svg';
import { Tooltip } from 'components/common/tooltip/Tooltip';
import { CreateOverlappingStrategyBudget } from './CreateOverlappingStrategyBudget';
import { OverlappingStrategySpread } from 'components/strategies/overlapping/OverlappingStrategySpread';
import { CreateOverlappingRange } from './CreateOverlappingRange';
import {
  isMaxBelowMarket,
  isMinAboveMarket,
  isValidSpread,
} from 'components/strategies/overlapping/utils';
import { isValidRange } from 'components/strategies/utils';
import { SafeDecimal } from 'libs/safedecimal';
import {
  calculateOverlappingBuyBudget,
  calculateOverlappingPrices,
  calculateOverlappingSellBudget,
} from '@bancor/carbon-sdk/strategy-management';

export interface OverlappingStrategyProps {
  state: SimulatorInputOverlappingValues;
  dispatch: SimulatorOverlappingInputDispatch;
  spread: number;
  setSpread: (value: number) => void;
  marketPrice: number;
}

const getInitialPrices = (marketPrice: string | number) => {
  const currentPrice = new SafeDecimal(marketPrice);
  return {
    min: currentPrice.times(0.9).toString(),
    max: currentPrice.times(1.1).toString(),
  };
};

export const CreateOverlappingStrategy: FC<OverlappingStrategyProps> = (
  props
) => {
  const { state, dispatch, spread, setSpread, marketPrice } = props;
  const { baseToken: base, quoteToken: quote } = state;
  const [anchoredOrder, setAnchoredOrder] = useState<'buy' | 'sell'>('buy');
  const { marketPricePercentage } = useMarketIndication({
    base,
    quote,
    order: {
      min: state.buy.min,
      max: state.sell.max,
      price: '',
      isRange: true,
    },
    buy: true,
  });

  const setBuyBudget = (
    sellBudget: string,
    buyMin: string,
    sellMax: string
  ) => {
    if (!base || !quote) return;
    if (!sellBudget) return dispatch('buyBudget', '');
    try {
      const buyBudget = calculateOverlappingBuyBudget(
        base.decimals,
        quote.decimals,
        buyMin,
        sellMax,
        marketPrice.toString(),
        spread.toString(),
        sellBudget
      );
      dispatch('buyBudget', buyBudget);
    } catch (err) {
      console.error(err);
      dispatch('buyBudget', '');
    }
  };

  const setSellBudget = (
    buyBudget: string,
    buyMin: string,
    sellMax: string
  ) => {
    if (!base || !quote) return;
    if (!buyBudget) return dispatch('sellBudget', '');
    try {
      const sellBudget = calculateOverlappingSellBudget(
        base.decimals,
        quote.decimals,
        buyMin,
        sellMax,
        marketPrice.toString(),
        spread.toString(),
        buyBudget
      );
      dispatch('sellBudget', sellBudget);
    } catch (err) {
      console.error(err);
      dispatch('sellBudget', '');
    }
  };

  const setOverlappingParams = (min: string, max: string) => {
    // Set min & max.
    dispatch('buyMin', min);
    dispatch('sellMax', max);

    // If invalid range, wait for timeout to reset range
    if (!isValidRange(min, max) || !isValidSpread(spread)) return;
    const prices = calculateOverlappingPrices(
      min,
      max,
      marketPrice.toString(),
      spread.toString()
    );

    // Set prices
    dispatch('buyMax', prices.buyPriceHigh);
    // TODO reenable this for create strategy
    // order0.setMarginalPrice(prices.buyPriceMarginal);

    dispatch('sellMin', prices.sellPriceLow);
    // TODO reenable this for create strategy
    // order1.setMarginalPrice(prices.sellPriceMarginal);

    // Set budgets
    const buyOrder = { min, marginalPrice: prices.buyPriceMarginal };
    const sellOrder = { max, marginalPrice: prices.sellPriceMarginal };
    if (isMinAboveMarket(buyOrder)) {
      setAnchoredOrder('sell');
      setBuyBudget(state.sell.budget, min, max);
    } else if (isMaxBelowMarket(sellOrder)) {
      setAnchoredOrder('buy');
      setSellBudget(state.buy.budget, min, max);
    } else {
      if (anchoredOrder === 'buy') setSellBudget(state.buy.budget, min, max);
      if (anchoredOrder === 'sell') setBuyBudget(state.sell.budget, min, max);
    }
  };

  const setMin = (min: string) => {
    if (!state.sell.max) return dispatch('buyMin', min);
    setOverlappingParams(min, state.sell.max);
  };

  const setMax = (max: string) => {
    if (!state.buy.min) return dispatch('sellMax', max);
    setOverlappingParams(state.buy.min, max);
  };

  useEffect(() => {
    const min = state.buy.min;
    const max = state.sell.max;

    if (!min || !max || !spread || !marketPrice) return;

    const prices = calculateOverlappingPrices(
      min,
      max,
      marketPrice.toString(),
      spread.toString()
    );

    // Set budgets
    const buyOrder = { min, marginalPrice: prices.buyPriceMarginal };
    const sellOrder = { max, marginalPrice: prices.sellPriceMarginal };
    if (isMinAboveMarket(buyOrder)) {
      setAnchoredOrder('sell');
      setBuyBudget(state.sell.budget, min, max);
    } else if (isMaxBelowMarket(sellOrder)) {
      setAnchoredOrder('buy');
      setSellBudget(state.buy.budget, min, max);
    } else {
      if (anchoredOrder === 'buy') setSellBudget(state.buy.budget, min, max);
      if (anchoredOrder === 'sell') setBuyBudget(state.sell.budget, min, max);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.buy.min, state.sell.max, marketPrice, spread]);

  // // Update on buyMin changes
  // useEffect(() => {
  //   if (!state.buy.min) return;
  //
  //   // automatically update max if min > max
  //   const timeout = setTimeout(async () => {
  //     const minSellMax = getMinSellMax(Number(state.buy.min), spread);
  //     if (Number(state.sell.max) < minSellMax) {
  //       setMax(minSellMax.toString());
  //     }
  //   }, 1000);
  //   return () => clearTimeout(timeout);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [state.buy.min]);
  //
  // // Update on sellMax changes
  // useEffect(() => {
  //   if (!state.sell.max) return;
  //
  //   // automatically update min if min > max
  //   const timeout = setTimeout(async () => {
  //     const maxBuyMin = getMaxBuyMin(Number(state.sell.max), spread);
  //     if (Number(state.buy.min) > maxBuyMin) {
  //       setMin(maxBuyMin.toString());
  //     }
  //   }, 1000);
  //   return () => clearTimeout(timeout);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [state.sell.max]);

  // Initialize order when market price is available
  useEffect(() => {
    if (marketPrice <= 0 || !quote || !base) return;
    if (!state.buy.min && !state.sell.max) {
      requestAnimationFrame(() => {
        if (state.buy.min || state.sell.max) return;
        const { min, max } = getInitialPrices(marketPrice);
        setOverlappingParams(min, max);
      });
    } else {
      setOverlappingParams(state.buy.min, state.sell.max);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketPrice, spread]);

  const setErrorCb = useCallback(
    (value: string) => dispatch('buyPriceError', value),
    [dispatch]
  );

  return (
    <>
      <article className="grid grid-flow-col grid-cols-[auto_auto] grid-rows-2 gap-8 rounded-10 bg-background-900 p-20">
        <h4 className="flex items-center gap-8 text-14 font-weight-500">
          Discover Overlapping Strategies
          <span className="rounded-8 bg-primary-dark px-8 py-4 text-10 text-primary">
            NEW
          </span>
        </h4>
        <p className="text-12 text-white/60">
          Learn more about the new type of strategy creation.
        </p>
        <a
          href="https://faq.carbondefi.xyz/what-is-an-overlapping-strategy"
          target="_blank"
          className="row-span-2 flex items-center gap-4 self-center justify-self-end text-12 font-weight-500 text-primary"
          rel="noreferrer"
        >
          Learn More
          <IconLink className="h-12 w-12" />
        </a>
      </article>
      {/*<article className="flex flex-col gap-20 rounded-10 bg-background-900 p-20">*/}
      {/*  <header className="flex items-center gap-8">*/}
      {/*    <h3 className="flex-1 text-18 font-weight-500">Price Range</h3>*/}
      {/*    <Tooltip*/}
      {/*      element="Drag and drop your strategy buy and sell prices."*/}
      {/*      iconClassName="h-14 w-14 text-white/60"*/}
      {/*    />*/}
      {/*  </header>*/}
      {/*  <OverlappingStrategyGraph*/}
      {/*    {...props}*/}
      {/*    order0={order0}*/}
      {/*    order1={order1}*/}
      {/*    marketPrice={marketPrice}*/}
      {/*    marketPricePercentage={marketPricePercentage}*/}
      {/*    setMin={setMin}*/}
      {/*    setMax={setMax}*/}
      {/*  />*/}
      {/*</article>*/}
      <article className="flex flex-col gap-20 rounded-10 bg-background-900 p-20">
        <header className="flex items-center gap-8">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/60">
            1
          </span>
          <h3 className="flex-1 text-18 font-weight-500">
            Set Price Range&nbsp;
            <span className="text-white/40">
              ({quote?.symbol} per 1 {base?.symbol})
            </span>
          </h3>
          <Tooltip
            element="Indicate the strategy exact buy and sell prices."
            iconClassName="h-14 w-14 text-white/60"
          />
        </header>
        {base && quote && (
          <CreateOverlappingRange
            base={base}
            quote={quote}
            min={state.buy.min}
            max={state.sell.max}
            error={state.buy.priceError}
            setError={setErrorCb}
            marketPricePercentage={marketPricePercentage}
            setMin={setMin}
            setMax={setMax}
          />
        )}
      </article>
      <article className="flex flex-col gap-10 rounded-10 bg-background-900 p-20">
        <header className="mb-10 flex items-center gap-8 ">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/60">
            2
          </span>
          <h3 className="flex-1 text-18 font-weight-500">Indicate Spread</h3>
          <Tooltip
            element="The difference between the highest bidding (Sell) price, and the lowest asking (Buy) price"
            iconClassName="h-14 w-14 text-white/60"
          />
        </header>
        <OverlappingStrategySpread
          buyMin={+state.buy.min}
          sellMax={+state.sell.max}
          defaultValue={0.05}
          options={[0.01, 0.05, 0.1]}
          spread={spread}
          setSpread={setSpread}
        />
      </article>
      <article className="flex flex-col gap-20 rounded-10 bg-background-900 p-20">
        <header className="flex items-center gap-8 ">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/60">
            3
          </span>
          <h3 className="flex-1 text-18 font-weight-500">Set Budgets</h3>
          <Tooltip
            element="Indicate the budget you would like to allocate to the strategy. Note that in order to maintain the overlapping behavior, the 2nd budget indication will be calculated using the prices, spread and budget values."
            iconClassName="h-14 w-14 text-white/60"
          />
        </header>
        <CreateOverlappingStrategyBudget
          {...props}
          marketPrice={marketPrice}
          anchoredOrder={anchoredOrder}
          setAnchoredOrder={setAnchoredOrder}
          setBuyBudget={setBuyBudget}
          setSellBudget={setSellBudget}
        />
      </article>
    </>
  );
};

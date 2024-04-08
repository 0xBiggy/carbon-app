import { calculateOverlappingPrices } from '@bancor/carbon-sdk/strategy-management';
import { OverlappingSmallBudget } from 'components/strategies/overlapping/OverlappingSmallBudget';
import {
  isMaxBelowMarket,
  isMinAboveMarket,
  isOverlappingBudgetTooSmall,
} from 'components/strategies/overlapping/utils';
import { FC, useId } from 'react';
import { Token } from 'libs/tokens';
import { ReactComponent as IconLink } from 'assets/icons/link.svg';
import { OverlappingStrategyProps } from './CreateOverlappingStrategy';

import { BudgetInput } from 'components/strategies/common/BudgetInput';
import { isValidRange } from 'components/strategies/utils';

interface Props extends OverlappingStrategyProps {
  marketPrice: number;
  anchoredOrder: 'buy' | 'sell';
  setAnchoredOrder: (value: 'buy' | 'sell') => any;
  setBuyBudget: (sellBudget: string, min: string, max: string) => any;
  setSellBudget: (buyBudget: string, min: string, max: string) => any;
}

export const CreateOverlappingStrategyBudget: FC<Props> = (props) => {
  const { state, dispatch, setAnchoredOrder, setBuyBudget, setSellBudget } =
    props;
  const { baseToken: base, quoteToken: quote, buy, sell } = state;
  const buyBudgetId = useId();
  const sellBudgetId = useId();

  if (!buy.min || !sell.max || !props.spread || !props.marketPrice)
    return <></>;

  const prices = calculateOverlappingPrices(
    buy.min,
    sell.max,
    props.marketPrice.toString(),
    props.spread.toString()
  );

  const buyOrder = {
    min: buy.min || '0',
    marginalPrice: prices.buyPriceMarginal || '0',
  };
  const sellOrder = {
    max: sell.max || '0',
    marginalPrice: prices.sellPriceMarginal || '0',
  };
  const minAboveMarket = isMinAboveMarket(buyOrder);
  const maxBelowMarket = isMaxBelowMarket(sellOrder);
  const validPrice = isValidRange(buy.min, sell.max);
  const budgetTooSmall = isOverlappingBudgetTooSmall(
    { ...buyOrder, budget: buy.budget },
    { ...sellOrder, budget: sell.budget }
  );

  // const checkInsufficientBalance = (balance: string, order: OrderCreate) => {
  //   if (new SafeDecimal(balance).lt(order.budget)) {
  //     order.setBudgetError('Insufficient balance');
  //   } else {
  //     order.setBudgetError('');
  //   }
  // };

  // TODO reenable this for create strategy
  // // Check for error when buy budget changes
  // useEffect(() => {
  //   const balance = token1BalanceQuery.data ?? '0';
  //   checkInsufficientBalance(balance, order0);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [order0.budget, token1BalanceQuery.data]);
  //
  // // Check for error when sell budget changes
  // useEffect(() => {
  //   const balance = token0BalanceQuery.data ?? '0';
  //   checkInsufficientBalance(balance, order1);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [order1.budget, token0BalanceQuery.data]);

  const onBuyBudgetChange = (value: string) => {
    dispatch('buyBudget', value);
    setAnchoredOrder('buy');
    setSellBudget(value, state.buy.min, state.sell.max);
  };
  const onSellBudgetChange = (value: string) => {
    dispatch('sellBudget', value);
    setAnchoredOrder('sell');
    setBuyBudget(value, state.buy.min, state.sell.max);
  };

  if (!quote || !base) return <></>;
  return (
    <>
      <BudgetInput
        id={sellBudgetId}
        title="Set Sell Budget"
        titleTooltip={`The amount of ${base.symbol} tokens you would like to sell.`}
        token={base}
        budgetValue={state.sell.budget}
        budgetError={state.sell.budgetError}
        onChange={onSellBudgetChange}
        disabled={maxBelowMarket || !validPrice}
        data-testid="input-budget-base"
      />
      {maxBelowMarket && <Explanation base={base} />}

      <BudgetInput
        id={buyBudgetId}
        title="Set Buy Budget"
        titleTooltip={`The amount of ${quote.symbol} tokens you would like to use in order to buy ${base.symbol}.`}
        token={quote}
        budgetValue={state.buy.budget}
        budgetError={state.buy.budgetError}
        onChange={onBuyBudgetChange}
        disabled={minAboveMarket || !validPrice}
        data-testid="input-budget-quote"
      />
      {minAboveMarket && <Explanation base={base} buy />}
      {budgetTooSmall && (
        <OverlappingSmallBudget
          base={base}
          quote={quote}
          buyBudget={state.buy.budget}
          htmlFor={`${buyBudgetId} ${sellBudgetId}`}
        />
      )}
      {!minAboveMarket && !maxBelowMarket && (
        <p className="text-12 text-white/60">
          The required 2nd budget will be calculated to maintain overlapping
          dynamics.&nbsp;
          <a
            href="https://faq.carbondefi.xyz/what-is-an-overlapping-strategy#overlapping-budget-dynamics"
            target="_blank"
            className="inline-flex items-center gap-4 text-12 font-weight-500 text-primary"
            rel="noreferrer"
          >
            Learn More
            <IconLink className="h-12 w-12" />
          </a>
        </p>
      )}
    </>
  );
};

const Explanation: FC<{ base?: Token; buy?: boolean }> = ({ base, buy }) => {
  return (
    <p className="text-12 text-white/60">
      The first price in the selected time frame is outside the ranges you've
      set for&nbsp;
      {buy ? 'buying' : 'selling'}&nbsp;
      {base?.symbol}. Therefore, budget for buying {base?.symbol} is not
      required.&nbsp;
      <a
        href="https://faq.carbondefi.xyz/what-is-an-overlapping-strategy#overlapping-budget-dynamics"
        target="_blank"
        className="inline-flex items-center gap-4 text-12 font-weight-500 text-primary"
        rel="noreferrer"
      >
        Learn More
        <IconLink className="h-12 w-12" />
      </a>
    </p>
  );
};

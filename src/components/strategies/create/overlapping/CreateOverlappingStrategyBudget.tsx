import { FC, useEffect, useState } from 'react';
import { Token } from 'libs/tokens';
import { OrderCreate } from '../useOrder';
import { ReactComponent as IconLink } from 'assets/icons/link.svg';
import { OverlappingStrategyProps } from './CreateOverlappingStrategy';
import { SafeDecimal } from 'libs/safedecimal';
import { carbonSDK } from 'libs/sdk';
import {
  getBuyMarginalPrice,
  getBuyMax,
  getSellMarginalPrice,
  getSellMin,
} from '../../overlapping/utils';
import { BudgetInput } from 'components/strategies/common/BudgetInput';

interface Props extends OverlappingStrategyProps {
  marketPrice: number;
}

export const CreateOverlappingStrategyBudget: FC<Props> = (props) => {
  const {
    base,
    quote,
    order0,
    order1,
    marketPrice,
    token0BalanceQuery,
    token1BalanceQuery,
    spreadPPM,
  } = props;
  const minAboveMarket = new SafeDecimal(order0.min).gte(order0.marginalPrice);
  const maxBelowMarket = new SafeDecimal(order1.max).lte(order1.marginalPrice);
  const [anchoredOrder, setAnchoderOrder] = useState('buy');

  const checkInsufficientBalance = (balance: string, order: OrderCreate) => {
    if (new SafeDecimal(balance).lt(order.budget)) {
      order.setBudgetError('Insufficient balance');
    } else {
      order.setBudgetError('');
    }
  };

  // Check for error when buy budget changes
  useEffect(() => {
    const balance = token1BalanceQuery.data ?? '0';
    checkInsufficientBalance(balance, order0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order0.budget]);

  // Check for error when sell budget changes
  useEffect(() => {
    const balance = token0BalanceQuery.data ?? '0';
    checkInsufficientBalance(balance, order1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order1.budget]);

  const setBuyBudget = async (sellBudget: string) => {
    if (!base || !quote) return;
    if (!sellBudget) {
      order0.setBudget('');
      order0.setMarginalPrice('');
      order1.setMarginalPrice('');
      return;
    }
    const buyBudget = await carbonSDK.calculateOverlappingStrategyBuyBudget(
      quote.address,
      order0.min,
      order1.max,
      marketPrice.toString(),
      spreadPPM.toString(),
      sellBudget ?? '0'
    );
    order0.setBudget(buyBudget);
    const buyMarginalPrice = getBuyMarginalPrice(marketPrice, spreadPPM);
    const sellMarginalPrice = getSellMarginalPrice(marketPrice, spreadPPM);
    order1.setMarginalPrice(buyMarginalPrice.toString());
    order0.setMarginalPrice(sellMarginalPrice.toString());
  };

  const setSellBudget = async (buyBudget: string) => {
    if (!base || !quote) return;
    if (!buyBudget) {
      order1.setBudget('');
      order1.setMarginalPrice('');
      order0.setMarginalPrice('');
      return;
    }
    const sellBudget = await carbonSDK.calculateOverlappingStrategySellBudget(
      base.address,
      order0.min,
      order1.max,
      marketPrice.toString(),
      spreadPPM.toString(),
      buyBudget ?? '0'
    );
    order1.setBudget(sellBudget);
    const buyMarginalPrice = getBuyMarginalPrice(marketPrice, spreadPPM);
    const sellMarginalPrice = getSellMarginalPrice(marketPrice, spreadPPM);
    order0.setMarginalPrice(buyMarginalPrice.toString());
    order1.setMarginalPrice(sellMarginalPrice.toString());
  };

  // Update budget on price change
  useEffect(() => {
    if (maxBelowMarket) {
      setAnchoderOrder('buy');
      setSellBudget(order0.budget);
    } else if (minAboveMarket) {
      setAnchoderOrder('sell');
      setBuyBudget(order1.budget);
    } else {
      if (anchoredOrder === 'buy') setSellBudget(order0.budget);
      if (anchoredOrder === 'sell') setBuyBudget(order1.budget);
    }
    const buyMax = getBuyMax(Number(order1.max), spreadPPM);
    const sellMin = getSellMin(Number(order0.min), spreadPPM);
    order0.setMax(buyMax.toString());
    order1.setMin(sellMin.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order0.min, order1.max, marketPrice, spreadPPM]);

  const onBuyBudgetChange = (value: string) => {
    order0.setBudget(value);
    setAnchoderOrder('buy');
    setSellBudget(value);
  };
  const onSellBudgetChange = (value: string) => {
    order1.setBudget(value);
    setAnchoderOrder('sell');
    setBuyBudget(value);
  };

  if (!quote || !base) return <></>;
  return (
    <>
      <BudgetInput
        token={quote}
        order={order0}
        query={token1BalanceQuery}
        onChange={onBuyBudgetChange}
        disabled={minAboveMarket}
      />
      {minAboveMarket && <Explaination base={base} buy />}
      <BudgetInput
        token={base}
        order={order1}
        query={token0BalanceQuery}
        onChange={onSellBudgetChange}
        disabled={maxBelowMarket}
      />
      {maxBelowMarket && <Explaination base={base} />}
    </>
  );
};

const Explaination: FC<{ base?: Token; buy?: boolean }> = ({ base, buy }) => {
  return (
    <p className="text-12 text-white/60">
      The market price is outside the ranges you set for&nbsp;
      {buy ? 'buying' : 'selling'}&nbsp;
      {base?.symbol}. Budget for buying {base?.symbol} is not required.&nbsp;
      {/* TODO: add url */}
      <a
        href="/"
        target="_blank"
        className="inline-flex items-center gap-4 text-12 font-weight-500 text-green"
      >
        Learn More
        <IconLink className="h-12 w-12" />
      </a>
    </p>
  );
};

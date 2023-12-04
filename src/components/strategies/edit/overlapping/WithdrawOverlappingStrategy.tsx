import { FC, useEffect, useId, useState } from 'react';
import { Strategy, useGetTokenBalance } from 'libs/queries';
import { ReactComponent as IconTooltip } from 'assets/icons/tooltip.svg';
import { Tooltip } from 'components/common/tooltip/Tooltip';
import { OverlappingStrategyGraph } from '../../overlapping/OverlappingStrategyGraph';
import { useMarketPrice } from 'hooks/useMarketPrice';
import { getRoundedSpreadPPM } from '../../overlapping/utils';
import { useMarketIndication } from 'components/strategies/marketPriceIndication';
import { OrderCreate } from 'components/strategies/create/useOrder';
import { ReactComponent as IconAction } from 'assets/icons/action.svg';
import { ReactComponent as IconLink } from 'assets/icons/link.svg';
import { ReactComponent as IconWarning } from 'assets/icons/warning.svg';
import { SafeDecimal } from 'libs/safedecimal';
import { BudgetInput } from 'components/strategies/common/BudgetInput';
import { WithdrawAllocatedBudget } from 'components/strategies/common/AllocatedBudget';
import { carbonSDK } from 'libs/sdk';
import {
  getBuyMarginalPrice,
  getSellMarginalPrice,
  getSpread,
} from 'components/strategies/overlapping/utils';

interface Props {
  strategy: Strategy;
  order0: OrderCreate;
  order1: OrderCreate;
}

export const WithdrawOverlappingStrategy: FC<Props> = (props) => {
  const { strategy, order0, order1 } = props;
  const { base, quote } = strategy;
  const buyId = useId();
  const sellId = useId();

  const tokenBaseBalanceQuery = useGetTokenBalance(base);
  const tokenQuoteBalanceQuery = useGetTokenBalance(quote);

  const marketPrice = useMarketPrice({ base, quote });
  const spreadPPM = getRoundedSpreadPPM(strategy);
  const min = order0.min;
  const max = order1.max;
  const { marketPricePercentage } = useMarketIndication({
    base,
    quote,
    order: { min, max, price: '', isRange: true },
  });

  const checkInsufficientBalance = (balance: string, order: OrderCreate) => {
    if (new SafeDecimal(balance).lt(order.budget)) {
      order.setBudgetError('Insufficient balance');
    } else {
      order.setBudgetError('');
    }
  };

  // Check for error when buy budget changes
  useEffect(() => {
    const balance = tokenBaseBalanceQuery.data ?? '0';
    checkInsufficientBalance(balance, order0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order0.budget]);

  // Check for error when sell budget changes
  useEffect(() => {
    const balance = tokenQuoteBalanceQuery.data ?? '0';
    checkInsufficientBalance(balance, order1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order1.budget]);

  const aboveMarket = new SafeDecimal(min).gt(marketPrice);
  const belowMarket = new SafeDecimal(max).lt(marketPrice);
  const withdrawAll =
    (order0.budget || '0') === strategy.order0.balance &&
    (order1.budget || '0') === strategy.order1.balance;

  // TODO: Move this into useOverlappingBudget
  const [anchoredOrder, setAnchoderOrder] = useState('buy');

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
    const spread = getSpread(Number(order1.min), Number(order0.max), spreadPPM);
    const buyMarginalPrice = getBuyMarginalPrice(marketPrice, spread);
    const sellMarginalPrice = getSellMarginalPrice(marketPrice, spread);
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
    const spread = getSpread(Number(order0.min), Number(order1.max), spreadPPM);
    const buyMarginalPrice = getBuyMarginalPrice(marketPrice, spread);
    const sellMarginalPrice = getSellMarginalPrice(marketPrice, spread);
    order0.setMarginalPrice(buyMarginalPrice.toString());
    order1.setMarginalPrice(sellMarginalPrice.toString());
  };
  // Update budget on market price change
  useEffect(() => {
    if (anchoredOrder === 'buy') setSellBudget(order0.budget);
    if (anchoredOrder === 'sell') setBuyBudget(order1.budget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketPrice]);

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

  return (
    <>
      <article className="flex flex-col gap-20 rounded-10 bg-silver p-20">
        <header className="flex items-center gap-8">
          <h3 className="flex-1 text-18 font-weight-500">Price Range</h3>
          {/* TODO add tooltip text here */}
          <Tooltip element={''}>
            <IconTooltip className="h-14 w-14 text-white/60" />
          </Tooltip>
        </header>
        <OverlappingStrategyGraph
          base={base}
          quote={quote}
          order0={order0}
          order1={order1}
          marketPrice={marketPrice}
          spreadPPM={spreadPPM}
          marketPricePercentage={marketPricePercentage}
          disabled
        />
      </article>
      <article className="flex flex-col gap-20 rounded-10 bg-silver p-20">
        <header className="flex items-center gap-8 ">
          <h3 className="flex-1 text-18 font-weight-500">Withdraw Budget</h3>
          {/* TODO add tooltip text here */}
          <Tooltip element={''}>
            <IconTooltip className="h-14 w-14 text-white/60" />
          </Tooltip>
        </header>
        {!aboveMarket && (
          <BudgetInput
            token={base}
            query={tokenBaseBalanceQuery}
            order={order0}
            onChange={onBuyBudgetChange}
            withoutWallet
          >
            <WithdrawAllocatedBudget
              token={base}
              order={order0}
              currentBudget={strategy.order0.balance}
              buy
            />
          </BudgetInput>
        )}
        {!belowMarket && (
          <BudgetInput
            token={quote}
            query={tokenQuoteBalanceQuery}
            order={order1}
            onChange={onSellBudgetChange}
            withoutWallet
          >
            <WithdrawAllocatedBudget
              token={quote}
              order={order1}
              currentBudget={strategy.order1.balance}
              buy
            />
          </BudgetInput>
        )}
        <footer className="flex items-center gap-8">
          {!withdrawAll && (
            <>
              <IconAction className="h-16 w-16" />
              <p className="text-12 text-white/60">
                Price range and liquidity spread remain unchanged.&nbsp;
                <a
                  href="."
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-4 font-weight-500 text-green"
                >
                  <span>Learn More</span>
                  <IconLink className="inline h-12 w-12" />
                </a>
              </p>
            </>
          )}
          {withdrawAll && (
            <output
              htmlFor={[buyId, sellId].join(',')}
              role="alert"
              aria-live="polite"
              className="flex items-center gap-10 font-mono text-12 text-warning-500"
            >
              <IconWarning className="h-12 w-12" />
              <span className="flex-1">
                Please note that your strategy will be inactive as it will not
                have any budget.
              </span>
            </output>
          )}
        </footer>
      </article>
    </>
  );
};
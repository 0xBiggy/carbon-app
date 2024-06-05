import { useNavigate } from 'libs/routing';
import { Strategy } from 'libs/queries';
import {
  getRoundedSpread,
  isOverlappingStrategy,
} from 'components/strategies/overlapping/utils';
import { roundSearchParam } from 'utils/helpers';
import { isLimitOrder } from '../common/utils';

export const useDuplicate = () => {
  const navigate = useNavigate();
  return ({ base, quote, order0, order1 }: Strategy) => {
    const isBuyEmpty = !+order0.endRate;
    const isSellEmpty = !+order1.endRate;
    const isDisposable = isBuyEmpty || isSellEmpty;
    if (isDisposable) {
      const order = isBuyEmpty ? order1 : order0;
      navigate({
        to: '/strategies/create/disposable',
        search: {
          base: base.address,
          quote: quote.address,
          min: roundSearchParam(order.startRate),
          max: roundSearchParam(order.endRate),
          budget: roundSearchParam(order.balance),
          settings: isLimitOrder(order) ? 'limit' : 'range',
          direction: isBuyEmpty ? 'sell' : 'buy',
        },
      });
    } else if (isOverlappingStrategy({ order0, order1 })) {
      navigate({
        to: '/strategies/create/overlapping',
        search: {
          base: base.address,
          quote: quote.address,
          min: roundSearchParam(order0.startRate),
          max: roundSearchParam(order1.endRate),
          spread: getRoundedSpread({ order0, order1 }).toString(),
        },
      });
    } else {
      navigate({
        to: '/strategies/create/recurring',
        search: {
          base: base.address,
          quote: quote.address,
          buyMin: roundSearchParam(order0.startRate),
          buyMax: roundSearchParam(order0.endRate),
          buyBudget: roundSearchParam(order0.balance),
          buySettings: isLimitOrder(order0) ? 'limit' : 'range',
          sellMin: roundSearchParam(order1.startRate),
          sellMax: roundSearchParam(order1.endRate),
          sellBudget: roundSearchParam(order1.balance),
          sellSettings: isLimitOrder(order1) ? 'limit' : 'range',
        },
      });
    }
  };
};

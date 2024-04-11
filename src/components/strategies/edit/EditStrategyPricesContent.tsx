import { FormEvent, useMemo } from 'react';
import { MarginalPriceOptions } from '@bancor/carbon-sdk/strategy-management';
import { Button } from 'components/common/button';
import { useOrder } from 'components/strategies/create/useOrder';
import { useUpdateStrategy } from 'components/strategies/useUpdateStrategy';
import { Order, Strategy } from 'libs/queries';
import { useRouter } from 'libs/routing';
import { EditStrategyOverlapTokens } from 'components/strategies/edit/EditStrategyOverlapTokens';
import { EditStrategyPricesBuySellBlock } from 'components/strategies/edit/EditStrategyPricesBuySellBlock';
import { carbonEvents } from 'services/events';
import { useStrategyEventData } from 'components/strategies/create/useStrategyEventData';
import {
  checkIfOrdersOverlap,
  checkIfOrdersReversed,
  getStatusTextByTxStatus,
} from 'components/strategies/utils';
import { isOverlappingStrategy } from 'components/strategies/overlapping/utils';
import { EditPriceOverlappingStrategy } from 'components/strategies/edit/overlapping/EditPriceOverlappingStrategy';
import { cn } from 'utils/helpers';
import style from './EditStrategyPricesContent.module.css';

export type EditStrategyPrices = 'editPrices' | 'renew';

type EditStrategyPricesContentProps = {
  type: EditStrategyPrices;
  strategy: Strategy;
};

export const EditStrategyPricesContent = ({
  strategy,
  type,
}: EditStrategyPricesContentProps) => {
  const isOverlapping = isOverlappingStrategy(strategy);
  const { history } = useRouter();
  const { renewStrategy, changeRateStrategy, isProcessing, updateMutation } =
    useUpdateStrategy();
  const isAwaiting = updateMutation.isLoading;
  const isLoading = isAwaiting || isProcessing;
  const base = strategy.base;
  const quote = strategy.quote;

  const order0 = useOrder(
    type === 'renew'
      ? { ...strategy.order0, startRate: '', endRate: '' }
      : strategy.order0
  );
  const order1 = useOrder(
    type === 'renew'
      ? { ...strategy.order1, startRate: '', endRate: '' }
      : strategy.order1
  );
  const isOrdersOverlap = useMemo(() => {
    return checkIfOrdersOverlap(order0, order1);
  }, [order0, order1]);
  const isOrdersReversed = useMemo(() => {
    return checkIfOrdersReversed(order0, order1);
  }, [order0, order1]);

  const strategyEventData = useStrategyEventData({
    base,
    quote,
    order0,
    order1,
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newOrder0 = {
      balance: order0.budget || strategy.order0.balance,
      startRate: (order0.isRange ? order0.min : order0.price) || '0',
      endRate: (order0.isRange ? order0.max : order0.price) || '0',
      marginalRate: order0.marginalPrice || strategy.order0.marginalRate,
    };
    const newOrder1 = {
      balance: order1.budget || strategy.order1.balance,
      startRate: (order1.isRange ? order1.min : order1.price) || '0',
      endRate: (order1.isRange ? order1.max : order1.price) || '0',
      marginalRate: order1.marginalPrice || strategy.order1.marginalRate,
    };

    const getMarginalOption = (oldOrder: Order, newOrder: Order) => {
      if (oldOrder.startRate !== newOrder.startRate)
        return MarginalPriceOptions.reset;
      if (oldOrder.endRate !== newOrder.endRate)
        return MarginalPriceOptions.reset;
    };

    if (type === 'renew') {
      renewStrategy(
        {
          ...strategy,
          order0: newOrder0,
          order1: newOrder1,
        },
        () =>
          carbonEvents.strategyEdit.strategyRenew({
            ...strategyEventData,
            strategyId: strategy.id,
          })
      );
    } else {
      changeRateStrategy(
        {
          ...strategy,
          order0: newOrder0,
          order1: newOrder1,
        },
        getMarginalOption(strategy.order0, newOrder0),
        getMarginalOption(strategy.order1, newOrder1),
        () =>
          carbonEvents.strategyEdit.strategyEditPrices({
            ...strategyEventData,
            strategyId: strategy.id,
          })
      );
    }
  };

  const loadingChildren = useMemo(() => {
    return getStatusTextByTxStatus(isAwaiting, isProcessing);
  }, [isAwaiting, isProcessing]);

  return (
    <form
      onSubmit={submit}
      onReset={() => history.back()}
      className={cn(
        'flex w-full flex-col items-center gap-20 md:w-[400px]',
        style.form
      )}
      data-testid="edit-form"
    >
      <EditStrategyOverlapTokens strategy={strategy} />
      {isOverlapping && (
        <EditPriceOverlappingStrategy
          strategy={strategy}
          order0={order0}
          order1={order1}
        />
      )}
      {!isOverlapping && (
        <>
          <EditStrategyPricesBuySellBlock
            base={strategy?.base}
            quote={strategy?.quote}
            order={order1}
            balance={strategy.order1.balance}
            type={type}
            isOrdersOverlap={isOrdersOverlap}
            isOrdersReversed={isOrdersReversed}
          />
          <EditStrategyPricesBuySellBlock
            buy
            base={strategy?.base}
            quote={strategy?.quote}
            order={order0}
            balance={strategy.order0.balance}
            type={type}
            isOrdersOverlap={isOrdersOverlap}
            isOrdersReversed={isOrdersReversed}
          />
        </>
      )}

      <label className={cn(style.approveWarnings)}>
        <input
          name="approve-warning"
          type="checkbox"
          data-testid="approve-warnings"
        />
        I've reviewed the warning(s) but choose to proceed.
      </label>

      <Button
        type="submit"
        loading={isLoading}
        loadingChildren={loadingChildren}
        variant="white"
        size="lg"
        fullWidth
        data-testid="edit-submit"
      >
        {type === 'renew' ? 'Renew Strategy' : 'Confirm Changes'}
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
  );
};

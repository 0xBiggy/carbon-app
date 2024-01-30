import { ScaleLinear } from 'd3';
import { StrategyInput2 } from 'hooks/useStrategyInput';
import { D3ChartHandle } from 'libs/d3/charts/candlestick/D3ChartHandle';
import { D3ChartRect } from 'libs/d3/charts/candlestick/D3ChartRect';
import {
  getHandleSelector,
  getRectSelector,
  handleStateChange,
  onDragHandler,
  onDragRectHandler,
} from 'libs/d3/charts/candlestick/utils';
import { D3ChartSettings } from 'libs/d3/types';
import { SimulatorInputSearch } from 'libs/routing/routes/sim';
import { useEffect, useRef } from 'react';
import { prettifyNumber } from 'utils/helpers';

type OrderRangeProps = {
  type: 'buy' | 'sell';
  yScale: ScaleLinear<number, number>;
  onDrag: (key: keyof SimulatorInputSearch, value: number) => void;
  state: StrategyInput2;
  dms: D3ChartSettings;
};

export const DragablePriceRange = ({
  type,
  yScale,
  onDrag,
  state,
  dms,
}: OrderRangeProps) => {
  const isHovering = useRef(false);
  const color = type === 'buy' ? '#00B578' : '#D86371';

  const isLimit = !state[type].isRange;

  const max = Number(state[type].max);
  const min = Number(state[type].min);

  const yMax = yScale(max);
  const yMin = yScale(min);

  const selectorRect = getRectSelector(type);
  const selectorH1 = getHandleSelector(type, 'line1');
  const selectorH2 = getHandleSelector(type, 'line2');

  const onDragRect = (y: number, y2: number) =>
    onDragRectHandler({ type, y, y2, onDrag });

  const onDragH1 = (y: number) =>
    onDragHandler({ type, id: 'line1', y, onDrag, isLimit });

  const onDragH2 = (y: number) =>
    onDragHandler({ type, id: 'line2', y, onDrag });

  useEffect(() => {
    if (isHovering.current) {
      return;
    }

    handleStateChange({ type, id: 'line1', y: yMax, isLimit });
    !isLimit && handleStateChange({ type, id: 'line2', y: yMin });
  }, [isLimit, type, yMax, yMin]);

  return (
    <g
      onMouseEnter={() => {
        isHovering.current = true;
      }}
      onMouseLeave={() => {
        isHovering.current = false;
      }}
    >
      {!isLimit && (
        <D3ChartRect
          selector={selectorRect}
          dms={dms}
          onDrag={onDragRect}
          color={color}
        />
      )}
      <D3ChartHandle
        selector={selectorH1}
        label={prettifyNumber(max, { currentCurrency: 'USD' })}
        dms={dms}
        onDrag={onDragH1}
        color={color}
      />
      {!isLimit && (
        <D3ChartHandle
          selector={selectorH2}
          label={prettifyNumber(min, { currentCurrency: 'USD' })}
          dms={dms}
          onDrag={onDragH2}
          color={color}
        />
      )}
    </g>
  );
};

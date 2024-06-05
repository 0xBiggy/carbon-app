import { TokensOverlap } from 'components/common/tokensOverlap';
import { Strategy } from 'libs/queries';
import { m } from 'libs/motion';
import { items } from 'components/strategies/common/variants';

type EditStrategyOverlapTokensProps = {
  strategy: Strategy;
};

export const EditStrategyOverlapTokens = ({
  strategy,
}: EditStrategyOverlapTokensProps) => {
  return (
    <m.header
      variants={items}
      className="rounded-10 bg-background-900 flex w-full items-center space-x-10 p-20"
    >
      <TokensOverlap tokens={[strategy.base, strategy.quote]} size={32} />
      <div>
        <h2 className="text-14 flex gap-6">
          <span>{strategy.base.symbol}</span>
          <span role="separator" className="text-white/60">
            /
          </span>
          <span>{strategy.quote.symbol}</span>
        </h2>
        <div className="text-14 flex text-white/60">
          ID: {strategy.idDisplay}
        </div>
      </div>
    </m.header>
  );
};

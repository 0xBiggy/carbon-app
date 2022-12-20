import { useSanitizeInput } from 'hooks/useSanitizeInput';
import { FC } from 'react';
import { Token } from 'tokens';

export const InputRange: FC<{
  buyToken: Token;
  sellToken: Token;
  min: string;
  setMin: (value: string) => void;
  max: string;
  setMax: (value: string) => void;
  error?: string;
  buy?: boolean;
}> = ({ buyToken, sellToken, min, setMin, max, setMax, error, buy }) => {
  const handleChangeMin = useSanitizeInput(setMin);
  const handleChangeMax = useSanitizeInput(setMax);
  return (
    <div>
      <div className="flex gap-6">
        <div
          className={`${
            error && 'border border-error-500 text-error-500'
          } bg-body w-full rounded-14 rounded-r-0 p-16`}
        >
          <div
            className={`mb-8 text-[11px] ${
              buy ? 'text-success-500' : 'text-error-500'
            }`}
          >
            Min {sellToken.symbol} per {buyToken.symbol}
          </div>
          <input
            value={min}
            onChange={handleChangeMin}
            placeholder="Price"
            className={'w-full bg-transparent focus:outline-none'}
          />
        </div>
        <div
          className={`${
            error && 'border border-error-500 text-error-500'
          } bg-body w-full rounded-14 rounded-l-0 p-16`}
        >
          <div>
            <div
              className={`mb-8 text-[11px] ${
                buy ? 'text-success-500' : 'text-error-500'
              }`}
            >
              Max {sellToken.symbol} per {buyToken.symbol}
            </div>
            <input
              value={max}
              onChange={handleChangeMax}
              placeholder={`Price`}
              className={'w-full bg-transparent focus:outline-none'}
            />
          </div>
        </div>
      </div>
      {error && (
        <div className="text-center text-12 text-error-500">{error}</div>
      )}
    </div>
  );
};

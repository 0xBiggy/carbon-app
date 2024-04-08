import { Tooltip } from 'components/common/tooltip/Tooltip';
import { FC, ReactNode, useId } from 'react';
import { TokenInputField } from 'components/common/TokenInputField/TokenInputField';
import { ReactComponent as IconWarning } from 'assets/icons/warning.svg';
import { Token } from 'libs/tokens';
import { UseQueryResult } from '@tanstack/react-query';

interface Props {
  id?: string;
  children?: ReactNode;
  budgetValue: string;
  budgetError?: string;
  token: Token;
  query?: UseQueryResult<string>;
  onChange: (value: string) => void;
  disabled?: boolean;
  withoutWallet?: boolean;
  'data-testid'?: string;
  title: string;
  titleTooltip: string;
}

export const BudgetInput: FC<Props> = (props) => {
  const {
    id,
    budgetValue,
    budgetError,
    token,
    query,
    children,
    onChange,
    title,
    titleTooltip,
  } = props;
  const inputId = useId();
  const balance = query?.data ?? '0';

  return (
    <div className="flex flex-col gap-16">
      <legend className="flex text-14 font-weight-500">
        <Tooltip element={titleTooltip}>
          <span className="text-white/80">{title}</span>
        </Tooltip>
      </legend>
      <TokenInputField
        id={id ?? inputId}
        className="rounded-16 bg-black p-16"
        value={budgetValue}
        setValue={onChange}
        token={token}
        isBalanceLoading={query?.isLoading}
        balance={balance}
        isError={!!budgetError}
        withoutWallet={!!props.withoutWallet}
        disabled={!!props.disabled}
        data-testid={props['data-testid']}
      />
      {!!budgetError && (
        <output
          htmlFor={inputId}
          role="alert"
          aria-live="polite"
          className="flex items-center gap-10 font-mono text-12 text-error"
        >
          <IconWarning className="h-12 w-12" />
          <span className="flex-1">{budgetError}</span>
        </output>
      )}
      {children}
    </div>
  );
};

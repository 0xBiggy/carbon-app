import { ReactComponent as CalendarIcon } from 'assets/icons/calendar.svg';
import { SimulatorPageTabs } from './SimulatorPageTabs';
import { SimulatorDownloadMenu } from './SimulatorDownload';
import { SimulatorData } from 'libs/queries';
import { StrategyInput2 } from 'hooks/useStrategyInput';

interface Props {
  data: Array<SimulatorData>;
  showSummary: boolean;
  setShowSummary: React.Dispatch<React.SetStateAction<boolean>>;
  state2: StrategyInput2;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: '2-digit',
});

export const SimulatorChartHeader = ({
  showSummary,
  setShowSummary,
  data,
  state2,
}: Props) => {
  const startDate = dateFormatter.format(data[0].date * 1e3);
  const endDate = dateFormatter.format(data[data.length - 1].date * 1e3);

  return (
    <section className="flex flex-wrap items-center justify-evenly gap-8 py-8 px-24 md:justify-between">
      <article className="flex items-center gap-8">
        <span className="flex h-24 w-24 items-center justify-center rounded-[12px] bg-white/10">
          <CalendarIcon className="h-12 w-12" />
        </span>
        <span className="justify-self-end text-14 text-white/80">
          {startDate} – {endDate}
        </span>
      </article>
      <article className="flex items-center gap-8">
        <SimulatorPageTabs
          setShowSummary={setShowSummary}
          showSummary={showSummary}
        />
        <SimulatorDownloadMenu data={data} state2={state2} />
      </article>
    </section>
  );
};

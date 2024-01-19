import { test } from '@playwright/test';
import { mockApi } from '../utils/mock-api';
import { DebugDriver, removeFork, setupFork } from '../utils/DebugDriver';
import { CreateStrategyTestCase } from '../utils/strategy';
import * as recurring from '../tests/strategy/recurring/';
import * as disposable from '../tests/strategy/disposable/';
import * as overlapping from '../tests/strategy/overlapping/';

const testCases: CreateStrategyTestCase[] = [
  // Disposable
  {
    type: 'disposable',
    setting: 'limit',
    direction: 'buy',
    base: 'ETH',
    quote: 'DAI',
    input: {
      create: {
        buy: {
          min: '1500',
          max: '1500',
          budget: '10',
        },
        sell: {
          min: '0',
          max: '0',
          budget: '0',
        },
      },
    },
    output: {
      create: {
        buy: {
          min: '1,500.00 DAI',
          max: '1,500.00 DAI',
          outcomeValue: '0.006666 ETH',
          outcomeQuote: '1,500.00 DAI',
          budget: '10.00 DAI',
          fiat: '$10.00',
        },
        sell: {
          min: '0.00 DAI',
          max: '0.00 DAI',
          outcomeValue: '0.00 ETH',
          outcomeQuote: '0.00 ETH',
          budget: '0.00 ETH',
          fiat: '$0.00',
        },
      },
    },
  },
  {
    type: 'disposable',
    setting: 'limit',
    direction: 'sell',
    base: 'ETH',
    quote: 'DAI',
    input: {
      create: {
        buy: {
          min: '0',
          max: '0',
          budget: '0',
        },
        sell: {
          min: '1700',
          max: '1700',
          budget: '2',
        },
      },
    },
    output: {
      create: {
        buy: {
          min: '0.00 DAI',
          max: '0.00 DAI',
          outcomeValue: '0.00 ETH',
          outcomeQuote: '0.00 ETH',
          budget: '0.00 DAI',
          fiat: '$0.00',
        },
        sell: {
          min: '1,700.00 DAI',
          max: '1,700.00 DAI',
          outcomeValue: '3,400.00 DAI',
          outcomeQuote: '1,700.00 DAI',
          budget: '2.00 ETH',
          fiat: '$3,334.42',
        },
      },
    },
  },
  {
    type: 'disposable',
    setting: 'range',
    direction: 'buy',
    base: 'ETH',
    quote: 'DAI',
    input: {
      create: {
        buy: {
          min: '1500',
          max: '1700',
          budget: '10',
        },
        sell: {
          min: '0',
          max: '0',
          budget: '0',
        },
      },
    },
    output: {
      create: {
        buy: {
          min: '1,500.00 DAI',
          max: '1,700.00 DAI',
          outcomeValue: '0.006262 ETH',
          outcomeQuote: '1,596.87 DAI',
          budget: '10.00 DAI',
          fiat: '$10.00',
        },
        sell: {
          min: '0.00 DAI',
          max: '0.00 DAI',
          outcomeValue: '0.00 ETH',
          outcomeQuote: '0.00 ETH',
          budget: '0.00 ETH',
          fiat: '$0.00',
        },
      },
    },
  },
  {
    type: 'disposable',
    setting: 'range',
    direction: 'sell',
    base: 'ETH',
    quote: 'DAI',
    input: {
      create: {
        buy: {
          min: '0',
          max: '0',
          budget: '0',
        },
        sell: {
          min: '1500',
          max: '1700',
          budget: '2',
        },
      },
    },
    output: {
      create: {
        buy: {
          min: '0.00 DAI',
          max: '0.00 DAI',
          outcomeValue: '0.00 ETH',
          outcomeQuote: '0.00 ETH',
          budget: '0.00 DAI',
          fiat: '$0.00',
        },
        sell: {
          min: '1,500.00 DAI',
          max: '1,700.00 DAI',
          outcomeValue: '3,193.74 DAI',
          outcomeQuote: '1,596.87 DAI',
          budget: '2.00 ETH',
          fiat: '$3,334.42',
        },
      },
    },
  },
  // Recurring
  {
    type: 'recurring',
    setting: 'limit_limit',
    base: 'ETH',
    quote: 'DAI',
    input: {
      create: {
        buy: {
          min: '1500',
          max: '1500',
          budget: '10',
        },
        sell: {
          min: '1700',
          max: '1700',
          budget: '2',
        },
      },
      editPrice: {
        buy: {
          min: '1600',
          max: '1600',
        },
        sell: {
          min: '1800',
          max: '1800',
        },
      },
      deposit: {
        buy: '5',
        sell: '1',
      },
      withdraw: {
        buy: '5',
        sell: '1',
      },
    },
    output: {
      create: {
        totalFiat: '$3,344.42',
        buy: {
          min: '1,500.00 DAI',
          max: '1,500.00 DAI',
          outcomeValue: '0.006666 ETH',
          outcomeQuote: '1,500.00 DAI',
          budget: '10.00 DAI',
          fiat: '$10.00',
        },
        sell: {
          min: '1,700.00 DAI',
          max: '1,700.00 DAI',
          outcomeValue: '3,400.00 DAI',
          outcomeQuote: '1,700.00 DAI',
          budget: '2.00 ETH',
          fiat: '$3,334.42',
        },
      },
      undercut: {
        totalFiat: '$3,344.42',
        buy: {
          min: '1,501.50 DAI',
          max: '1,501.50 DAI',
          budget: '10.00 DAI',
          fiat: '$10.00',
        },
        sell: {
          min: '1,698.30 DAI',
          max: '1,698.30 DAI',
          budget: '2.00 ETH',
          fiat: '$3,334.42',
        },
      },
      editPrice: {
        buy: {
          min: '1,600.00 DAI',
          max: '1,600.00 DAI',
        },
        sell: {
          min: '1,800.00 DAI',
          max: '1,800.00 DAI',
        },
      },
      deposit: {
        buy: '15.00 DAI',
        sell: '3.00 ETH',
      },
      withdraw: {
        buy: '5.00 DAI',
        sell: '1.00 ETH',
      },
    },
  },
  // Overlapping
  {
    type: 'overlapping',
    base: 'BNT',
    quote: 'USDC',
    input: {
      create: {
        buy: {
          min: '0.3',
          max: '0.545454',
          budget: '12.501572',
        },
        sell: {
          min: '0.33',
          max: '0.6',
          budget: '30',
        },
        spread: '10', // Need a large spread for tooltip test
      },
    },
    output: {
      create: {
        totalFiat: '$25.11',
        buy: {
          min: '0.30 USDC',
          max: '0.545454 USDC',
          budget: '12.50 USDC',
          fiat: '$12.50',
        },
        sell: {
          min: '0.33 USDC',
          max: '0.60 USDC',
          budget: '30.00 BNT',
          fiat: '$12.61',
        },
      },
    },
  },
];

const testDescription = (testCase: CreateStrategyTestCase) => {
  if (testCase.type === 'overlapping') return 'Overlapping';
  if (testCase.type === 'disposable') {
    return `Disposable ${testCase.direction} ${testCase.setting}`;
  }
  return `Recurring ${testCase.setting.split('_').join(' ')}`;
};

test.describe('Strategies', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.setTimeout(180_000);
    await setupFork(testInfo);
    const debug = new DebugDriver(page);
    await debug.visit();
    await debug.setRpcUrl(testInfo);
    await Promise.all([mockApi(page), debug.setupImposter(), debug.setE2E()]);
  });
  test.afterEach(async ({}, testInfo) => {
    await removeFork(testInfo);
  });

  const testStrategies = {
    recurring,
    disposable,
    overlapping,
  };

  for (const testCase of testCases) {
    test.describe(testDescription(testCase), () => {
      const testSuite = testStrategies[testCase.type];
      for (const [, testFn] of Object.entries(testSuite)) {
        testFn(testCase);
      }
    });
  }
});

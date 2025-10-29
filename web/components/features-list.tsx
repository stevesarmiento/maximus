import { 
  IconBrain, 
  IconChartBarXaxisAscending, 
  IconCreditcard, 
  IconShield, 
  IconArrowLeftAndRight, 
  IconSquareStack, 
  IconGear, 
  IconCommand,
  IconChartPie,
  IconChartDotsScatter,
  IconBuilding,
  IconInfoCircle
} from 'symbols-react'

const features = [
  {
    name: 'Multi-Step Reasoning',
    description: 'Breaks down complex queries into tasks and executes them intelligently.',
    icon: IconBrain,
  },
  {
    name: 'Technical Analysis',
    description: 'Advanced indicators including Trend Waves, RSI, Stochastic RSI, MACD, Money Flow, and divergence detection for technical signals.',
    icon: IconChartPie,
  },
  {
    name: 'Price Charts & Visualization',
    description: 'Display line charts and candlestick charts with historical OHLC data.',
    icon: IconChartDotsScatter,
  },
  {
    name: 'Real-Time Price Streaming',
    description: 'Live price updates for any token through WebSocket connections.',
    icon: IconChartBarXaxisAscending,
  },
  {
    name: 'Market Intelligence',
    description: 'Access token market cap, global market data, category filtering, and comprehensive market trends.',
    icon: IconBuilding,
  },
  { 
    name: 'Token Research',
    description: 'Deep project information including descriptions, social metrics, contract addresses, and community statistics.',
    icon: IconInfoCircle,
  },
  {
    name: 'Wallet Management',
    description: 'Check balances, view transactions, and manage multiple wallets including delegate wallets.',
    icon: IconCreditcard,
  },
  {
    name: 'Autonomous Delegation',
    description: 'Create secure delegate wallets with spending limits for autonomous trading and transactions.',
    icon: IconShield,
  },
  {
    name: 'Swap Execution',
    description: 'Get real-time quotes from Jupiter and Orca, compare rates, and execute swaps with confirmation.',
    icon: IconArrowLeftAndRight,
  },
  {
    name: 'Memory & Context',
    description: 'Agent has historical memory and retrieves relevant context for follow-up queries.',
    icon: IconSquareStack,
  },
  {
    name: 'Tool Optimization',
    description: 'Automatically optimizes tool arguments based on task requirements for better results.',
    icon: IconGear,
  },
  {
    name: 'Command Palette',
    description: 'Quick access to balances, transactions, delegation status, and more with keyboard shortcuts.',
    icon: IconCommand,
  },
]

export function FeaturesList() {
  return (
    <div className="max-w-5xl mx-auto bg-bg1 py-24 sm:py-32 border-l border-r border-sand-1400">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
          <div className="mb-16 lg:mb-20">
            <h2 className="text-base/7 font-inter-semibold text-sand-500">
              Everything you need
            </h2>
            <p className="mt-2 text-title-4 text-sand-100 font-diatype-medium">
              Built for autonomous trading
            </p>
            <p className="mt-6 text-body-l text-sand-600 max-w-2xl font-diatype-mono">
              Maximus combines intelligent task planning, real-time data streaming, technical analysis, and secure wallet delegation to give you a powerful Solana agent that works autonomously.
            </p>
          </div>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-10 text-base/7 text-sand-600 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-16">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.name} className="relative pl-9">
                  <dt className="font-inter-semibold text-sand-100">
                    <Icon
                      aria-hidden="true"
                      className="absolute top-1 left-0 size-5 fill-sand-1000/50 font-diatype-medium"
                    />
                    {feature.name}
                  </dt>
                  <dd className="mt-2 text-body-md text-sand-800 font-diatype-mono">{feature.description}</dd>
                </div>
              )
            })}
          </dl>
        </div>
      </div>
    </div>
  )
}


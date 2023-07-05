'use client'

import {
  ChangeEvent,
  MutableRefObject,
  SetStateAction,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import io, { Socket } from 'socket.io-client'
import { Chart } from './chart'
import Image from 'next/image'

type Symbol = {
  symbol: string
  minNotional: string
  price: number
  data5m: any[]
  data15m: any[]
  data30m: any[]
  data1h: any[]
  data4h: any[]
  data1d: any[]
  data1w: any[]
  rsi5m: number
  rsi15m: number
  rsi30m: number
  rsi1h: number
  rsi4h: number
  rsi1d: number
  rsi1w: number
  isRedCandle5m: boolean
  isStopCandle5m: boolean
  isPowerCandle5m: boolean
  isBiggerThanPrevious5m: boolean
  isRedCandle15m: boolean
  isStopCandle15m: boolean
  isPowerCandle15m: boolean
  isBiggerThanPrevious15m: boolean
  isRedCandle30m: boolean
  isStopCandle30m: boolean
  isPowerCandle30m: boolean
  isBiggerThanPrevious30m: boolean
  isRedCandle1h: boolean
  isStopCandle1h: boolean
  isPowerCandle1h: boolean
  isBiggerThanPrevious1h: boolean
  isRedCandle4h: boolean
  isStopCandle4h: boolean
  isPowerCandle4h: boolean
  isBiggerThanPrevious4h: boolean
  isRedCandle1d: boolean
  isStopCandle1d: boolean
  isPowerCandle1d: boolean
  isBiggerThanPrevious1d: boolean
  isRedCandle1w: boolean
  isStopCandle1w: boolean
  isPowerCandle1w: boolean
  isBiggerThanPrevious1w: boolean
}

let socket: Socket

export const Symbols = () => {
  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [searchFilter, setSearchFilter] = useState('')
  const [pushFilter, setPushFilter] = useState(true)
  const [overBoughtFilter, setOverBoughtFilter] = useState(true)
  const [overSoldFilter, setOverSoldFilter] = useState(true)

  const [btcData0, setBtcData0] = useState<any[]>([])
  const [btcData1, setBtcData1] = useState<any[]>([])
  const [btcData2, setBtcData2] = useState<any[]>([])
  const [chartData1, setChartData1] = useState<any[]>([])
  const [chartData2, setChartData2] = useState<any[]>([])

  const btcCoin0 = useRef('BTCUSDT:5m')
  const btcCoin1 = useRef('BTCUSDT:15m')
  const btcCoin2 = useRef('BTCUSDT:30m')
  const selectedCoin1 = useRef('')
  const selectedCoin2 = useRef('')

  useEffect(() => {
    socketInitializer()

    return () => {
      socket.emit('bye')
      socket.disconnect()
    }
  }, [])

  useLayoutEffect(() => {
    const chartUpdater = (
      selectedCoin: MutableRefObject<string>,
      setter: (value: SetStateAction<any[]>) => void
    ) => {
      if (selectedCoin.current) {
        const parts = selectedCoin.current.split(':')
        const symbol = parts[0]
        const interval = parts[1]
        console.log('updating chart ', parts)
        const data = symbols.find(coin => coin.symbol === symbol)
        if (data) {
          switch (interval) {
            case '5m':
              setter(data.data5m)
              break
            case '15m':
              setter(data.data15m)
              break
            case '30m':
              setter(data.data30m)
              break
            case '1h':
              setter(data.data1h)
              break
            case '4h':
              setter(data.data4h)
              break
            case '1d':
              setter(data.data1d)
              break
            case '1w':
              setter(data.data1w)
              break
            default:
              console.log('wrong inteval passed', interval)
          }
        } else {
          console.log('no data with that symbol', selectedCoin.current)
        }
      }
    }

    // update chart data
    chartUpdater(btcCoin0, setBtcData0) //btcusdt
    chartUpdater(btcCoin1, setBtcData1) //btcusdt
    chartUpdater(btcCoin2, setBtcData2) //btcusdt
    chartUpdater(selectedCoin1, setChartData1)
    chartUpdater(selectedCoin2, setChartData2)
  }, [symbols])

  async function socketInitializer() {
    await fetch('/api/socket')

    socket = io({ path: '/api/socket_io' })

    socket.on('connect', () => {
      console.log('connected')
    })

    socket.on('data', (data: Symbol[]) => {
      console.log('received data0', selectedCoin1.current, data)
      setSymbols(data)
    })
  }

  const handlePushFilter = (e: ChangeEvent<HTMLInputElement>) => {
    setPushFilter(e.target.checked)
  }

  const handleOverBoughtFilter = (e: ChangeEvent<HTMLInputElement>) => {
    setOverBoughtFilter(e.target.checked)
  }

  const handleOverSoldFilter = (e: ChangeEvent<HTMLInputElement>) => {
    setOverSoldFilter(e.target.checked)
  }

  const handleViewChart0 = (coin: string) => {
    console.log('select ', coin)
    btcCoin0.current = coin
  }
  const handleViewChart1 = (coin: string) => {
    console.log('select ', coin)
    btcCoin1.current = coin
  }
  const handleViewChart2 = (coin: string) => {
    console.log('select ', coin)
    btcCoin2.current = coin
  }

  const handleChangeInterval1 = (coin: string, interval: string) => {
    console.log('select ', interval)
    if (!selectedCoin1.current) {
      selectedCoin1.current = 'BTCUSDT:5m'
    }
    const parts = selectedCoin1.current.split(':')
    const symbol = coin || parts[0]

    selectedCoin1.current = symbol + ':' + interval
  }

  const handleChangeInterval2 = (coin: string, interval: string) => {
    console.log('select2 ', interval)
    if (!selectedCoin2.current) {
      selectedCoin2.current = 'BTCUSDT:5m'
    }
    const parts = selectedCoin2.current.split(':')
    const symbol = coin || parts[0]

    selectedCoin2.current = symbol + ':' + interval
  }

  const handleSearchFilter = (e: ChangeEvent<HTMLInputElement>) => {
    console.log('search', e.target.value)
    setSearchFilter(e.target.value)
  }

  const renderIcons = (coin: any, interval: string) => {
    let status = []
    if (coin[`isStopCandle${interval}`]) {
      status.push(
        <Image
          alt='stop'
          key={`${coin.symbol}${interval}:stop`}
          src='/assets/stop.png'
          width={24}
          height={24}
        />
      )
    } //'Stop'
    if (coin[`isPowerCandle${interval}`]) {
      // entrando volumen
      if (coin[`isBiggerThanPrevious${interval}`]) {
        status.push(
          <span
            style={{
              padding: 0,
              transform: coin[`isRedCandle${interval}`] ? 'rotate(90deg)' : 'none'
            }}
          >
            <Image
              alt='superpush'
              key={`${coin.symbol}${interval}:superpush`}
              src='/assets/superpush.png'
              width={24}
              height={24}
            />
          </span>
        )
      }
      //' SuperPush' // vol inc, bigger candle
      else {
        status.push(
          <span
            style={{
              padding: 0,
              transform: coin[`isRedCandle${interval}`] ? 'rotate(90deg)' : 'none'
            }}
          >
            <Image
              alt='push'
              key={`${coin.symbol}${interval}:push`}
              src='/assets/push.png'
              width={24}
              height={24}
            />
          </span>
        )
      }
    }

    // if (coin[`isBiggerThanPrevious${interval}`]) status += ' Big'
    return status
  }

  let filterSymbols = symbols.filter(s => s.symbol !== 'BTCUSDT')

  const BTC = symbols.filter(s => s.symbol === 'BTCUSDT')

  if (searchFilter) {
    filterSymbols = filterSymbols.filter(s => s.symbol.includes(searchFilter.toUpperCase()))
  }

  if (pushFilter) {
    filterSymbols = filterSymbols.filter(
      symbol =>
        symbol.isPowerCandle5m ||
        symbol.isPowerCandle15m ||
        symbol.isPowerCandle30m ||
        symbol.isPowerCandle1h ||
        symbol.isPowerCandle4h ||
        symbol.isPowerCandle1d ||
        symbol.isPowerCandle1w
    )
  }

  const overBought = 70
  const overSold = 30
  if (overBoughtFilter && overSoldFilter) {
    filterSymbols = filterSymbols.filter(s => {
      return (
        s.rsi5m > overBought ||
        s.rsi15m > overBought ||
        s.rsi30m > overBought ||
        s.rsi1h > overBought ||
        s.rsi4h > overBought ||
        s.rsi1d > overBought ||
        s.rsi1w > overBought ||
        s.rsi5m < overSold ||
        s.rsi15m < overSold ||
        s.rsi30m < overSold ||
        s.rsi1h < overSold ||
        s.rsi4h < overSold ||
        s.rsi1d < overSold ||
        s.rsi1w < overSold
      )
    })
  } else if (overBoughtFilter) {
    filterSymbols = filterSymbols.filter(s => {
      return (
        s.rsi5m > overBought ||
        s.rsi15m > overBought ||
        s.rsi30m > overBought ||
        s.rsi1h > overBought ||
        s.rsi4h > overBought ||
        s.rsi1d > overBought ||
        s.rsi1w > overBought
      )
    })
  } else if (overSoldFilter) {
    filterSymbols = filterSymbols.filter(s => {
      return (
        s.rsi5m < overSold ||
        s.rsi15m < overSold ||
        s.rsi30m < overSold ||
        s.rsi1h < overSold ||
        s.rsi4h < overSold ||
        s.rsi1d < overSold ||
        s.rsi1w < overSold
      )
    })
  }

  return (
    <div className='p-3 flex flex-col min-w-[1200px]'>
      <div className='charts flex flex-col'>
        <div className='chart-group flex'>
          <div className='chart m-2 flex-1' id='chart-1'>
            <div className='chart-header flex'>
              <h3>{btcCoin0.current}</h3>
              <div className='btc-btns mx-5 '>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart0(`BTCUSDT:5m`)}
                >
                  5m
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart0(`BTCUSDT:15m`)}
                >
                  15m
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart0(`BTCUSDT:30m`)}
                >
                  30m
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart0(`BTCUSDT:1h`)}
                >
                  1h
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart0(`BTCUSDT:4h`)}
                >
                  4h
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart0(`BTCUSDT:1d`)}
                >
                  1d
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart0(`BTCUSDT:1w`)}
                >
                  1w
                </span>
              </div>
            </div>
            <Chart data={btcData0} ema20 sma50 sma200 height={200} />
          </div>

          <div className='chart m-2 flex-1' id='chart-1'>
            <div className='chart-header flex'>
              <h3>{btcCoin1.current}</h3>
              <div className='btc-btns mx-5 '>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart1(`BTCUSDT:5m`)}
                >
                  5m
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart1(`BTCUSDT:15m`)}
                >
                  15m
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart1(`BTCUSDT:30m`)}
                >
                  30m
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart1(`BTCUSDT:1h`)}
                >
                  1h
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart1(`BTCUSDT:4h`)}
                >
                  4h
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart1(`BTCUSDT:1d`)}
                >
                  1d
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart1(`BTCUSDT:1w`)}
                >
                  1w
                </span>
              </div>
            </div>
            <Chart data={btcData1} />
          </div>

          <div className='chart m-2 flex-1' id='chart-1'>
            <div className='chart-header flex'>
              <h3>{btcCoin2.current}</h3>
              <div className='btc-btns mx-5 '>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart2(`BTCUSDT:5m`)}
                >
                  5m
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart2(`BTCUSDT:15m`)}
                >
                  15m
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart2(`BTCUSDT:30m`)}
                >
                  30m
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart2(`BTCUSDT:1h`)}
                >
                  1h
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart2(`BTCUSDT:4h`)}
                >
                  4h
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart2(`BTCUSDT:1d`)}
                >
                  1d
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleViewChart2(`BTCUSDT:1w`)}
                >
                  1w
                </span>
              </div>
            </div>
            <Chart data={btcData2} />
          </div>
        </div>
        <div className='chart-group flex items-start'>
          <div className='chart m-2 flex-1' id='chart-1'>
            <div className='chart-header flex'>
              {selectedCoin1.current && (
                <a
                  href={`https://www.tradingview.com/chart?symbol=BINANCE:${
                    selectedCoin1.current.split(':')[0]
                  }`}
                  target='_blank'
                >
                  {selectedCoin1.current}
                </a>
              )}
              <div className='btc-btns mx-5 '>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleChangeInterval1('', `5m`)}
                >
                  5m
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleChangeInterval1('', `15m`)}
                >
                  15m
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleChangeInterval1('', `30m`)}
                >
                  30m
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleChangeInterval1('', `1h`)}
                >
                  1h
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleChangeInterval1('', `4h`)}
                >
                  4h
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleChangeInterval1('', `1d`)}
                >
                  1d
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleChangeInterval1('', `1w`)}
                >
                  1w
                </span>
              </div>
            </div>
            <Chart data={chartData1} />
          </div>

          <div className='chart m-2 flex-1' id='chart-2'>
            <div className='chart-header flex'>
              {selectedCoin2.current && (
                <a
                  href={`https://www.tradingview.com/chart?symbol=BINANCE:${
                    selectedCoin2.current.split(':')[0]
                  }`}
                  target='_blank'
                >
                  {selectedCoin2.current}
                </a>
              )}
              <div className='btc-btns mx-5 '>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleChangeInterval2('', `5m`)}
                >
                  5m
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleChangeInterval2('', `15m`)}
                >
                  15m
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleChangeInterval2('', `30m`)}
                >
                  30m
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleChangeInterval2('', `1h`)}
                >
                  1h
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleChangeInterval2('', `4h`)}
                >
                  4h
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleChangeInterval2('', `1d`)}
                >
                  1d
                </span>
                <span
                  className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                  onClick={() => handleChangeInterval2('', `1w`)}
                >
                  1w
                </span>
              </div>
            </div>
            <Chart data={chartData2} />
          </div>
        </div>
      </div>
      <div className='filter flex justify-between items-center'>
        <div className='search my-2'>
          <label
            className='mr-2 text-sm font-medium text-gray-900 dark:text-white'
            htmlFor='filter-search'
          >
            Search symbol
          </label>
          <input
            type='text'
            id='filter-search'
            className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
            value={searchFilter}
            onChange={handleSearchFilter}
          />
        </div>
        <div className='flex'>
          <button
            className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded'
            onClick={() => socket.emit('get-data')}
          >
            Refresh
          </button>
          <div className='group mx-5'>
            <label htmlFor='filter-push'>Show push/superpush only</label>
            <input
              type='checkbox'
              id='filter-push'
              checked={pushFilter}
              onChange={handlePushFilter}
            />
          </div>
          <div className='group mx-5'>
            <label htmlFor='filter-overbought'>Show overbought only</label>
            <input
              type='checkbox'
              id='filter-overbought'
              checked={overBoughtFilter}
              onChange={handleOverBoughtFilter}
            />
          </div>
          <div className='group mx-5'>
            <label htmlFor='filter-oversold'>Show oversold only</label>
            <input
              type='checkbox'
              id='filter-oversold'
              checked={overSoldFilter}
              onChange={handleOverSoldFilter}
            />
          </div>
        </div>
      </div>

      <table className='table-auto min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-collapse border border-slate-500'>
        <thead>
          <tr>
            <th colSpan={2}>Symbol</th>

            <th
              colSpan={7}
              className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
            >
              RSI
            </th>
            <th
              colSpan={7}
              className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
            >
              candle status
            </th>
            <th></th>
          </tr>
          <tr>
            <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              Name
            </th>
            <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              Curr.Price
            </th>
            <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              5min
            </th>
            <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              15min
            </th>
            <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              30min
            </th>
            <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              1Hra
            </th>
            <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              4Hra
            </th>
            <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              Dia
            </th>
            <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              1w
            </th>
            <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              5m
            </th>
            <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              15m
            </th>
            <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              30m
            </th>
            <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              1h
            </th>
            <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              4h
            </th>
            <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              1d
            </th>
            <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              1w
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {BTC.length > 0 && (
            <tr key={BTC[0].symbol}>
              <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                {/* <a
                    href={`https://www.tradingview.com/symbols/${BTC[0].symbol}/?exchange=BINANCE`}
                    target='_blank'
                  >
                    {BTC[0].symbol}
                  </a> */}
                <a
                  href={`https://www.tradingview.com/chart?symbol=BINANCE:${BTC[0].symbol}`}
                  target='_blank'
                >
                  {BTC[0].symbol}
                </a>
              </td>
              <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                {BTC[0].price}
              </td>
              <td
                className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                style={{ backgroundColor: getBgColor(BTC[0].rsi5m) }}
              >
                {BTC[0].rsi5m}
              </td>
              <td
                className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                style={{ backgroundColor: getBgColor(BTC[0].rsi15m) }}
              >
                {BTC[0].rsi15m}
              </td>
              <td
                className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                style={{ backgroundColor: getBgColor(BTC[0].rsi30m) }}
              >
                {BTC[0].rsi30m}
              </td>
              <td
                className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                style={{ backgroundColor: getBgColor(BTC[0].rsi1h) }}
              >
                {BTC[0].rsi1h}
              </td>
              <td
                className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                style={{ backgroundColor: getBgColor(BTC[0].rsi4h) }}
              >
                {BTC[0].rsi4h}
              </td>
              <td
                className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                style={{ backgroundColor: getBgColor(BTC[0].rsi1d) }}
              >
                {BTC[0].rsi1d}
              </td>
              <td
                className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                style={{ backgroundColor: getBgColor(BTC[0].rsi1w) }}
              >
                {BTC[0].rsi1w}
              </td>

              <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                <div className='flex'>
                  <span
                    style={{
                      width: 8,
                      height: 16,
                      backgroundColor: BTC[0].isRedCandle5m ? 'red' : 'green'
                    }}
                  ></span>
                  {renderIcons(BTC[0], '5m')}
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1(BTC[0].symbol, `5m`)}
                  >
                    1
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2(BTC[0].symbol, `5m`)}
                  >
                    2
                  </span>
                </div>
              </td>
              <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                <div className='flex'>
                  <span
                    style={{
                      width: 8,
                      height: 16,
                      backgroundColor: BTC[0].isRedCandle15m ? 'red' : 'green'
                    }}
                  ></span>
                  {renderIcons(BTC[0], '15m')}
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1(BTC[0].symbol, `15m`)}
                  >
                    1
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2(BTC[0].symbol, `15m`)}
                  >
                    2
                  </span>
                </div>
              </td>
              <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                <div className='flex'>
                  <span
                    style={{
                      width: 8,
                      height: 16,
                      backgroundColor: BTC[0].isRedCandle30m ? 'red' : 'green'
                    }}
                  ></span>
                  {renderIcons(BTC[0], '30m')}
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1(BTC[0].symbol, `30m`)}
                  >
                    1
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2(BTC[0].symbol, `30m`)}
                  >
                    2
                  </span>
                </div>
              </td>
              <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                <div className='flex'>
                  <span
                    style={{
                      width: 8,
                      height: 16,
                      backgroundColor: BTC[0].isRedCandle1h ? 'red' : 'green'
                    }}
                  ></span>
                  {renderIcons(BTC[0], '1h')}
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1(BTC[0].symbol, `1h`)}
                  >
                    1
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2(BTC[0].symbol, `1h`)}
                  >
                    2
                  </span>
                </div>
              </td>
              <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                <div className='flex'>
                  <span
                    style={{
                      width: 8,
                      height: 16,
                      backgroundColor: BTC[0].isRedCandle4h ? 'red' : 'green'
                    }}
                  ></span>
                  {renderIcons(BTC[0], '4h')}
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1(BTC[0].symbol, `4h`)}
                  >
                    1
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2(BTC[0].symbol, `4h`)}
                  >
                    2
                  </span>
                </div>
              </td>
              <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                <div className='flex'>
                  <span
                    style={{
                      width: 8,
                      height: 16,
                      backgroundColor: BTC[0].isRedCandle1d ? 'red' : 'green'
                    }}
                  ></span>
                  {renderIcons(BTC[0], '1d')}
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1(BTC[0].symbol, `1d`)}
                  >
                    1
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2(BTC[0].symbol, `1d`)}
                  >
                    2
                  </span>
                </div>
              </td>
              <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                <div className='flex'>
                  <span
                    style={{
                      width: 8,
                      height: 16,
                      backgroundColor: BTC[0].isRedCandle1w ? 'red' : 'green'
                    }}
                  ></span>
                  {renderIcons(BTC[0], '1w')}
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1(BTC[0].symbol, `1w`)}
                  >
                    1
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2(BTC[0].symbol, `1w`)}
                  >
                    2
                  </span>
                </div>
              </td>
              <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'></td>
            </tr>
          )}

          {filterSymbols.map(coin => {
            return (
              <tr key={coin.symbol}>
                <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                  {/* <a
                    href={`https://www.tradingview.com/symbols/${coin.symbol}/?exchange=BINANCE`}
                    target='_blank'
                  >
                    {coin.symbol}
                  </a> */}
                  <a
                    href={`https://www.tradingview.com/chart?symbol=BINANCE:${coin.symbol}`}
                    target='_blank'
                  >
                    {coin.symbol}
                  </a>
                </td>
                <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                  {coin.price}
                </td>
                <td
                  className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{ backgroundColor: getBgColor(coin.rsi5m) }}
                >
                  {coin.rsi5m}
                </td>
                <td
                  className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{ backgroundColor: getBgColor(coin.rsi15m) }}
                >
                  {coin.rsi15m}
                </td>
                <td
                  className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{ backgroundColor: getBgColor(coin.rsi30m) }}
                >
                  {coin.rsi30m}
                </td>
                <td
                  className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{ backgroundColor: getBgColor(coin.rsi1h) }}
                >
                  {coin.rsi1h}
                </td>
                <td
                  className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{ backgroundColor: getBgColor(coin.rsi4h) }}
                >
                  {coin.rsi4h}
                </td>
                <td
                  className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{ backgroundColor: getBgColor(coin.rsi1d) }}
                >
                  {coin.rsi1d}
                </td>
                <td
                  className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{ backgroundColor: getBgColor(coin.rsi1w) }}
                >
                  {coin.rsi1w}
                </td>

                <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                  <div className='flex'>
                    <span
                      style={{
                        width: 8,
                        height: 16,
                        backgroundColor: coin.isRedCandle5m ? 'red' : 'green'
                      }}
                    ></span>
                    {renderIcons(coin, '5m')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval1(coin.symbol, `5m`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval2(coin.symbol, `5m`)}
                    >
                      2
                    </span>
                  </div>
                </td>
                <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                  <div className='flex'>
                    <span
                      style={{
                        width: 8,
                        height: 16,
                        backgroundColor: coin.isRedCandle15m ? 'red' : 'green'
                      }}
                    ></span>
                    {renderIcons(coin, '15m')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval1(coin.symbol, `15m`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval2(coin.symbol, `15m`)}
                    >
                      2
                    </span>
                  </div>
                </td>
                <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                  <div className='flex'>
                    <span
                      style={{
                        width: 8,
                        height: 16,
                        backgroundColor: coin.isRedCandle30m ? 'red' : 'green'
                      }}
                    ></span>
                    {renderIcons(coin, '30m')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval1(coin.symbol, `30m`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval2(coin.symbol, `30m`)}
                    >
                      2
                    </span>
                  </div>
                </td>
                <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                  <div className='flex'>
                    <span
                      style={{
                        width: 8,
                        height: 16,
                        backgroundColor: coin.isRedCandle1h ? 'red' : 'green'
                      }}
                    ></span>
                    {renderIcons(coin, '1h')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval1(coin.symbol, `1h`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval2(coin.symbol, `1h`)}
                    >
                      2
                    </span>
                  </div>
                </td>
                <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                  <div className='flex'>
                    <span
                      style={{
                        width: 8,
                        height: 16,
                        backgroundColor: coin.isRedCandle4h ? 'red' : 'green'
                      }}
                    ></span>
                    {renderIcons(coin, '4h')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval1(coin.symbol, `4h`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval2(coin.symbol, `4h`)}
                    >
                      2
                    </span>
                  </div>
                </td>
                <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                  <div className='flex'>
                    <span
                      style={{
                        width: 8,
                        height: 16,
                        backgroundColor: coin.isRedCandle1d ? 'red' : 'green'
                      }}
                    ></span>
                    {renderIcons(coin, '1d')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval1(coin.symbol, `1d`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval2(coin.symbol, `1d`)}
                    >
                      2
                    </span>
                  </div>
                </td>
                <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                  <div className='flex'>
                    <span
                      style={{
                        width: 8,
                        height: 16,
                        backgroundColor: coin.isRedCandle1w ? 'red' : 'green'
                      }}
                    ></span>
                    {renderIcons(coin, '1w')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval1(coin.symbol, `1w`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval2(coin.symbol, `1w`)}
                    >
                      2
                    </span>
                  </div>
                </td>
                <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'></td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={17}>
              <Image className='inline' alt='push' src='/assets/push.png' width={24} height={24} />
              <span>
                PUSH (isPowerCandle) : Cuando entra nueva vela de otro color con mucho volumen
              </span>
            </td>
          </tr>
          <tr>
            <td colSpan={17}>
              <Image
                className='inline'
                alt='superpush'
                src='/assets/superpush.png'
                width={24}
                height={24}
              />
              <span>
                SuperPUSH (isPowerCandle+big) : igual q PUSH pero la vela es mas grande(elefante)
              </span>
            </td>
          </tr>
          <tr>
            <td colSpan={17}>
              <Image className='inline' alt='stop' src='/assets/stop.png' width={24} height={24} />
              <span>
                STOP: Cuando la vela anterior tiene mucho volumen, y aparece nueva vela con otro
                color
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

const isOverBought = (value: number) => {
  return value > 70
}
const isOverSold = (value: number) => {
  return value < 30
}
const getBgColor = (value: number) => {
  if (isOverBought(value)) return 'green'
  else if (isOverSold(value)) return 'red'
  else return 'transparent'
}

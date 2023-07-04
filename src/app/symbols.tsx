'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
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
  const [pushFilter, setPushFilter] = useState(true)
  const [chartData0, setChartData0] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [chartData2, setChartData2] = useState<any[]>([])
  // const [selectedCoin, setSelectedCoin] = useState('')
  const selectedCoin0 = useRef('BTCUSDT:5m')
  const selectedCoin = useRef('')
  const selectedCoin2 = useRef('')

  useEffect(() => {
    socketInitializer()

    return () => {
      socket.emit('bye')
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    // update chart data
    if (selectedCoin0.current) {
      const parts = selectedCoin0.current.split(':')
      const symbol = parts[0]
      const interval = parts[1]
      console.log('updating chart2 ', parts)
      const data = symbols.find(coin => coin.symbol === symbol)
      if (data) {
        switch (interval) {
          case '5m':
            setChartData0(data.data5m)
            break
          case '15m':
            setChartData0(data.data15m)
            break
          case '30m':
            setChartData0(data.data30m)
            break
          case '1h':
            setChartData0(data.data1h)
            break
          case '4h':
            setChartData0(data.data4h)
            break
          case '1d':
            setChartData0(data.data1d)
            break
          case '1w':
            setChartData0(data.data1w)
            break
          default:
            console.log('wrong inteval passed', interval)
        }
      } else {
        console.log('no data with that symbol', selectedCoin.current)
      }
    }

    if (selectedCoin.current) {
      const parts = selectedCoin.current.split(':')
      const symbol = parts[0]
      const interval = parts[1]
      console.log('updating chart ', parts)
      const data = symbols.find(coin => coin.symbol === symbol)
      if (data) {
        switch (interval) {
          case '5m':
            setChartData(data.data5m)
            break
          case '15m':
            setChartData(data.data15m)
            break
          case '30m':
            setChartData(data.data30m)
            break
          case '1h':
            setChartData(data.data1h)
            break
          case '4h':
            setChartData(data.data4h)
            break
          case '1d':
            setChartData(data.data1d)
            break
          case '1w':
            setChartData(data.data1w)
            break
          default:
            console.log('wrong inteval passed', interval)
        }
      } else {
        console.log('no data with that symbol', selectedCoin.current)
      }
    }

    if (selectedCoin2.current) {
      const parts = selectedCoin2.current.split(':')
      const symbol = parts[0]
      const interval = parts[1]
      console.log('updating chart2 ', parts)
      const data = symbols.find(coin => coin.symbol === symbol)
      if (data) {
        switch (interval) {
          case '5m':
            setChartData2(data.data5m)
            break
          case '15m':
            setChartData2(data.data15m)
            break
          case '30m':
            setChartData2(data.data30m)
            break
          case '1h':
            setChartData2(data.data1h)
            break
          case '4h':
            setChartData2(data.data4h)
            break
          case '1d':
            setChartData2(data.data1d)
            break
          case '1w':
            setChartData2(data.data1w)
            break
          default:
            console.log('wrong inteval passed', interval)
        }
      } else {
        console.log('no data with that symbol', selectedCoin.current)
      }
    }
  }, [symbols])

  async function socketInitializer() {
    await fetch('/api/socket')

    socket = io({ path: '/api/socket_io' })

    socket.on('connect', () => {
      console.log('connected')
    })

    socket.on('data', (data: Symbol[]) => {
      console.log('received data0', selectedCoin.current, data)
      setSymbols(data)
    })
  }

  const handlePushFilter = (e: ChangeEvent<HTMLInputElement>) => {
    setPushFilter(e.target.checked)
  }

  const handleViewChart0 = (coin: string) => {
    // setChartData(data)
    console.log('select ', coin)
    // setSelectedCoin(coin)
    selectedCoin0.current = coin
  }

  const handleViewChart = (coin: string) => {
    // setChartData(data)
    console.log('select ', coin)
    // setSelectedCoin(coin)
    selectedCoin.current = coin
  }

  const handleViewChart2 = (coin: string) => {
    // setChartData(data)
    console.log('select2 ', coin)
    // setSelectedCoin(coin)
    selectedCoin2.current = coin
  }

  const renderIcons = (coin: any, interval: string) => {
    let status = []
    if (coin[`isStopCandle${interval}`])
      status.push(
        <Image
          alt='stop'
          key={`${coin.symbol}${interval}:stop`}
          src='/assets/stop.png'
          width={24}
          height={24}
        />
      ) //'Stop'
    if (coin[`isPowerCandle${interval}`]) {
      // entrando volumen
      if (coin[`isBiggerThanPrevious${interval}`])
        status.push(
          <Image
            alt='superpush'
            key={`${coin.symbol}${interval}:superpush`}
            src='/assets/superpush.png'
            width={24}
            height={24}
          />
        )
      //' SuperPush' // vol inc, bigger candle
      else
        status.push(
          <Image
            alt='push'
            key={`${coin.symbol}${interval}:push`}
            src='/assets/push.png'
            width={24}
            height={24}
          />
        ) //' Push'
    }
    // if (coin[`isBiggerThanPrevious${interval}`]) status += ' Big'
    return status
  }

  let filterSymbols = symbols
  if (pushFilter) {
    filterSymbols = symbols.filter(
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
  return (
    <div className='p-3 flex flex-col min-w-[1200px]'>
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
      </div>
      <div className='charts flex'>
        <div className='chart m-2 flex-1' id='chart-1'>
          <div className='chart-header flex'>
            <h3>{selectedCoin0.current}</h3>
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
          <Chart data={chartData0} />
        </div>
        <div className='chart m-2 flex-1' id='chart-1'>
          <div className='chart-header flex'>
            <h3>{selectedCoin.current}</h3>
            <div className='btc-btns mx-5 '>
              <span
                className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                onClick={() => handleViewChart(`BTCUSDT:5m`)}
              >
                5m
              </span>
              <span
                className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                onClick={() => handleViewChart(`BTCUSDT:15m`)}
              >
                15m
              </span>
              <span
                className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                onClick={() => handleViewChart(`BTCUSDT:30m`)}
              >
                30m
              </span>
              <span
                className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                onClick={() => handleViewChart(`BTCUSDT:1h`)}
              >
                1h
              </span>
              <span
                className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                onClick={() => handleViewChart(`BTCUSDT:4h`)}
              >
                4h
              </span>
              <span
                className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                onClick={() => handleViewChart(`BTCUSDT:1d`)}
              >
                1d
              </span>
              <span
                className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                onClick={() => handleViewChart(`BTCUSDT:1w`)}
              >
                1w
              </span>
            </div>
          </div>
          <Chart data={chartData} />
        </div>
        <div className='chart m-2 flex-1' id='chart-2'>
          <div className='chart-header flex'>
            <h3>{selectedCoin2.current}</h3>
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
          <Chart data={chartData2} />
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
                        backgroundColor: coin.isRedCandle1h ? 'red' : 'green'
                      }}
                    ></span>
                    {renderIcons(coin, '5m')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleViewChart(`${coin.symbol}:5m`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleViewChart2(`${coin.symbol}:5m`)}
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
                    {renderIcons(coin, '15m')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleViewChart(`${coin.symbol}:15m`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleViewChart2(`${coin.symbol}:15m`)}
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
                    {renderIcons(coin, '30m')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleViewChart(`${coin.symbol}:30m`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleViewChart2(`${coin.symbol}:30m`)}
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
                      onClick={() => handleViewChart(`${coin.symbol}:1h`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleViewChart2(`${coin.symbol}:1h`)}
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
                    {renderIcons(coin, '4h')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleViewChart(`${coin.symbol}:4h`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleViewChart2(`${coin.symbol}:4h`)}
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
                    {renderIcons(coin, '1d')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleViewChart(`${coin.symbol}:1d`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleViewChart2(`${coin.symbol}:1d`)}
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
                    {renderIcons(coin, '1w')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleViewChart(`${coin.symbol}:1w`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleViewChart2(`${coin.symbol}:1w`)}
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
              PUSH (isPowerCandle) : Cuando entra nueva vela de otro color con mucho volumen
            </td>
          </tr>
          <tr>
            <td colSpan={17}>
              SuperPUSH (isPowerCandle+big) : igual q PUSH pero la vela es mas grande(elefante)
            </td>
          </tr>
          <tr>
            <td colSpan={17}>
              STOP: Cuando la vela anterior tiene mucho volumen, y aparece nueva vela con otro color
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

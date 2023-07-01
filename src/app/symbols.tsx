'use client'

import { useEffect, useState } from 'react'
import io, { Socket } from 'socket.io-client'

type Symbol = {
  symbol: string
  minNotional: string
  price: number
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

  useEffect(() => {
    socketInitializer()

    return () => {
      socket.emit('bye')
      socket.disconnect()
    }
  }, [])

  async function socketInitializer() {
    await fetch('/api/socket')

    socket = io({ path: '/api/socket_io' })

    socket.on('connect', () => {
      console.log('connected')
    })

    socket.on('data', (data: Symbol[]) => {
      console.log('received data0', data)
      setSymbols(data)
    })
  }

  return (
    <table className='table-auto min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-collapse border border-slate-500'>
      <thead>
        <tr>
          <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
            Symbol
          </th>
          <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
            Curr.Price
          </th>
          <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
            RSI 5min
          </th>
          <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
            RSI 15min
          </th>
          <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
            RSI 30min
          </th>
          <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
            RSI 1Hra
          </th>
          <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
            RSI 4Hra
          </th>
          <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
            RSI Dia
          </th>
          <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
            RSI Sem
          </th>
          <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
            5m candle
          </th>
          <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
            15m candle
          </th>
          <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
            30m candle
          </th>
          <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
            1h candle
          </th>
          <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
            4h candle
          </th>
          <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
            1d candle
          </th>
          <th className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
            1w candle
          </th>
          <th>
            <button
              className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded'
              onClick={() => socket.emit('get-data')}
            >
              Refresh
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        {symbols.map(coin => {
          let status5m = ''
          if (coin.isStopCandle5m) status5m = 'Stop'
          if (coin.isPowerCandle5m) {
            // entrando volumen
            if (coin.isBiggerThanPrevious5m) status5m += ' SuperPush' // vol inc, bigger candle
            else status5m += ' Push'
          }
          if (coin.isBiggerThanPrevious5m) status5m += ' Big'

          let status15m = ''
          if (coin.isStopCandle15m) status15m = 'Stop'
          if (coin.isPowerCandle15m) {
            if (coin.isBiggerThanPrevious15m) status15m += ' SuperPush'
            else status15m += ' Push'
          }
          if (coin.isBiggerThanPrevious15m) status15m += ' Big'

          let status30m = ''
          if (coin.isStopCandle30m) status30m = 'Stop'
          if (coin.isPowerCandle30m) {
            if (coin.isBiggerThanPrevious30m) status30m += ' SuperPush'
            else status30m += ' Push'
          }
          if (coin.isBiggerThanPrevious30m) status30m += ' Big'

          let status1h = ''
          if (coin.isStopCandle1h) status1h = 'Stop'
          if (coin.isPowerCandle1h) {
            if (coin.isBiggerThanPrevious1h) status1h += ' SuperPush'
            else status1h += ' Push'
          }
          if (coin.isBiggerThanPrevious1h) status1h += ' Big'

          let status4h = ''
          if (coin.isStopCandle4h) status4h = 'Stop'
          if (coin.isPowerCandle4h) {
            if (coin.isBiggerThanPrevious4h) status4h += ' SuperPush'
            else status4h += ' Push'
          }
          if (coin.isBiggerThanPrevious4h) status4h += ' Big'

          let status1d = ''
          if (coin.isStopCandle1d) status1d = 'Stop'
          if (coin.isPowerCandle1d) {
            if (coin.isBiggerThanPrevious1d) status1d += ' SuperPush'
            else status1d += ' Push'
          }
          if (coin.isBiggerThanPrevious1d) status1d += ' Big'

          let status1w = ''
          if (coin.isStopCandle1w) status1w = 'Stop'
          if (coin.isPowerCandle1w) {
            if (coin.isBiggerThanPrevious1w) status1w += ' SuperPush'
            else status1w += ' Push'
          }
          if (coin.isBiggerThanPrevious1w) status1w += ' Big'

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
                {status5m}
              </td>
              <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                {status15m}
              </td>
              <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                {status30m}
              </td>
              <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                {status1h}
              </td>
              <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                {status4h}
              </td>
              <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                {status1d}
              </td>
              <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                {status1w}
              </td>
              <td className='border border-slate-500 px-2 py-1 whitespace-nowrap text-sm font-medium'></td>
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={17}>
            (isPowerCandle) Entrando volumen? last candle high vol, and change color
          </td>
        </tr>
      </tfoot>
    </table>
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
